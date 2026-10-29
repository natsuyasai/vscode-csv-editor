/* global performance */
import { Buffer } from "buffer";
import * as fs from "fs";
import { TextDecoder } from "util";
import { getHeapStatistics } from "v8";

import {
  findInRow,
  findInRowWrapped,
  parseRecord,
  rowMatchesFilters,
  sortKey,
  sortOrder,
  SortKindDetector,
} from "../shared/large/query";

import { decoderLabel } from "./largeEncoding";
import type {
  QueryJobRequest,
  QueryJobResult,
  QueryJobStats,
  QuerySource,
  SearchJobRequest,
  SearchJobResult,
  ViewJobRequest,
  ViewJobResult,
} from "./queryProtocol";
import { RowIndex } from "./rowIndex";

/**
 * 検索・ソート・フィルタの全体走査（ワーカーの中で動かす。vscode には依存しない）。
 *
 * - ファイルは自分で開き、受け取ったオフセット表で行の範囲を引いて読む。ハンドルが連続する元の行は1回の範囲読みにまとめる
 * - 編集した元の行と追加行は、受け取った内容（スナップショット）で扱う
 * - 1回にまとめて読む行（batchRows）ごとにキャンセルを確かめ、進捗を送る
 * - ファイルを読み終えたら（キャンセル・失敗でも）閉じて onReleased を呼ぶ。その後の計算（ソート）はファイルを使わない
 *   （保存の前に、開いたままのファイルを閉じさせるため。Windows は開いたままだと置き換えられない）
 */

export interface ScanContext {
  isCancelled(): boolean;
  onProgress(ratio: number): void;
  /** ファイルを閉じた */
  onReleased(): void;
}

/** キャンセルで止めた */
export class QueryScanCancelledError extends Error {
  constructor() {
    super("取り消しました");
    this.name = "QueryScanCancelledError";
  }
}

const DEFAULT_BATCH_ROWS = 8192;
const DEFAULT_PROGRESS_INTERVAL_MS = 50;
/** 1回の範囲読みの最大バイト数（これを超える連続した行は分けて読む） */
const MAX_READ_BYTES = 8 * 1024 * 1024;
/** V8 が SlicedString を作る最短の長さ（これより短い部分文字列はコピーになる） */
const SLICED_STRING_MIN_LENGTH = 13;

/**
 * 長い部分文字列を、元の行の文字列を参照しない文字列にする（キーを500万個持つとき、行の文字列を残さないため）。
 * " " との連結（ConsString）を slice すると、連結を平らにした新しい文字列からの部分文字列になる
 */
const detach = (value: string): string =>
  value.length < SLICED_STRING_MIN_LENGTH ? value : (" " + value).slice(1);

class Progress {
  private last = -Infinity;
  constructor(
    private readonly context: ScanContext,
    private readonly intervalMs: number
  ) {}

  report(ratio: number): void {
    const now = performance.now();
    if (now - this.last >= this.intervalMs) {
      this.last = now;
      this.context.onProgress(Math.min(1, Math.max(0, ratio)));
    }
  }
}

/** ファイルの行を読むもの（ジョブごとに開いて閉じる） */
class SourceReader {
  private constructor(
    private readonly handle: fs.promises.FileHandle,
    private readonly index: RowIndex,
    private readonly decoder: TextDecoder
  ) {}

  static async open(source: QuerySource): Promise<SourceReader> {
    const index = RowIndex.fromOffsets(source.starts, source.summary);
    const decoder = new TextDecoder(decoderLabel(source.encoding), { ignoreBOM: true });
    const handle = await fs.promises.open(source.filePath, "r");
    return new SourceReader(handle, index, decoder);
  }

  get lineCount(): number {
    return this.index.rowCount;
  }

