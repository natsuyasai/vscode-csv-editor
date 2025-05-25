import { useState } from "react";

export function useUpdateCsvArray(
  csvArray: Array<Array<string>>,
  setCSVArray: (csv: Array<Array<string>>) => void,
  isIgnoreHeaderRow: boolean
) {
  const [history, setHistory] = useState<Array<Array<Array<string>>>>([]);
  const [poppedHistory, setPoppedHistory] = useState<Array<Array<Array<string>>>>([]);

  function undo() {
    const lastItem = history.slice(-1)[0];
    const newHistroy = history.slice(0, -1);
    if (lastItem) {
      setPoppedHistory([...poppedHistory, csvArray]);
      setCSVArray(lastItem);
      setHistory(newHistroy);
    }
  }

  function redo() {
    const lastItem = poppedHistory.slice(-1)[0];
    const newHistroy = poppedHistory.slice(0, -1);
    if (lastItem) {
      setCSVArrayAndPushHistory(lastItem);
      setPoppedHistory(newHistroy);
    }
  }

  function setCSVArrayAndPushHistory(newArray: Array<Array<string>>) {
    setHistory([...history, csvArray]);
    setCSVArray(newArray);
  }

  function insertRow(insertRowIdx: number) {
    const newRow = csvArray[0].map(() => "");
    if (insertRowIdx >= csvArray.length - 1) {
      setCSVArrayAndPushHistory([...csvArray, newRow]);
      return;
    }
    const reducer = (acc: string[][], row: string[], index: number) => {
      if (index === insertRowIdx) {
        acc.push(newRow);
      }
      acc.push(row);
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

  function insertCol(insertColIdx: number) {
    if (csvArray.length === 0) {
      return;
    }
    const updatedCSVArray = csvArray.map((row, rowIdx) => {
      const newRow = [...row];
      newRow.splice(insertColIdx, 0, rowIdx === 0 ? "new column" : "");
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
    if (isIgnoreHeaderRow) {
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

  return { insertRow, deleteRow, updateRow, insertCol, deleteCol, updateCol, undo, redo };
}
