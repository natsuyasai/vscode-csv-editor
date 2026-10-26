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

export interface SearchStartInput {
  direction: LargeSearchDirection;
  /** 現在の表示行数（ソート・フィルタ後） */
  rowCount: number;
  /** 選択中のセルの表示行（無い・ヘッダーなら null または負） */
  selectedRow: number | null;
  /** 直前の検索で一致したセル（続きの検索の基準） */
  lastMatch: { row: number; col: number } | null;
}

/**
 * `large/search` の from / fromCol を決める。
 * - 続きの検索（直前の一致がある）: 一致したセルをそのまま送る。拡張機能がそのセルの次
 *   （forward は右 → 下、backward は左 → 上）から探し、端で折り返して一周する
 * - 新しい検索: fromCol は省略し、選択中の行（無ければ前方は先頭、後方は末尾）の端のセルから探す。
 *   通常モードの検索が表の先頭から全件を探すのに近づけるため、選択セルの次ではなく行の端から始める
 * - 行が無ければ null（検索しない）
 */
export function searchStart({
  direction,
  rowCount,
  selectedRow,
  lastMatch,
}: SearchStartInput): { from: number; fromCol?: number } | null {
  if (rowCount <= 0) {
    return null;
  }
  if (lastMatch !== null && lastMatch.row < rowCount) {
    return { from: lastMatch.row, fromCol: lastMatch.col };
  }
  const forward = direction === "forward";
  if (selectedRow === null || selectedRow < 0 || selectedRow >= rowCount) {
    return { from: forward ? 0 : rowCount - 1 };
  }
  return { from: selectedRow };
}