  /** ファイル上の行 [first, first + count) を読み、行ごとに visit する */
  async readRun(
    first: number,
    count: number,
    visit: (handle: number, row: string[]) => void
  ): Promise<void> {
    let start = first;
    const end = first + count;
    while (start < end) {
      const base = this.index.getRowRange(start).start;
      let stop = start + 1;
      while (stop < end && this.index.getRowRange(stop).end - base <= MAX_READ_BYTES) {
        stop++;
      }
      const last = this.index.getRowRange(stop - 1);
      const buffer = Buffer.allocUnsafe(last.end - base);
      await readFully(this.handle, buffer, base);
      for (let i = start; i < stop; i++) {
        const range = this.index.getRowRange(i);
        const text = this.decoder.decode(buffer.subarray(range.start - base, range.end - base));
        visit(i, parseRecord(text));
      }
      start = stop;
    }
  }

  close(): Promise<void> {
    return this.handle.close();
  }
}

async function readFully(
  handle: fs.promises.FileHandle,
  buffer: Buffer,
  position: number
): Promise<void> {
  let filled = 0;
  while (filled < buffer.length) {
    const { bytesRead } = await handle.read(
      buffer,
      filled,
      buffer.length - filled,
      position + filled
    );
    if (bytesRead === 0) {
      throw new Error("ファイルが行インデックスの作成後に短くなっています");
    }
    filled += bytesRead;
  }
}

interface Scanner {
  reader: SourceReader;
  edits: ReadonlyMap<number, readonly string[]>;
  batchRows: number;
  context: ScanContext;
}

/**
 * order の位置 [start, end)（step=1）または (end, start]（step=-1）を、その順に visit する。
 * visit が true を返したら止めて true を返す
 */
async function scanPositions(
  scanner: Scanner,
  order: Float64Array,
  start: number,
  end: number,
  step: 1 | -1,
  visit: (position: number, handle: number, row: readonly string[]) => boolean,
  onBatch: (visited: number) => void
): Promise<boolean> {
  const { reader, edits, batchRows, context } = scanner;
  let position = start;
  let visited = 0;
  const loaded = new Map<number, readonly string[]>();
  while (step === 1 ? position < end : position > end) {
    if (context.isCancelled()) {
      throw new QueryScanCancelledError();
    }
    const batch: number[] = [];
    while (batch.length < batchRows && (step === 1 ? position < end : position > end)) {
      batch.push(position);
      position += step;
    }
    // ファイルから読む行（編集していない元の行）を、ファイル上の行番号の昇順で連続する区間にまとめて読む
    const fileRows = batch
      .map((p) => order[p])
      .filter((h) => h > 0 && !edits.has(h))
      .sort((a, b) => a - b);
    loaded.clear();
    let i = 0;
    while (i < fileRows.length) {
      let j = i + 1;
      while (j < fileRows.length && fileRows[j] === fileRows[j - 1] + 1) {
        j++;
      }
      await reader.readRun(fileRows[i], j - i, (handle, row) => loaded.set(handle, row));
      i = j;
    }
    for (const p of batch) {
      const handle = order[p];
      const row = edits.get(handle) ?? loaded.get(handle) ?? [];
      if (visit(p, handle, row)) {
        return true;
      }
    }
    visited += batch.length;
    onBatch(visited);
  }
  return false;
}

/** ファイルを開いて run を走らせ、終わったら（キャンセル・失敗でも）閉じて onReleased を呼ぶ */
async function withReader<T>(
  request: QueryJobRequest,
  context: ScanContext,
  run: (scanner: Scanner) => Promise<T>
): Promise<T> {
  const reader = await SourceReader.open(request.source);
  try {
    return await run({
      reader,
      edits: new Map(request.rows.edits),
      batchRows: Math.max(1, request.tuning?.batchRows ?? DEFAULT_BATCH_ROWS),
      context,
    });
  } finally {
    await reader.close();
    context.onReleased();
  }
}

const heapUsed = () => getHeapStatistics().used_heap_size;

export async function runQueryJob(
  request: QueryJobRequest,
  context: ScanContext
): Promise<QueryJobResult> {
  return request.kind === "view" ? runViewJob(request, context) : runSearchJob(request, context);
}

