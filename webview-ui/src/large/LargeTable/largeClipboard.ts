import type { LargeOp } from "@message/largeMessages";
import type { CellPosition, GridBounds } from "./cellNavigation";

/**
 * 大容量モードの表への貼り付けを、拡張機能へ送る編集操作（行ごとの setRow）にする。
 * 通常モードと同じく選択の左上を起点にし、末尾の行を超える分は切り詰める（行は追加しない）。
 * 大容量モードでは列を追加できないので、右端の列を超える分も切り詰める
 */

/** 貼り付ける範囲（行は表示順の位置、endRow は排他） */
export interface PastePlan {
  startRow: number;
  endRow: number;
  startCol: number;
  /** 切り詰めた後の貼り付ける値（行ごとに長さが違ってよい） */
  values: string[][];
  /** 切り詰めた後のセル数（上限 MAX_RANGE_CELLS と比べる） */
  cellCount: number;
  /** 切り詰めた後の最も長い行の列数 */
  width: number;
}

/** 起点 origin から values を貼り付ける範囲。貼り付けるものが無ければ null */
export function planPaste(
  origin: CellPosition,
  values: readonly (readonly string[])[],
  { rowCount, colCount }: GridBounds
): PastePlan | null {
  if (origin.row < 0 || origin.row >= rowCount || origin.col < 0 || origin.col >= colCount) {
    return null;
  }
  const maxCols = colCount - origin.col;
  const kept = values.slice(0, rowCount - origin.row).map((row) => row.slice(0, maxCols));
  if (kept.length === 0) {
    return null;
  }
  return {
    startRow: origin.row,
    endRow: origin.row + kept.length,
    startCol: origin.col,
    values: kept,
    cellCount: kept.reduce((sum, row) => sum + row.length, 0),
    width: Math.max(...kept.map((row) => row.length)),
  };
}

/**
 * 取り寄せた対象の行（plan.startRow から順）に plan の値を貼り付けた setRow を作る。
 * 行全体を送るので、列が足りない行は空のセルで colCount 列まで埋める。内容が変わらない行の op は作らない
 */
export function buildPasteOps(
  target: { rows: readonly (readonly string[])[]; handles: readonly number[] },
  plan: Pick<PastePlan, "startCol" | "values">,
  colCount: number
): LargeOp[] {
  const ops: LargeOp[] = [];
  const count = Math.min(target.rows.length, target.handles.length, plan.values.length);
  for (let i = 0; i < count; i++) {
    const base = target.rows[i];
    const next = Array.from({ length: Math.max(colCount, base.length) }, (_, c) => base[c] ?? "");
    plan.values[i].forEach((value, j) => {
      next[plan.startCol + j] = value;
    });
    if (next.some((value, c) => value !== base[c])) {
      ops.push({ type: "setRow", handle: target.handles[i], row: next });
    }
  }
  return ops;
}
