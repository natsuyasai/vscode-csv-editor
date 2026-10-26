/* global AbortSignal, process */
import { Buffer } from "buffer";
import { randomBytes } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";

import { stringifyRow } from "../shared/csv/rowCodec";
import type { RecordDelimiter } from "../shared/csv/rowScanner";

import type { LargeEncoding } from "./largeEncoding";
import { encodeText } from "./largeTextEncoder";
import type { RowIndex, RowIndexSummary } from "./rowIndex";

/**
 * 書き出す行の並びの1区間。
 * - `original`: 元ファイルの行 `[startRow, endRow)`（ファイル上の行番号。0 はヘッダー行）。バイト列をそのままコピーする
 * - `row`: 編集した行・追加した行。`stringifyRow` → エンコードして書く
 */
export type WriteSegment =
  { kind: "original"; startRow: number; endRow: number } | { kind: "row"; row: readonly string[] };

export interface WriteProgress {
  /** 書いた行数 */
  rowsWritten: number;
  /** 書いたバイト数（BOM を含む） */
  bytesWritten: number;
}

export interface WriteLargeCsvOptions {
  /** 元ファイル（`original` 区間のコピー元。`index` を作ったファイル） */
  sourcePath: string;
  /** 書き出し先。保存なら `sourcePath` と同じ、別名で保存なら別のパス */
  targetPath: string;
  /** 元ファイルの行インデックス（作成完了していること） */
  index: Pick<RowIndex, "rowCount" | "getRowRange" | "completed">;
  /** 元ファイルの行インデックスの要約（行区切り・BOM・末尾改行の有無を引き継ぐ） */
  summary: RowIndexSummary;
  /** 書き出す行の並び。先頭はヘッダー行（行0） */
  segments: Iterable<WriteSegment> | AsyncIterable<WriteSegment>;
  /** 元ファイルを開いた文字コード（編集した行のエンコードに使う。文字コードの変換はしない） */
  encoding: LargeEncoding;
  /** セルの区切り文字。既定 "," */
  fieldDelimiter?: string;
  /** 元ファイルに行区切りが無い（0〜1行で改行なし）ときに使う行区切り。既定 "\n" */
  defaultEol?: RecordDelimiter;
  /** 中断。中断すると AbortError で reject し、書き出し先は変えない */
  signal?: AbortSignal;
  /** 書き出し中の進捗（バッファを書き出すたびと完了時） */
  onProgress?: (progress: WriteProgress) => void;
  /** 元の行をコピーするときに1回に読むバイト数。既定 4MB */
  chunkSize?: number;
  /** 置き換え（rename）のリトライ。EPERM / EBUSY / EACCES のときだけ。既定 5回・50ms から倍々 */
  renameRetry?: { attempts: number; delayMs: number };
  /** テスト用: rename の差し替え */
  rename?: (from: string, to: string) => Promise<void>;
}

export interface WriteLargeCsvResult {
  /**
   * 書き出したファイルの行開始オフセット表（`starts[i]` は i 行目の開始、`starts[rowCount]` は最終行の next）。
   * `RowIndex.fromOffsets(starts, summary)` で、書き出し先の行インデックスとしてそのまま使える
   */
  starts: Float64Array;
  /** 書き出したファイルの要約（行インデックスを作り直した結果と同じ） */
  summary: RowIndexSummary;
}

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;
const WRITE_BUFFER_SIZE = 1024 * 1024;
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const RETRYABLE_RENAME_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);

/**
 * 大容量CSVを書き出す（保存・別名で保存）。
 *
 * - 元の行（`original` 区間）は元ファイルのバイト範囲をそのままコピーする（再エンコードしない）。
 *   区間の内側の行区切りもそのままコピーし、区間と区間・行の間には元の行区切りを書く
 * - 編集・追加した行は `stringifyRow` → `encodeText` でエンコードする
 * - 先頭の BOM: 元ファイルに BOM があれば（`contentStart` > 0）そのまま残し、
 *   無ければ文字コードが UTF-8(BOM) のときだけ付ける
 * - 末尾の改行: 元ファイルの有無を引き継ぐ。ただし末尾改行なしで最終行が空行になるときは、
 *   行が消えないよう（読み直したときに行数が変わらないよう）末尾に改行を付ける
 * - 同じディレクトリの一時ファイル（`.<名前>.<乱数>.tmp`）に書き、fsync → close してから rename で置き換える。
 *   失敗・中断したら一時ファイルを消し、書き出し先は変えない
 *
 * 注意:
 * - 書き出し先を開いたままのハンドルがあると、Windows では rename が EPERM で失敗する。
 *   呼び出し側（provider）は `FileRowReader` を閉じてから呼び、保存後に開き直すこと
 * - 元ファイルを開いた文字コードと違う文字コードで書き出す（変換する）ことはできない
 */
