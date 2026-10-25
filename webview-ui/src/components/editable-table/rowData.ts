import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";
import { getRowId } from "@/utilities/rowIdentity";
import type { RowData } from "./types";

/**
 * 変更のない行のオブジェクトを使い回すためのキャッシュ（CSV行の配列参照をキーにする）。
 * CSV行は更新時に作り直されるため、編集した行以外は同じRowDataを返せる。
 */
const rowDataCache = new WeakMap<readonly string[], RowData>();

/** CSVの1行をTanStack Table用の行データに変換する。index はデータ行内の位置(0始まり) */
export function toRowData(csvRow: readonly string[], index: number): RowData {
  const rowIndexLabel = (index + 1).toString();
  const cached = rowDataCache.get(csvRow);
  if (cached !== undefined && cached[ROW_IDX_KEY] === rowIndexLabel) {
    return cached;
  }
  const rowData: RowData = {
    [ROW_IDX_KEY]: rowIndexLabel,
    [ROW_ID_KEY]: getRowId(csvRow),
  };
  csvRow.forEach((cell, colIndex) => {
    rowData[`col${colIndex}`] = cell;
  });
  rowDataCache.set(csvRow, rowData);
  return rowData;
}

/** CSV全体(ヘッダー行を含む)から行データの配列を生成する */
export function buildRowData(
  csvArray: ReadonlyArray<readonly string[]>,
  isIgnoreHeaderRow: boolean
): RowData[] {
  if (csvArray.length === 0) {
    return [];
  }
  const startIndex = isIgnoreHeaderRow ? 0 : 1;
  return csvArray.slice(startIndex).map((row, index) => toRowData(row, index));
}
