import type { LargeFilterCondition, LargeSearchDirection } from "@message/largeMessages";

export type SortDirection = "asc" | "desc";
export interface SortState {
  column: number;
  direction: SortDirection;
}

/**
 * 列ヘッダーのソート操作で次に要求するソート条件（昇順 → 降順 → 解除）。
 * 別の列をクリックしたときは、その列の昇順から始める。null は解除
 */
export function nextSort(current: SortState | null, column: number): SortState | null {
  if (current === null || current.column !== column) {
    return { column, direction: "asc" };
  }
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

/** 列ごとの入力から、`large/filter` に載せる条件（入力のある列だけ）を作る */
export function toFilterConditions(texts: readonly string[]): LargeFilterCondition[] {
  const conditions: LargeFilterCondition[] = [];
  texts.forEach((text, column) => {
    if (typeof text === "string" && text !== "") {
      conditions.push({ column, text });
    }
  });
  return conditions;
}

export interface SearchFromInput {
  direction: LargeSearchDirection;
  /** 現在の表示行数（ソート・フィルタ後） */
  rowCount: number;
  /** 選択中のセルの表示行（無い・ヘッダーなら null または負） */
  selectedRow: number | null;
  /** 直前の検索で一致した行 */
  lastMatchRow: number | null;
  /** 新しい検索語での最初の検索か（Enter や、語を変えたとき） */
  fresh: boolean;
}

/**
 * `large/search` の from（表示順の行位置。その行を含めて探す）を決める。
 * - 新しい検索: 選択中の行から（無ければ前方は先頭、後方は末尾）
 * - 続きの検索: 基準（選択中の行。無ければ直前の一致行）の次・前の行から。
 *   一致後はその一致セルが選択されているので、基準は一致行と同じになる
 * - 末尾を越えたら先頭、先頭を越えたら末尾へ回り込む。行が無ければ null（検索しない）
 */
export function searchFrom({
  direction,
  rowCount,
  selectedRow,
  lastMatchRow,
  fresh,
}: SearchFromInput): number | null {
  if (rowCount <= 0) {
    return null;
  }
  const forward = direction === "forward";
  const selected = selectedRow !== null && selectedRow >= 0 ? selectedRow : null;
  const base = fresh ? selected : (selected ?? lastMatchRow);
  const from =
    base === null ? (forward ? 0 : rowCount - 1) : fresh ? base : base + (forward ? 1 : -1);
  if (from < 0) {
    return rowCount - 1;
  }
  if (from >= rowCount) {
    return forward ? 0 : rowCount - 1;
  }
  return from;
}
