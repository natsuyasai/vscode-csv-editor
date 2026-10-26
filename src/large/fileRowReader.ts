import { Buffer } from "buffer";
import * as fs from "fs";
import { TextDecoder } from "util";

import { MAX_ROWS_PER_REQUEST } from "../message/largeMessages";
import { parseRow } from "../shared/csv/rowCodec";

import { decoderLabel, type LargeEncoding } from "./largeEncoding";
import type { RowByteRange } from "./rowIndex";

/** 行のバイト範囲を引ける表（`RowIndex`。作成途中でもよい） */
export interface RowRangeSource {
  /** 確定済みの行数 */
  readonly rowCount: number;
  getRowRange(i: number): RowByteRange;
}

export interface FileRowReaderOptions {
  encoding: LargeEncoding;
  /** セルの区切り文字。既定 "," */
  fieldDelimiter?: string;
}

export interface ReadRowsResult {
  /** 読んだ最初の行番号（要求の start と同じ） */
  start: number;
  /**
   * パースした行。確定済みの行数を超える分は切り詰める（作成途中のインデックスなら後で再要求する）。
   * パースできない行は、行区切りを除いた生テキストを1セルに入れる。
   */
  rows: string[][];
  /** パースできなかった行の行番号（ファイル上の行番号。昇順） */
  invalidRows: number[];
}

/**
 * 元ファイルから行範囲を読み、デコードして行ごとにパースする。
 * 1回の要求（最大 `MAX_ROWS_PER_REQUEST` 行）は連続した1回の範囲読み取りで読む。
 *
 * パースできない行（クォートの不整合など）はエラーにせず、生テキストを1セルに入れて
 * `invalidRows` で知らせる（表示を止めないことを優先する）。
 */
export class FileRowReader {
  private constructor(
    private handle: fs.promises.FileHandle | null,
    private readonly decoder: TextDecoder,
    private readonly fieldDelimiter: string
  ) {}

  static async open(filePath: string, options: FileRowReaderOptions): Promise<FileRowReader> {
    // BOM は行インデックス側で飛ばすので、デコーダには除かせない（行頭の U+FEFF を黙って消さない）
    const decoder = new TextDecoder(decoderLabel(options.encoding), { ignoreBOM: true });
    const handle = await fs.promises.open(filePath, "r");
    return new FileRowReader(handle, decoder, options.fieldDelimiter ?? ",");
  }

  /** [start, start + count) の行を読む。count は `MAX_ROWS_PER_REQUEST` まで */
  async readRows(index: RowRangeSource, start: number, count: number): Promise<ReadRowsResult> {
    if (!Number.isInteger(start) || start < 0) {
      throw new RangeError(`start が不正です: ${String(start)}`);
    }
    if (!Number.isInteger(count) || count < 0 || count > MAX_ROWS_PER_REQUEST) {
      throw new RangeError(
        `count は 0〜${String(MAX_ROWS_PER_REQUEST)} の整数です: ${String(count)}`
      );
    }
    const handle = this.handle;
    if (handle === null) {
      throw new Error("FileRowReader は閉じられています");
    }
    const endRow = Math.min(start + count, index.rowCount);
    const ranges: RowByteRange[] = [];
    for (let i = start; i < endRow; i++) {
      ranges.push(index.getRowRange(i));
    }
    if (ranges.length === 0) {
      return { start, rows: [], invalidRows: [] };
    }
    const base = ranges[0].start;
    const buffer = Buffer.allocUnsafe(ranges[ranges.length - 1].end - base);
    await readFully(handle, buffer, base);

    const rows: string[][] = [];
    const invalidRows: number[] = [];
    ranges.forEach((range, i) => {
      const text = this.decoder.decode(buffer.subarray(range.start - base, range.end - base));
      try {
        rows.push(parseRow(text, { delimiter: this.fieldDelimiter }));
      } catch {
        rows.push([text]);
        invalidRows.push(start + i);
      }
    });
    return { start, rows, invalidRows };
  }

  /** ファイルハンドルを閉じる。何度呼んでもよい */
  async close(): Promise<void> {
    const handle = this.handle;
    this.handle = null;
    await handle?.close();
  }
}

/** buffer がいっぱいになるまで position から読む（read は要求より少なく返すことがある） */
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
