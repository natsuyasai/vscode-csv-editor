import type { LargeRange } from "@message/largeMessages";
import { HEADER_ROW, moveCell, type CellPosition, type GridBounds } from "./cellNavigation";

/**
 * 大容量モードの表の矩形選択。
 * 選択は「起点（anchor）」と「選択中のセル（focus。キー操作・ドラッグで動く側）」の2点で持ち、
 * セルの集合は作らない（10万セルを超える選択でもセル数を数えて上限を知らせられるようにする）。
 * 範囲はデータ行だけ（ヘッダーを含む選択は範囲にしない）。行は表示順の位置、end は排他
 */

/** 起点と選択中のセルを対角とする範囲。起点が無ければ選択中のセルだけ。選択が無い・ヘッダーを含むなら null */
export function selectionRange(
  anchor: CellPosition | null,
  focus: CellPosition | null
): LargeRange | null {
  if (!focus) {
    return null;
  }
  const from = anchor ?? focus;
  if (from.row === HEADER_ROW || focus.row === HEADER_ROW) {
    return null;
  }
  return {
    startRow: Math.min(from.row, focus.row),
    endRow: Math.max(from.row, focus.row) + 1,
    startCol: Math.min(from.col, focus.col),
    endCol: Math.max(from.col, focus.col) + 1,
  };
}

export const rangeCellCount = (range: LargeRange): number =>
  (range.endRow - range.startRow) * (range.endCol - range.startCol);

export const isInRange = (range: LargeRange | null, row: number, col: number): boolean =>
  range !== null &&
  row >= range.startRow &&
  row < range.endRow &&
  col >= range.startCol &&
  col < range.endCol;

/** 範囲を表の行数・列数に収める（行数が減ったときなど）。収まる部分が無ければ null */
export function clampRange(
  range: LargeRange | null,
  { rowCount, colCount }: GridBounds
): LargeRange | null {
  if (!range) {
    return null;
  }
  const clamped = {
    startRow: range.startRow,
    endRow: Math.min(range.endRow, rowCount),
    startCol: range.startCol,
    endCol: Math.min(range.endCol, colCount),
  };
  return clamped.startRow < clamped.endRow && clamped.startCol < clamped.endCol ? clamped : null;
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Shift+矢印で選択中のセルを動かす先（範囲を広げる・狭める）。
 * 表の端を越えず、先頭行から上へはヘッダーに入らない。ヘッダーからや矢印以外のキーは null
 */
export function extendCell(
  focus: CellPosition,
  key: string,
  bounds: GridBounds
): CellPosition | null {
  if (focus.row === HEADER_ROW || !ARROW_KEYS.has(key)) {
    return null;
  }
  const moved = moveCell(focus, key, false, bounds);
  return moved ? { row: Math.max(0, moved.row), col: moved.col } : null;
}