/** 表示順を作る（フィルタ → ソート） */
async function runViewJob(request: ViewJobRequest, context: ScanContext): Promise<ViewJobResult> {
  const startedAt = performance.now();
  const progress = new Progress(
    context,
    request.tuning?.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS
  );
  const { order } = request.rows;
  const { filters, sort } = request;
  // 読む割合と、ソートする割合（ソートは進捗を送れないので、読み終えた時点で残りを割り当てる）
  const readShare = sort ? 0.8 : 1;
  const kept: number[] = [];
  const values: string[] = [];
  const detector = new SortKindDetector();
  // 上限を超えたら、キーを溜め込む前に止める（ワーカーのメモリを守るため）
  const limit = sort ? (request.maxSortRows ?? Infinity) : Infinity;
  const overLimit = (rows: number) =>
    new Error(
      `ソートできる行数の上限（${limit.toLocaleString()} 行）を超えています（${rows.toLocaleString()} 行以上）。フィルタで絞り込んでからソートしてください`
    );
  if (filters.length === 0 && order.length > limit) {
    throw overLimit(order.length);
  }
  await withReader(request, context, (scanner) =>
    scanPositions(
      scanner,
      order,
      0,
      order.length,
      1,
      (_position, handle, row) => {
        if (filters.length > 0 && !rowMatchesFilters(row, filters)) {
          return false;
        }
        kept.push(handle);
        if (kept.length > limit) {
          throw overLimit(kept.length);
        }
        if (sort) {
          const value = row[sort.column] ?? "";
          detector.observe(value);
          values.push(detach(value));
        }
        return false;
      },
      (visited) => {
        progress.report((visited / Math.max(1, order.length)) * readShare);
      }
    )
  );
  const readMs = performance.now() - startedAt;
  let peakHeapUsed = heapUsed();
  if (context.isCancelled()) {
    throw new QueryScanCancelledError();
  }
  if (!sort) {
    return {
      kind: "view",
      handles: Float64Array.from(kept),
      stats: { readMs, totalMs: performance.now() - startedAt, peakHeapUsed },
    };
  }
  const kind = detector.kind;
  for (let i = 0; i < values.length; i++) {
    values[i] = sortKey(values[i], kind);
  }
  const sorted = sortOrder(values, sort.direction);
  peakHeapUsed = Math.max(peakHeapUsed, heapUsed());
  const handles = new Float64Array(sorted.length);
  for (let i = 0; i < sorted.length; i++) {
    handles[i] = kept[sorted[i]];
  }
  const stats: QueryJobStats = { readMs, totalMs: performance.now() - startedAt, peakHeapUsed };
  return { kind: "view", handles, sortKind: kind, stats };
}

/** 正のハンドル（元の行）が昇順に並んでいるか（ソートしていない並び） */
function isFileOrdered(order: Float64Array): boolean {
  let last = 0;
  for (const handle of order) {
    if (handle > 0) {
      if (handle < last) {
        return false;
      }
      last = handle;
    }
  }
  return true;
}

async function runSearchJob(
  request: SearchJobRequest,
  context: ScanContext
): Promise<SearchJobResult> {
  const startedAt = performance.now();
  const progress = new Progress(
    context,
    request.tuning?.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS
  );
  const { order } = request.rows;
  const n = order.length;
  let match: SearchJobResult["match"] = null;
  if (n > 0 && request.from < n) {
    match = await withReader(request, context, (scanner) =>
      isFileOrdered(order)
        ? searchInOrder(scanner, request, progress)
        : searchByFileScan(scanner, request, progress)
    );
  }
  const totalMs = performance.now() - startedAt;
  return { kind: "search", match, stats: { readMs: totalMs, totalMs, peakHeapUsed: heapUsed() } };
}

/**
 * 並びの順に読んで探す（並びがファイル順のとき。近くで見つかればすぐ止まる）。
 * forward: from → 末尾 → 先頭 → from（fromCol より手前）、backward はその逆
 */
