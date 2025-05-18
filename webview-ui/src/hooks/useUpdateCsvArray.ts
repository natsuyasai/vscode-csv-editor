import { useState } from "react";

export function useUpdateCsvArray(
  csvArray: Array<Array<string>>,
  setCSVArray: (csv: Array<Array<string>>) => void
) {
  const [history, setHistory] = useState<Array<Array<Array<string>>>>([]);
  const [poppedHistory, setPoppedHistory] = useState<Array<Array<Array<string>>>>([]);

  function undo() {
    const lastItem = history.pop();
    if (lastItem) {
      setPoppedHistory([...history, csvArray]);
      setCSVArray(lastItem);
      setHistory(history);
    }
  }

  function redo() {
    const lastItem = poppedHistory.pop();
    if (lastItem) {
      setCSVArrayAndPushHistory(lastItem);
      setPoppedHistory(history);
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
    const updatedCSVArray = [
      csvArray[0],
      ...csvArray.slice(1).reduce(
        (acc, row, index) => {
          if (index === insertRowIdx) {
            acc.push(newRow);
          }
          acc.push(row);
          return acc;
        },
        [] as Array<Array<string>>
      ),
    ];
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function deleteRow(deleteRowIdx: number) {
    const updatedCSVArray = [
      csvArray[0],
      ...csvArray.slice(1).reduce(
        (acc, row, index) => {
          if (index !== deleteRowIdx) {
            acc.push(row);
          }
          return acc;
        },
        [] as Array<Array<string>>
      ),
    ];
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  function updateRow(updatedRows: Array<Record<string, string>>) {
    const updatedCSVArray = [
      csvArray[0],
      ...updatedRows.map((row) => csvArray[0].map((_, colIndex) => row[`col${colIndex}`] || "")),
    ];
    setCSVArrayAndPushHistory(updatedCSVArray);
  }

  return { insertRow, deleteRow, updateRow, undo, redo };
}
