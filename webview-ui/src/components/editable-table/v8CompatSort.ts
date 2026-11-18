import type { Row, SortFn } from "@tanstack/react-table";
import type { EditableTableFeatures } from "./tableFeatures";
import type { RowData } from "./types";

/**
 * @tanstack/react-table v8 の既定ソート(sortingFn: "auto")と同じ並びを再現する。
 *
 * v9 の自動判定は先頭10行を標本にするが、v8 は `filteredRows.slice(10)`（先頭10行を除いた残り）を
 * 標本にしていた。そのため v8 では 10行以下の表は常に basic（大文字小文字を区別する文字列の辞書順）、
 * 11行以上の表は 11行目以降の値で alphanumeric / text を選んでいた。
 * 利用者から見える並びを v8 から変えないため、v8 の判定と比較関数をそのまま移植している。
 */

/** v8 の自動判定で選ばれる比較方法 */
export type V8SortKind = "datetime" | "alphanumeric" | "text" | "basic";

/** v8 の sortingFns.reSplitAlphaNumeric と同じ */
const reSplitAlphaNumeric = /([0-9]+)/gm;

/** v8 が自動判定で読み飛ばす先頭の行数（v8 の `flatRows.slice(10)`） */
const V8_SKIPPED_SAMPLE_ROWS = 10;

/**
 * v8 の column.getAutoSortingFn と同じ規則で比較方法を選ぶ。
 * @param filteredValues フィルター後の行(表示順ではなくフィルター後の行モデルの順)の列の値
 */
export function selectV8AutoSortKind(filteredValues: readonly unknown[]): V8SortKind {
  let isString = false;
  for (const value of filteredValues.slice(V8_SKIPPED_SAMPLE_ROWS)) {
    if (Object.prototype.toString.call(value) === "[object Date]") {
      return "datetime";
    }
    if (typeof value === "string") {
      isString = true;
      if (value.split(reSplitAlphaNumeric).length > 1) {
        return "alphanumeric";
      }
    }
  }
  return isString ? "text" : "basic";
}

/** v8 の sortingFns 内の toString と同じ */
function toSortString(value: unknown): string {
  if (typeof value === "number") {
    if (isNaN(value) || value === Infinity || value === -Infinity) {
      return "";
    }
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

/** v8 の compareBasic と同じ */
function compareBasic(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }
  return (a as string) > (b as string) ? 1 : -1;
}

/** v8 の compareAlphanumeric と同じ（数値の組を既定の sort で並べる挙動も含めて移植） */
function compareAlphanumeric(aStr: string, bStr: string): number {
  const a = aStr.split(reSplitAlphaNumeric).filter(Boolean);
  const b = bStr.split(reSplitAlphaNumeric).filter(Boolean);

  while (a.length && b.length) {
    const aa = a.shift()!;
    const bb = b.shift()!;
    const an = parseInt(aa, 10);
    const bn = parseInt(bb, 10);
    // v8 は既定の(文字列としての)sort で NaN の有無を判定している
    const combo = [an, bn].sort();

    // 両方とも文字列
    if (isNaN(combo[0])) {
      if (aa > bb) {
        return 1;
      }
      if (bb > aa) {
        return -1;
      }
      continue;
    }

    // 片方だけ数値
    if (isNaN(combo[1])) {
      return isNaN(an) ? -1 : 1;
    }

    // 両方とも数値
    if (an > bn) {
      return 1;
    }
    if (bn > an) {
      return -1;
    }
  }
  return a.length - b.length;
}

/** v8 の sortingFns(datetime / alphanumeric / text / basic) と同じ比較 */
export function compareByV8SortKind(kind: V8SortKind, a: unknown, b: unknown): number {
  switch (kind) {
    case "datetime":
      return (a as number) > (b as number) ? 1 : (a as number) < (b as number) ? -1 : 0;
    case "alphanumeric":
      return compareAlphanumeric(toSortString(a).toLowerCase(), toSortString(b).toLowerCase());
    case "text":
      return compareBasic(toSortString(a).toLowerCase(), toSortString(b).toLowerCase());
    case "basic":
      return compareBasic(a, b);
  }
}

/**
 * 判定結果のキャッシュ。フィルター後の行モデルの flatRows（再計算されるまで同じ配列）ごと・列ごとに持つ。
 * ソート1回の中で比較のたびに全行を走査しないようにする。
 */
const sortKindCache = new WeakMap<readonly unknown[], Map<string, V8SortKind>>();

function resolveSortKind(row: Row<EditableTableFeatures, RowData>, columnId: string): V8SortKind {
  const flatRows = row.table.getFilteredRowModel().flatRows;
  let byColumn = sortKindCache.get(flatRows);
  if (byColumn === undefined) {
    byColumn = new Map();
    sortKindCache.set(flatRows, byColumn);
  }
  let kind = byColumn.get(columnId);
  if (kind === undefined) {
    kind = selectV8AutoSortKind(flatRows.map((r) => r.getValue(columnId)));
    byColumn.set(columnId, kind);
  }
  return kind;
}

/**
 * v8 の sortingFn: "auto" と同じ並びにするソート関数。列定義の sortFn に指定する。
 * 行モデルの取得に columnFilteringFeature（filteredRowModel）が必要。
 */
export const v8CompatAutoSortFn: SortFn<EditableTableFeatures, RowData> = (rowA, rowB, columnId) =>
  compareByV8SortKind(
    resolveSortKind(rowA, columnId),
    rowA.getValue(columnId),
    rowB.getValue(columnId)
  );
