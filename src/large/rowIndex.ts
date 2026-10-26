/* global AbortSignal */
import { Buffer } from "buffer";
import * as fs from "fs";

import { createByteRowScanner } from "../shared/csv/byteRowScanner";
import type { RecordDelimiter } from "../shared/csv/rowScanner";

/**
 * 行インデックスに入れられる行数の上限（2^27 = 約1.34億行）。
 *
 * オフセット表は行数 × 8B の `Float64Array`（倍々で伸長し、伸長中は新旧の配列が一時的に両方ある）。
 * 1行は最短で改行の1バイトなので、極端に短い行のファイルではファイルサイズの最大8倍になり得る。
 * 上限に達すると表は 2^27 × 8B = 1GB（伸長中は一時的に約1.5GB）になる。
 * 拡張ホストを巻き込んで落ちないよう、それ以上は作らずに `RowIndexLimitError` で止める。
 * 通常の CSV（例 500MB・約500万行）では 40MB 程度で、上限には届かない。
 */
export const MAX_INDEXED_ROWS = 2 ** 27;

const INITIAL_CAPACITY = 1 << 16;
const DEFAULT_HIGH_WATER_MARK = 1024 * 1024;

/** 1行のバイト範囲。行は `[start, end)`、行区切りを含めると `[start, next)` */
export interface RowByteRange {
  start: number;
  end: number;
  next: number;
}

/** 作成中の進捗 */
export interface RowIndexProgress {
  /** 読んだバイト数 */
  bytesRead: number;
  /** 開始時のファイルサイズ */
  totalBytes: number;
  /** bytesRead / totalBytes（0〜1。空ファイルは 1） */
  ratio: number;
  /** 確定済みの行数 */
  rowCount: number;
}

/** 作成完了時に確定する情報 */
export interface RowIndexSummary {
  /** 行区切り。クォート外に改行が無ければ null */
  delimiter: RecordDelimiter | null;
  /** 内容の開始位置（BOM を飛ばしたら 3、それ以外は 0） */
  contentStart: number;
  /** ファイルのバイト数（読んだ合計） */
  byteLength: number;
  /** 最終行の後に行区切りがあるか（0行なら false） */
  hasTrailingNewline: boolean;
  rowCount: number;
}

export interface BuildRowIndexOptions {
  /** 先頭の UTF-8 BOM を飛ばすか（`skipsBom(encoding)` の値を渡す） */
  skipBom: boolean;
  /** 中断（パネルを閉じたとき）。中断すると `done` は AbortError で reject される */
  signal?: AbortSignal;
  /** 1回に読むバイト数。既定 1MB */
  highWaterMark?: number;
  /** 行数の上限。既定 `MAX_INDEXED_ROWS`（テスト用に小さくできる） */
  maxRows?: number;
  /** チャンクを読むたびと完了時に呼ばれる */
  onProgress?: (progress: RowIndexProgress) => void;
}

/** 行数が上限を超えたときのエラー */
export class RowIndexLimitError extends Error {
  constructor(readonly maxRows: number) {
    super(`行数が上限（${maxRows.toLocaleString()} 行）を超えたため、大容量モードでは開けません`);
    this.name = "RowIndexLimitError";
  }
}

/**
 * 元ファイルの行開始バイトオフセット表。
 * `RowIndex.build` で作成を始め、ストリームで読みながら非同期に行を確定していく。
 * 作成途中でも確定済みの行（`rowCount` まで）は `getRowRange` で取れる。
 * 1行目（ヘッダー）は最初のチャンクで確定するのが普通で、`firstRow` で待てる。
 *
 * ファイルは作成中に変わらない前提（外部変更は provider 側で検知して作り直す）。
 */
export class RowIndex {
  /** 作成が完了したら resolve。中断・読み取り失敗・行数の上限超えで reject（待つ側がいなくても unhandled にならない） */
  readonly done: Promise<RowIndexSummary>;
  /** 1行目が確定したら true。1行も無いまま完了・失敗したら false（reject はしない） */
  readonly firstRow: Promise<boolean>;

  /** starts[i] は i 行目の開始、starts[rowCount] は最後に確定した行の next */
  private starts: Float64Array = new Float64Array(INITIAL_CAPACITY);
  private count = 0;
  /** 行区切りのバイト数（ファイル全体で一定。最初の行区切りで決まる） */
  private eolLength = 0;
  private lastRowHasEol = true;
  private finished = false;
  private readonly maxRows: number;

  private constructor(
    maxRows: number,
    start: (self: RowIndex, onFirstRow: () => void) => Promise<RowIndexSummary>
  ) {
    this.maxRows = maxRows;
    let resolveFirstRow: (value: boolean) => void = () => {};
    this.firstRow = new Promise((resolve) => {
      resolveFirstRow = resolve;
    });
    this.done = start(this, () => {
      resolveFirstRow(true);
    }).finally(() => {
      resolveFirstRow(this.count > 0);
    });
    this.done.catch(() => {});
  }

