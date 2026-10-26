/** 選択中のセルの位置。row はデータ行の表示位置で、ヘッダーは HEADER_ROW（-1） */
export interface CellPosition {
  row: number;
  col: number;
}

/** ヘッダー行を表す row */
export const HEADER_ROW = -1;

export interface GridBounds {
  /** データ行数（ヘッダーを除く） */
  rowCount: number;
  colCount: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * キー入力による選択の移動先を返す（移動のキーでなければ null）。
 * - 矢印キーは隣のセルへ移動し、端を越えない。先頭行の上はヘッダー
 * - Tab は右へ、行末では次の行の先頭へ。Shift+Tab はその逆（表の端では止まる）
 */
export function moveCell(
  cell: CellPosition,
  key: string,
  shiftKey: boolean,
  { rowCount, colCount }: GridBounds
): CellPosition | null {
  const lastRow = rowCount - 1;
  const lastCol = Math.max(0, colCount - 1);
  switch (key) {
    case "ArrowUp":
      return { row: Math.max(HEADER_ROW, cell.row - 1), col: cell.col };
    case "ArrowDown":
      return { row: clamp(cell.row + 1, HEADER_ROW, lastRow), col: cell.col };
    case "ArrowLeft":
      return { row: cell.row, col: Math.max(0, cell.col - 1) };
    case "ArrowRight":
      return { row: cell.row, col: Math.min(lastCol, cell.col + 1) };
    case "Tab":
      if (shiftKey) {
        if (cell.col > 0) {
          return { row: cell.row, col: cell.col - 1 };
        }
        return cell.row > HEADER_ROW ? { row: cell.row - 1, col: lastCol } : cell;
      }
      if (cell.col < lastCol) {
        return { row: cell.row, col: cell.col + 1 };
      }
      return cell.row < lastRow ? { row: cell.row + 1, col: 0 } : cell;
    default:
      return null;
  }
}

/**
 * データ行 row を表示領域に収めるための仮想スクロール位置を返す（収まっていれば null）。
 * 位置は行高×行番号の仮想座標（DOM の位置へは scrollScaling の toDomOffset で変換する）
 */
export function revealOffset(
  row: number,
  rowHeight: number,
  offset: number,
  viewportHeight: number
): number | null {
  if (row < 0) {
    return null;
  }
  const top = row * rowHeight;
  const bottom = top + rowHeight;
  if (top < offset) {
    return top;
  }
  if (bottom > offset + viewportHeight) {
    return bottom - viewportHeight;
  }
  return null;
}