export async function writeLargeCsv(options: WriteLargeCsvOptions): Promise<WriteLargeCsvResult> {
  const { signal, index } = options;
  signal?.throwIfAborted();
  if (!index.completed) {
    throw new Error("行インデックスの作成が終わっていないため保存できません");
  }
  const targetPath = path.resolve(options.targetPath);
  const tempPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${randomBytes(6).toString("hex")}.tmp`
  );

  let source: fs.promises.FileHandle | null = null;
  let temp: fs.promises.FileHandle | null = null;
  let tempCreated = false;
  try {
    source = await fs.promises.open(options.sourcePath, "r");
    temp = await fs.promises.open(tempPath, "wx");
    tempCreated = true;
    const output = new OutputWriter(temp, options.onProgress);
    const result = await writeContent(options, source, output);
    await output.flush();
    await temp.sync();
    await temp.close();
    temp = null;
    // 置き換える前に閉じる（書き出し先が元ファイルのとき、開いたままだと Windows で rename できない）
    await source.close();
    source = null;
    await copyMode(targetPath, tempPath);
    signal?.throwIfAborted();
    await renameWithRetry(tempPath, targetPath, options);
    tempCreated = false;
    output.reportProgress();
    return result;
  } finally {
    await temp?.close().catch(() => {});
    await source?.close().catch(() => {});
    if (tempCreated) {
      await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    }
  }
}

async function writeContent(
  options: WriteLargeCsvOptions,
  source: fs.promises.FileHandle,
  output: OutputWriter
): Promise<WriteLargeCsvResult> {
  const { index, summary, signal } = options;
  const eolText = summary.delimiter ?? options.defaultEol ?? "\n";
  const eol = Buffer.from(eolText, "latin1");
  const fieldDelimiter = options.fieldDelimiter ?? ",";
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const starts = new OffsetTable();

  if (summary.contentStart > 0) {
    await output.copyFrom(source, 0, summary.contentStart, chunkSize);
  } else if (options.encoding === "utf-8-bom") {
    output.write(UTF8_BOM);
  }
  const contentStart = output.position;

  let lastRowEmpty = false;
  for await (const segment of options.segments) {
    signal?.throwIfAborted();
    if (segment.kind === "row") {
      if (starts.count > 0) {
        output.write(eol);
      }
      const bytes = encodeText(
        stringifyRow(segment.row, { delimiter: fieldDelimiter }),
        options.encoding
      );
      starts.push(output.position);
      output.write(bytes);
      output.rowsWritten++;
      lastRowEmpty = bytes.length === 0;
      await output.flushIfFull();
      continue;
    }
    const { startRow, endRow } = segment;
    if (
      !Number.isInteger(startRow) ||
      !Number.isInteger(endRow) ||
      startRow < 0 ||
      endRow < startRow ||
      endRow > index.rowCount
    ) {
      throw new RangeError(
        `元の行の区間が不正です: [${String(startRow)}, ${String(endRow)})（行数 ${String(index.rowCount)}）`
      );
    }
    if (startRow === endRow) {
      continue;
    }
    if (starts.count > 0) {
      output.write(eol);
    }
    const base = index.getRowRange(startRow).start;
    const offset = output.position - base;
    let lastRange = index.getRowRange(startRow);
    for (let r = startRow; r < endRow; r++) {
      lastRange = index.getRowRange(r);
      starts.push(lastRange.start + offset);
    }
    await output.copyFrom(source, base, lastRange.end, chunkSize, signal);
    output.rowsWritten += endRow - startRow;
    lastRowEmpty = lastRange.end === lastRange.start;
  }

  const rowCount = starts.count;
  const hasTrailingNewline = rowCount > 0 && (summary.hasTrailingNewline || lastRowEmpty);
  if (hasTrailingNewline) {
    output.write(eol);
  }
  starts.push(output.position);
  const hasDelimiter = rowCount >= 2 || hasTrailingNewline;
  return {
    starts: starts.toArray(),
    summary: {
      delimiter: hasDelimiter ? eolText : null,
      contentStart,
      byteLength: output.position,
      hasTrailingNewline,
      rowCount,
    },
  };
}

/** 書き出し先への書き込み（小さな書き込みはまとめる）と進捗 */
class OutputWriter {
  position = 0;
  rowsWritten = 0;
  private parts: Buffer[] = [];
  private partsBytes = 0;
  private readBuffer: Buffer | null = null;

  constructor(
    private readonly handle: fs.promises.FileHandle,
    private readonly onProgress: ((progress: WriteProgress) => void) | undefined
  ) {}

  /** 書き込みを溜める（渡したバイト列は書き出すまで変更しないこと） */
  write(bytes: Buffer): void {
    this.position += bytes.length;
    this.parts.push(bytes);
    this.partsBytes += bytes.length;
  }

  /** 溜まった書き込みが一定量を超えたら書き出す */
  async flushIfFull(): Promise<void> {
    if (this.partsBytes >= WRITE_BUFFER_SIZE) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.partsBytes > 0) {
      const bytes = Buffer.concat(this.parts, this.partsBytes);
      this.parts = [];
      this.partsBytes = 0;
      await writeFully(this.handle, bytes);
    }
    this.reportProgress();
  }

  /** 元ファイルの [start, end) をチャンクごとに読んでそのまま書く */
  async copyFrom(
    source: fs.promises.FileHandle,
    start: number,
    end: number,
    chunkSize: number,
    signal?: AbortSignal
  ): Promise<void> {
    await this.flush();
    if (this.readBuffer === null || this.readBuffer.length < chunkSize) {
      this.readBuffer = Buffer.allocUnsafe(chunkSize);
    }
    const chunk = this.readBuffer;
    for (let position = start; position < end;) {
      signal?.throwIfAborted();
      const length = Math.min(chunkSize, end - position);
      const { bytesRead } = await source.read(chunk, 0, length, position);
      if (bytesRead === 0) {
        throw new Error("元ファイルが行インデックスの作成後に短くなっています");
      }
      await writeFully(this.handle, chunk.subarray(0, bytesRead));
      position += bytesRead;
      this.position += bytesRead;
      this.reportProgress();
    }
  }

  reportProgress(): void {
    this.onProgress?.({ rowsWritten: this.rowsWritten, bytesWritten: this.position });
  }
}

async function writeFully(handle: fs.promises.FileHandle, bytes: Buffer): Promise<void> {
  let written = 0;
  while (written < bytes.length) {
    const result = await handle.write(bytes, written, bytes.length - written);
    written += result.bytesWritten;
  }
}

/** 伸長する行開始オフセット表 */
class OffsetTable {
  private starts = new Float64Array(1 << 16);
  private length = 0;

  /** push した数（最後に最終行の next を push する前は、行数と同じ） */
  get count(): number {
    return this.length;
  }

  push(offset: number): void {
    if (this.length === this.starts.length) {
      const grown = new Float64Array(this.starts.length * 2);
      grown.set(this.starts);
      this.starts = grown;
    }
    this.starts[this.length++] = offset;
  }

  toArray(): Float64Array {
    return this.starts.slice(0, this.length);
  }
}

/** POSIX では書き出し先の既存のパーミッションを一時ファイルに引き継ぐ（Windows では読み取り専用属性を写さない） */
async function copyMode(targetPath: string, tempPath: string): Promise<void> {
  if (process.platform === "win32") {
    return;
  }
  try {
    const { mode } = await fs.promises.stat(targetPath);
    await fs.promises.chmod(tempPath, mode & 0o7777);
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
  }
}

async function renameWithRetry(
  from: string,
  to: string,
  options: WriteLargeCsvOptions
): Promise<void> {
  const rename = options.rename ?? ((a: string, b: string) => fs.promises.rename(a, b));
  const { attempts, delayMs } = options.renameRetry ?? { attempts: 5, delayMs: 50 };
  for (let attempt = 1; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (attempt >= attempts || !RETRYABLE_RENAME_ERRORS.has(code)) {
        throw error;
      }
      // ウイルス対策ソフトやインデクサが一時的に開いている場合に備えて待つ
      await sleep(delayMs * 2 ** (attempt - 1));
    }
  }
}
