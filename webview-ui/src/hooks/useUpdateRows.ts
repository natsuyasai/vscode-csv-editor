export function useUpdateRows(
  csvArray: Array<Array<string>>,
  setCSVArray: (csv: Array<Array<string>>) => void
) {
  function insertRow(insertRowIdx: number) {
    const newRow = csvArray[0].map(() => "");
    if (insertRowIdx >= csvArray.length - 1) {
      setCSVArray([...csvArray, newRow]);
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
    setCSVArray(updatedCSVArray);
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
    setCSVArray(updatedCSVArray);
  }

  function updateRow(updatedRows: Array<Record<string, string>>) {
    const updatedCSVArray = [
      csvArray[0],
      ...updatedRows.map((row) => csvArray[0].map((_, colIndex) => row[`col${colIndex}`] || "")),
    ];
    setCSVArray(updatedCSVArray);
  }

  return { insertRow, deleteRow, updateRow };
}