  /** 作成を始める（完了は `done` で待つ） */
  static build(filePath: string, options: BuildRowIndexOptions): RowIndex {
    return new RowIndex(options.maxRows ?? MAX_INDEXED_ROWS, (self, onFirstRow) =>
      self.run(filePath, options, onFirstRow)
    );
  }

  /**
   * 作成済みのオフセット表から行インデックスを作る（保存時に書き出しながら作った表で差し替え、再インデックスを省く）。
   * `starts[i]` は i 行目の開始、`starts[summary.rowCount]` は最終行の next（表は受け取ったものをそのまま持つ）。
   * 行区切りの長さは `summary.delimiter`、最終行の行区切りの有無は `summary.hasTrailingNewline` で決まる。
   */
  static fromOffsets(starts: Float64Array, summary: RowIndexSummary): RowIndex {
    const { rowCount } = summary;
    if (!Number.isInteger(rowCount) || rowCount < 0 || starts.length < rowCount + 1) {
      throw new RangeError(
        `オフセット表の要素数（${String(starts.length)}）が行数+1（${String(rowCount + 1)}）に足りません`
      );
    }
    return new RowIndex(Math.max(MAX_INDEXED_ROWS, rowCount), (self) => {
      self.starts = starts;
      self.count = rowCount;
      self.eolLength = summary.delimiter?.length ?? 0;
      self.lastRowHasEol = summary.hasTrailingNewline;
      self.finished = true;
      return Promise.resolve({ ...summary });
    });
  }

  /** 確定済みの行数（作成中は増えていく） */
  get rowCount(): number {
    return this.count;
  }

  /** 作成が完了したか */
  get completed(): boolean {
    return this.finished;
  }

  /** i 行目のバイト範囲。確定していない行は RangeError */
  getRowRange(i: number): RowByteRange {
    if (!Number.isInteger(i) || i < 0 || i >= this.count) {
      throw new RangeError(
        `行 ${String(i)} は確定していません（確定済み ${String(this.count)} 行）`
      );
    }
    const start = this.starts[i];
    const next = this.starts[i + 1];
    const isLastWithoutEol = i === this.count - 1 && !this.lastRowHasEol;
    return { start, end: isLastWithoutEol ? next : next - this.eolLength, next };
  }

  private async run(
    filePath: string,
    options: BuildRowIndexOptions,
    onFirstRow: () => void
  ): Promise<RowIndexSummary> {
    const { signal, onProgress } = options;
    signal?.throwIfAborted();
    const { size: totalBytes } = await fs.promises.stat(filePath);
    signal?.throwIfAborted();

    let bytesRead = 0;
    const report = () =>
      onProgress?.({
        bytesRead,
        totalBytes,
        ratio: totalBytes === 0 ? 1 : Math.min(1, bytesRead / totalBytes),
        rowCount: this.count,
      });

    const scanner = createByteRowScanner(
      (start, end, next) => {
        this.addRow(start, end, next);
        if (this.count === 1) {
          onFirstRow();
        }
      },
      { skipBom: options.skipBom }
    );
    const stream = fs.createReadStream(filePath, {
      highWaterMark: options.highWaterMark ?? DEFAULT_HIGH_WATER_MARK,
      signal,
    });
    try {
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        signal?.throwIfAborted();
        // Buffer はそのまま渡す（包み直すとコピーが発生して遅い）
        scanner.push(chunk);
        bytesRead += chunk.length;
        report();
      }
    } finally {
      stream.destroy();
    }
    const summary = scanner.finish();
    this.finished = true;
    bytesRead = summary.byteLength;
    report();
    return {
      ...summary,
      hasTrailingNewline: this.count > 0 && this.lastRowHasEol,
      rowCount: this.count,
    };
  }

  private addRow(start: number, end: number, next: number): void {
    if (this.count >= this.maxRows) {
      throw new RowIndexLimitError(this.maxRows);
    }
    if (this.count === 0) {
      this.starts[0] = start;
    }
    this.ensureCapacity(this.count + 2);
    this.count++;
    this.starts[this.count] = next;
    if (next === end) {
      // 行区切りの無い行は最終行だけ（finish で確定する）
      this.lastRowHasEol = false;
    } else if (this.eolLength === 0) {
      this.eolLength = next - end;
    }
  }

  private ensureCapacity(required: number): void {
    if (required <= this.starts.length) {
      return;
    }
    // 上限+1（starts は行数+1 要素）で頭打ちにし、最後の伸長で必要以上に確保しない
    const capacity = Math.min(Math.max(required, this.starts.length * 2), this.maxRows + 1);
    const grown = new Float64Array(capacity);
    grown.set(this.starts.subarray(0, this.count + 1));
    this.starts = grown;
  }
}
