import { useMemo } from "react";

export function useRows(csvArray: Array<Array<string>>, isIgnoreHeaderRow: boolean) {
  const empty: Record<string, string>[] = [];
  const rows = useMemo(() => createRows(csvArray), [csvArray]);

  function createRows(csvArray: Array<Array<string>>): Record<string, string>[] {
    if (csvArray.length === 0) {
      return empty;
    }
    const startIndex = isIgnoreHeaderRow ? 0 : 1;
    return (
      csvArray.slice(startIndex).map((row) =>
        row.reduce(
          (acc, cell, colIndex) => {
            acc[`col${colIndex}`] = cell;
            return acc;
          },
          {} as Record<string, string>
        )
      ) || empty
    );
  }

  return { rows };
}
