/**
 * CSVテキストの行（レコード）境界を検出する。
 *
 * webview の `parseCsv`（csv-parse、`relax_column_count`・区切り文字 ","）と同じ規則で区切る:
 * - 行区切りは、クォート外で最初に現れた改行で決まる（CRLF → LF → CR の順に判定）。
 *   それ以降に現れる別種の改行はセルの内容として扱う（例: 行区切りが CRLF のとき単独の LF はセル内容）。
 * - 空行も1行（1列の空セルのレコード）として数える。
 * - 最後の行区切りの後に何も無ければ、そこに行は無い（末尾改行は行を増やさない）。
 * - 先頭の BOM(U+FEFF) は行に含めない（オフセットは元テキスト上の位置のまま）。
 *
 * `parseCsv` が失敗するテキスト（閉じていないクォート等）の結果は未規定（例外は投げない）。
 */

const BOM = "﻿";
const CR = "\r";
const LF = "\n";
const QUOTE = '"';

/** レコードの区切り（改行コード） */
export type RecordDelimiter = "\r\n" | "\n" | "\r";

/** 1行のテキスト上の範囲（UTF-16 のオフセット） */
export interface RowRange {
  /** 行の開始位置 */
  start: number;
  /** 行の終了位置（排他的。行区切りを含まない） */
  end: number;
  /** 次の行の開始位置（行区切りを含む終了位置。最終行ではテキスト末尾） */
  next: number;
}

/** 行境界の検出結果 */
export interface RowBoundaries {
  /** 検出した行区切り。テキストのクォート外に改行が無ければ null */
  delimiter: RecordDelimiter | null;
  /** 各行の範囲。`parseCsv(text).rows` と同じ並び・同じ件数 */
  rows: RowRange[];
}

/**
 * テキストを走査し、各行のテキスト上の範囲を返す。
 * 行 i は `text.slice(rows[i].start, rows[i].end)` で、行区切りを含めると `[start, next)` になる。
 */
export function scanRows(text: string): RowBoundaries {
  const contentStart = text.startsWith(BOM) ? BOM.length : 0;
  const rows: RowRange[] = [];
  let delimiter: RecordDelimiter | null = null;
  let inQuotes = false;
  let rowStart = contentStart;

  for (let pos = contentStart; pos < text.length; pos++) {
    const char = text[pos];
    if (char === QUOTE) {
      // `""`（クォート内のエスケープ）は2回反転するため、単純な反転で正しく追跡できる
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes || (char !== CR && char !== LF)) {
      continue;
    }
    delimiter ??= discoverDelimiter(text, pos);
    if (!text.startsWith(delimiter, pos)) {
      continue;
    }
    const next = pos + delimiter.length;
    rows.push({ start: rowStart, end: pos, next });
    rowStart = next;
    pos = next - 1;
  }

  if (rowStart < text.length) {
    rows.push({ start: rowStart, end: text.length, next: text.length });
  }
  return { delimiter, rows };
}

/** pos にある改行から行区切りを決める（csv-parse の自動判定と同じく CRLF を CR より優先する） */
function discoverDelimiter(text: string, pos: number): RecordDelimiter {
  if (text[pos] === LF) {
    return LF;
  }
  return text[pos + 1] === LF ? "\r\n" : CR;
}
