import { parseRow } from "../csv/rowCodec";

/**
 * 大容量モードの検索・ソート・フィルタの一致規則と比較規則（vscode API・npm パッケージに依存しない純粋な関数）。
 *
 * 通常モード（webview の EditableTable が使う TanStack Table の既定と useTableSearch）と同じ規則にする:
 * - ソート: 列の `sortingFn` は既定の "auto"（`getAutoSortingFn`）。フィルタ後の行のうち **先頭10行を除いた** 行
 *   （TanStack の `flatRows.slice(10)`）の値に数字があれば `alphanumeric`、無ければ `text`、
 *   見る行が無ければ（10行以下）`basic`。`alphanumeric` と `text` は小文字にして比べ、`basic` は区別する。
 *   降順は比較の符号だけを反転し、比較が同じ行は元の順（安定）
 * - フィルタ: 既定の "auto"（文字列なので `includesString`）。小文字にした部分一致で、前後の空白は除かない。
 *   空の条件は解除（`autoRemove`）。複数列の条件は AND
 * - 検索: 前後の空白を除いて小文字にした部分一致。行優先（行ごとに左の列から）で、末尾まで行ったら先頭に折り返す。
 *   空なら何もしない
 * 無いセル（列数の足りない行）は空文字として扱う（通常モードは列数を揃えて空文字で埋める）。
 */

export type SortKind = "basic" | "text" | "alphanumeric";

export type SortDirection = "asc" | "desc";

export type SearchDirection = "forward" | "backward";

export interface FilterCondition {
  column: number;
  text: string;
}

/** TanStack の reSplitAlphaNumeric（split で数字の並びを区切りとして残す） */
const SPLIT_ALPHANUMERIC = /([0-9]+)/gm;

/** TanStack の getAutoSortingFn が値を見ない先頭の行数（`flatRows.slice(10)`） */
export const SORT_KIND_SKIPPED_ROWS = 10;

const cellAt = (row: readonly string[], column: number): string => row[column] ?? "";

/** TanStack の compareBasic */
function compareBasic(a: string, b: string): number {
  return a === b ? 0 : a > b ? 1 : -1;
}

/** TanStack の compareAlphanumeric をそのまま移したもの（数字の並びを数として比べる） */
export function compareAlphanumeric(aStr: string, bStr: string): number {
  const a = aStr.split(SPLIT_ALPHANUMERIC).filter(Boolean);
  const b = bStr.split(SPLIT_ALPHANUMERIC).filter(Boolean);
  while (a.length && b.length) {
    const aa = a.shift() ?? "";
    const bb = b.shift() ?? "";
    const an = parseInt(aa, 10);
    const bn = parseInt(bb, 10);
    // TanStack と同じく、数として並べたときの先頭・末尾で「両方文字列」「片方だけ数」を判定する
    const combo = [an, bn].sort();
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }
    if (isNaN(combo[1])) {
      return isNaN(an) ? -1 : 1;
    }
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b.length;
}

/** 通常モードの比較（キーを使わない参照実装。テストと少数の比較用） */
export function compareCells(a: string, b: string, kind: SortKind): number {
  switch (kind) {
    case "basic":
      return compareBasic(a, b);
    case "text":
      return compareBasic(a.toLowerCase(), b.toLowerCase());
    case "alphanumeric":
      return compareAlphanumeric(a.toLowerCase(), b.toLowerCase());
  }
}

const hasDigitRun = (value: string): boolean => value.split(SPLIT_ALPHANUMERIC).length > 1;

/**
 * 比較の種類を、フィルタ後の行（ファイル上の並び＝ソート前の順）の列の値から決める（TanStack の getAutoSortingFn）。
 * 値を1つずつ observe して、最後に kind を読む。
 */
export class SortKindDetector {
  private seen = 0;
  private digits = false;

  observe(value: string): void {
    if (this.seen >= SORT_KIND_SKIPPED_ROWS && !this.digits && hasDigitRun(value)) {
      this.digits = true;
    }
    this.seen += 1;
  }

  get kind(): SortKind {
    if (this.seen <= SORT_KIND_SKIPPED_ROWS) {
      return "basic";
    }
    return this.digits ? "alphanumeric" : "text";
  }
}

export function detectSortKind(values: Iterable<string>): SortKind {
  const detector = new SortKindDetector();
  for (const value of values) {
    detector.observe(value);
  }
  return detector.kind;
}

/** 数（0 以上の double）を、大小が文字列の大小と一致する4文字に符号化する（IEEE 754 のビット列の上位から） */
function encodeNumber(value: number): string {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return String.fromCharCode(
    view.getUint16(0),
    view.getUint16(2),
    view.getUint16(4),
    view.getUint16(6)
  );
}

const TAG_TEXT = "\u0001";
const TAG_NUMBER = "\u0002";
const TERMINATOR = "\u0000\u0000";
/** キーの先頭に付ける印（キーを必ず新しい文字列にして、元の行の文字列を参照し続けないようにする） */
const KEY_PREFIX = "\u0001";

/**
 * 比較用のキー。`compareSortKeys`（文字列の大小）で比べると `compareCells(…, kind)` と同じ大小になる。
 * 500万行のソートで比較のたびに split するのを避けるため、1行に1回だけ作る。
 * alphanumeric は、数字の並びとそれ以外を交互に、文字列は「印 + 文字（\0 は \0\1）+ \0\0」、
 * 数は「印 + parseInt の値の4文字」に符号化する（文字列が数より前、短い方が前、は TanStack と同じ）。
 */