async function searchInOrder(
  scanner: Scanner,
  request: SearchJobRequest,
  progress: Progress
): Promise<SearchJobResult["match"]> {
  const { order } = request.rows;
  const { needle, from, fromCol, direction } = request;
  const n = order.length;
  let found: SearchJobResult["match"] = null;
  const total = n + 1;
  const visit = (position: number, handle: number, row: readonly string[]) => {
    const col = findInRow(row, needle, direction, position === from ? fromCol : undefined);
    if (col >= 0) {
      found = { position, col, handle };
      return true;
    }
    return false;
  };
  const forward = direction === "forward";
  // 1周目: from から端まで
  if (
    await scanPositions(scanner, order, from, forward ? n : -1, forward ? 1 : -1, visit, (v) => {
      progress.report(v / total);
    })
  ) {
    return found;
  }
  const firstLeg = forward ? n - from : from + 1;
  // 2周目: 反対の端から from の手前まで
  if (
    await scanPositions(scanner, order, forward ? 0 : n - 1, from, forward ? 1 : -1, visit, (v) => {
      progress.report((firstLeg + v) / total);
    })
  ) {
    return found;
  }
  // 最後に開始行の残り（開始セルを含む手前）
  if (fromCol !== undefined) {
    await scanPositions(
      scanner,
      order,
      from,
      from + 1,
      1,
      (position, handle, row) => {
        const col = findInRowWrapped(row, needle, direction, fromCol);
        if (col >= 0) {
          found = { position, col, handle };
          return true;
        }
        return false;
      },
      () => {}
    );
  }
  return found;
}

/**
 * ファイル全体を先頭から読み、並びで開始セルから最も近い一致を探す（ソート後の並びで、並びの順に読むと
 * ファイルを飛び飛びに読むことになるとき）。ファイルは1回だけ順に読む
 */
async function searchByFileScan(
  scanner: Scanner,
  request: SearchJobRequest,
  progress: Progress
): Promise<SearchJobResult["match"]> {
  const { order } = request.rows;
  const { needle, from, fromCol, direction } = request;
  const n = order.length;
  const lineCount = scanner.reader.lineCount;
  // 元の行のハンドル → 並びの位置（無ければ -1）
  const positions = new Int32Array(lineCount).fill(-1);
  const others: { position: number; handle: number }[] = [];
  order.forEach((handle, position) => {
    if (handle > 0 && handle < lineCount && !scanner.edits.has(handle)) {
      positions[handle] = position;
    } else {
      others.push({ position, handle });
    }
  });
  let best: SearchJobResult["match"] = null;
  let bestDistance = Infinity;
  const consider = (position: number, handle: number, row: readonly string[]) => {
    const distance =
      direction === "forward" ? (position - from + n) % n : (from - position + n) % n;
    if (distance > bestDistance) {
      return;
    }
    let col = findInRow(row, needle, direction, position === from ? fromCol : undefined);
    let effective = distance;
    if (col < 0 && position === from && fromCol !== undefined) {
      col = findInRowWrapped(row, needle, direction, fromCol);
      effective = n;
    }
    if (col >= 0 && effective < bestDistance) {
      bestDistance = effective;
      best = { position, col, handle };
    }
  };
  for (const { position, handle } of others) {
    consider(position, handle, scanner.edits.get(handle) ?? []);
  }
  const { batchRows, context } = scanner;
  for (let first = 1; first < lineCount && bestDistance > 0; first += batchRows) {
    if (context.isCancelled()) {
      throw new QueryScanCancelledError();
    }
    const count = Math.min(batchRows, lineCount - first);
    // 並びにある行を含む連続区間だけを読む
    let i = first;
    const end = first + count;
    while (i < end) {
      if (positions[i] < 0) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < end && positions[j] >= 0) {
        j++;
      }
      await scanner.reader.readRun(i, j - i, (handle, row) => {
        consider(positions[handle], handle, row);
      });
      i = j;
    }
    progress.report((first + count) / lineCount);
  }
  return best;
}
