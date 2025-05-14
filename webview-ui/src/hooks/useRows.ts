import { useState, useEffect } from "react";

export function useRows(csvArray: Array<Array<string>>) {
  const [rows, setRows] = useState((): Record<string, string>[] => createRows(csvArray));

  useEffect(() => {
    setRows(createRows(csvArray));
  }, [csvArray]);

  function createRows(csvArray: Array<Array<string>>): Record<string, string>[] {
    if (csvArray.length === 0) {
      return [];
    }
    return csvArray.slice(1).map((row) =>
      row.reduce(
        (acc, cell, colIndex) => {
          acc[`col${colIndex}`] = cell;
          return acc;
        },
        {} as Record<string, string>
      )
    );
  }

  return { rows, setRows };
}