export function sortKey(value: string, kind: SortKind): string {
  switch (kind) {
    case "basic":
      return KEY_PREFIX + value;
    case "text":
      return KEY_PREFIX + value.toLowerCase();
    case "alphanumeric": {
      let key = KEY_PREFIX;
      for (const part of value.toLowerCase().split(SPLIT_ALPHANUMERIC)) {
        if (part === "") {
          continue;
        }
        const number = parseInt(part, 10);
        key += isNaN(number)
          ? TAG_TEXT + part.replaceAll("\u0000", "\u0000\u0001") + TERMINATOR
          : TAG_NUMBER + encodeNumber(number);
      }
      return key;
    }
  }
}

export function compareSortKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** キーの順に並べた位置（安定。降順は比較だけを反転し、同じキーは元の順） */
export function sortOrder(keys: readonly string[], direction: SortDirection): number[] {
  const order = Array.from({ length: keys.length }, (_, i) => i);
  if (direction === "asc") {
    order.sort((i, j) => (keys[i] < keys[j] ? -1 : keys[i] > keys[j] ? 1 : i - j));
  } else {
    order.sort((i, j) => (keys[i] < keys[j] ? 1 : keys[i] > keys[j] ? -1 : i - j));
  }
  return order;
}

/** フィルタ条件を比較用にする（空の条件を除き、文字列を小文字にする） */
export function normalizeFilters(filters: readonly FilterCondition[]): FilterCondition[] {
  return filters
    .filter((f) => f.text !== "")
    .map((f) => ({ column: f.column, text: f.text.toLowerCase() }));
}

/** normalizeFilters した条件にすべて合うか */
export function rowMatchesFilters(
  row: readonly string[],
  normalized: readonly FilterCondition[]
): boolean {
  return normalized.every((f) => cellAt(row, f.column).toLowerCase().includes(f.text));
}

/** 検索語を比較用にする（前後の空白を除いて小文字）。空なら null（検索しない） */
export function normalizeSearchQuery(query: string): string | null {
  const trimmed = query.trim();
  return trimmed === "" ? null : trimmed.toLowerCase();
}

/**
 * 行の中で needle（normalizeSearchQuery 済み）を含むセルの列を、方向に向かって探す。
 * afterCol を渡すとその列より先（forward は右、backward は左）から、渡さなければ行の端から探す。無ければ -1
 */
export function findInRow(
  row: readonly string[],
  needle: string,
  direction: SearchDirection,
  afterCol?: number
): number {
  if (direction === "forward") {
    for (let c = afterCol === undefined ? 0 : afterCol + 1; c < row.length; c++) {
      if (row[c].toLowerCase().includes(needle)) {
        return c;
      }
    }
  } else {
    for (
      let c = Math.min(row.length - 1, afterCol === undefined ? Infinity : afterCol - 1);
      c >= 0;
      c--
    ) {
      if (row[c].toLowerCase().includes(needle)) {
        return c;
      }
    }
  }
  return -1;
}

/**
 * 行の中で、開始セル（from, fromCol）を一周して戻ってきたときに見る残りの部分（fromCol を含むそれより手前）で探す。
 * forward は [0, fromCol]、backward は [fromCol, 末尾]。無ければ -1
 */
export function findInRowWrapped(
  row: readonly string[],
  needle: string,
  direction: SearchDirection,
  fromCol: number
): number {
  if (direction === "forward") {
    for (let c = 0; c <= Math.min(fromCol, row.length - 1); c++) {
      if (row[c].toLowerCase().includes(needle)) {
        return c;
      }
    }
  } else {
    for (let c = row.length - 1; c >= fromCol; c--) {
      if (row[c].toLowerCase().includes(needle)) {
        return c;
      }
    }
  }
  return -1;
}

export interface SearchMatch {
  row: number;
  col: number;
}

/**
 * 並び rows の中で needle を探す（参照実装。ワーカーは同じ順で読みながら探す）。
 * fromCol を渡すと開始セル (from, fromCol) の次から、渡さなければ行 from の端（forward は左端、backward は右端）
 * から方向に向かって探し、端まで行ったら反対の端に折り返して一周する（開始セル自身は最後に見る）。
 */
export function searchRows(
  rows: readonly (readonly string[])[],
  needle: string,
  from: number,
  fromCol: number | undefined,
  direction: SearchDirection
): SearchMatch | null {
  const n = rows.length;
  if (n === 0) {
    return null;
  }
  const step = direction === "forward" ? 1 : -1;
  for (let k = 0; k < n; k++) {
    const row = (((from + step * k) % n) + n) % n;
    const col = findInRow(rows[row], needle, direction, k === 0 ? fromCol : undefined);
    if (col >= 0) {
      return { row, col };
    }
  }
  if (fromCol !== undefined) {
    const col = findInRowWrapped(rows[from], needle, direction, fromCol);
    if (col >= 0) {
      return { row: from, col };
    }
  }
  return null;
}

/**
 * 1行のテキストをパースする（parseRow と同じ結果）。クォート・改行を含まない行は split で速く分ける。
 * パースできない行は、生テキストを1セルに入れる（FileRowReader と同じ）。
 */
export function parseRecord(text: string, delimiter = ","): string[] {
  if (!text.includes('"') && !text.includes("\n") && !text.includes("\r")) {
    return text.split(delimiter);
  }
  try {
    return parseRow(text, { delimiter });
  } catch {
    return [text];
  }
}
