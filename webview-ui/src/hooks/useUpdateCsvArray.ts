import { useHistory } from "./useHistory";

const NEW_COLUMN_HEADER = "new column";

export function useUpdateCsvArray(
  csvArray: Array<Array<string>>,
  setCSVArray: (csv: Array<Array<string>>) => void,
  isIgnoreHeaderRow: boolean
) {
  const {
    setDataAndPushHistory,
    undo: undoHistory,
    redo: redoHistory,
    isEnabledUndo,
    isEnabledRedo,
  } = useHistory(setCSVArray);

  function undo() {
    undoHistory(csvArray);
  }

  function redo() {
    redoHistory(csvArray);
  }

  function setCSVArrayAndPushHistory(newArray: Array<Array<string>>) {
    setDataAndPushHistory(newArray, csvArray);
  }

  /** 行も列も存在しない状態（空ファイル） */
  function isEmptyCsv() {
    return csvArray.length === 0 || csvArray[0].length === 0;
  }

  function insertRow(insertRowIdx: number) {
    if (isEmptyCsv()) {
      // 空ファイルは1列のCSVとして作成する（ヘッダー有効時はヘッダー行も作る）
      setCSVArrayAndPushHistory(isIgnoreHeaderRow ? [[""]] : [[NEW_COLUMN_HEADER], [""]]);
      return;
    }
    const newRow = csvArray[0].map(() => "");
    // insertRowIdx はデータ行(ヘッダー行を除く)の位置。範囲外は先頭/末尾に丸める
    const headerOffset = isIgnoreHeaderRow ? 0 : 1;
    const dataRowCount = csvArray.length - headerOffset;
    const position = Math.min(Math.max(insertRowIdx, 0), dataRowCount) + headerOffset;
    const updatedCSVArray = [...csvArray];
    updatedCSVArray.splice(position, 0, newRow);
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function deleteRow(deleteRowIdx: number) {
    const reducer = (acc: string[][], row: string[], index: number) => {
      if (index !== deleteRowIdx) {
        acc.push(row);
      }
      return acc;
    };
    if (isIgnoreHeaderRow) {
      const updatedCSVArray = [...csvArray.reduce(reducer, [] as Array<Array<string>>)];
      setCSVArrayAndPushHistory(updatedCSVArray);
    } else {
      const updatedCSVArray = [
        csvArray[0],
        ...csvArray.slice(1).reduce(reducer, [] as Array<Array<string>>),
      ];
      setCSVArrayAndPushHistory(updatedCSVArray);
    }
  }

  function updateRow(updatedRows: Array<Record<string, string>>) {
    if (isIgnoreHeaderRow) {
      const updatedCSVArray = [
        ...updatedRows.map((row) => csvArray[0].map((_, colIndex) => row[`col${colIndex}`] || "")),
      ];
      setCSVArrayAndPushHistory(updatedCSVArray);
    } else {
      const updatedCSVArray = [
        csvArray[0],
        ...updatedRows.map((row) => csvArray[0].map((_, colIndex) => row[`col${colIndex}`] || "")),
      ];
      setCSVArrayAndPushHistory(updatedCSVArray);
    }
  }

  function updateCell(rowIdx: number, colIdx: number, text: string) {
    if (csvArray.length === 0) {
      return;
    }
    let correctionRowIdx = rowIdx;
    if (!isIgnoreHeaderRow) {
      correctionRowIdx += 1;
    }
    const updatedCSVArray = csvArray.map((row, idx) => {
      const newRow = [...row];
      if (idx === correctionRowIdx) {
        newRow[colIdx] = text;
      }
      return newRow;
    });
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function insertCol(insertColIdx: number) {
    if (isEmptyCsv()) {
      setCSVArrayAndPushHistory(isIgnoreHeaderRow ? [[""]] : [[NEW_COLUMN_HEADER]]);
      return;
    }
    const updatedCSVArray = csvArray.map((row, rowIdx) => {
      const newRow = [...row];
      const isHeaderRow = !isIgnoreHeaderRow && rowIdx === 0;
      newRow.splice(insertColIdx, 0, isHeaderRow ? NEW_COLUMN_HEADER : "");
      return newRow;
    });
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function deleteCol(deleteColIdx: number) {
    if (csvArray.length === 0) {
      return;
    }
    const updatedCSVArray = csvArray.map((row) => {
      const newRow = [...row];
      newRow.splice(deleteColIdx, 1);
      return newRow;
    });
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function updateCol(idx: number, text: string) {
    if (csvArray.length === 0) {
      return;
    }
    const updatedCSVArray = csvArray.map((row, rowIdx) => {
      const newRow = [...row];
      if (rowIdx === 0) {
        newRow[idx] = text;
      }
      return newRow;
    });
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function moveColumns(sourceIdx: number, targetIdx: number) {
    const newCsvArray = csvArray.map((row) => {
      const newRow = [...row];
      const [movedCell] = newRow.splice(sourceIdx, 1);
      newRow.splice(targetIdx, 0, movedCell);
      return newRow;
    });

    setCSVArrayAndPushHistory(newCsvArray);
  }

  function moveRows(sourceIdx: number, targetIdx: number) {
    // ヘッダー行を無視する場合、インデックス調整
    // sourceIdxとtargetIdxは実データの1行目を0としてくる
    // そのためヘッダー表示がある場合はcsvArrayの2要素目を0としてやってくるため補正が必要
    const correctionSourceIdx = isIgnoreHeaderRow ? sourceIdx : sourceIdx + 1;
    const correctionTargetIdx = isIgnoreHeaderRow ? targetIdx : targetIdx + 1;
    const offset = isIgnoreHeaderRow ? 0 : 1;
    const maxIdx = csvArray.length - 1;
    if (
      correctionSourceIdx < offset ||
      correctionTargetIdx < offset ||
      correctionSourceIdx > maxIdx ||
      correctionTargetIdx > maxIdx ||
      correctionSourceIdx === correctionTargetIdx
    ) {
      return;
    }
    const movingRow = csvArray[correctionSourceIdx];
    const newCsvArray = csvArray.filter((_, idx) => idx !== correctionSourceIdx);
    newCsvArray.splice(correctionTargetIdx, 0, movingRow);
    setCSVArrayAndPushHistory(newCsvArray);
  }

  function updateCells(cells: Array<{ rowIdx: number; colIdx: number; value: string }>) {
    if (csvArray.length === 0 || cells.length === 0) {
      return;
    }

    const updatedCSVArray = csvArray.map((row) => [...row]);

    cells.forEach(({ rowIdx, colIdx, value }) => {
      let correctionRowIdx = rowIdx;
      if (!isIgnoreHeaderRow) {
        correctionRowIdx += 1;
      }
      if (correctionRowIdx >= 0 && correctionRowIdx < updatedCSVArray.length) {
        updatedCSVArray[correctionRowIdx][colIdx] = value;
      }
    });

    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  return {
    insertRow,
    deleteRow,
    updateRow,
    insertCol,
    deleteCol,
    updateCol,
    updateCell,
    updateCells,
    moveColumns,
    moveRows,
    undo,
    redo,
    isEnabledUndo,
    isEnabledRedo,
  };
}
