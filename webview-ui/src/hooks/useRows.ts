import { useMemo, useState } from "react";
import { SortColumn } from "react-data-grid";

export function useRows(csvArray: Array<Array<string>>, isIgnoreHeaderRow: boolean) {
  const empty: Record<string, string>[] = [];
  const rows = useMemo(() => createRows(csvArray), [csvArray, isIgnoreHeaderRow]);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  const sortedRows = useMemo((): Record<string, string>[] => {
    if (sortColumns.length === 0) return rows;

    return rows.toSorted((a, b) => {
      for (const sort of sortColumns) {
        const compResult = a[sort.columnKey].localeCompare(b[sort.columnKey]);
        if (compResult !== 0) {
          return sort.direction === "ASC" ? compResult : -compResult;
        }
      }
      return 0;
    });
  }, [rows, sortColumns]);

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

  return { rows, sortedRows, sortColumns, setSortColumns };
}
