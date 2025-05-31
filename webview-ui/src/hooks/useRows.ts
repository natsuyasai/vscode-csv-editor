import { ROW_IDX_KEY } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { SortColumn } from "react-data-grid";

const empty: Record<string, string>[] = [];
export function useRows(csvArray: Array<Array<string>>, isIgnoreHeaderRow: boolean) {
  const createRows = useCallback(
    (csvArray: Array<Array<string>>): Record<string, string>[] => {
      if (csvArray.length === 0) {
        return empty;
      }
      const startIndex = isIgnoreHeaderRow ? 0 : 1;
      return (
        csvArray.slice(startIndex).map((row, index) =>
          row.reduce(
            (acc, cell, colIndex) => {
              acc[`col${colIndex}`] = cell;
              return acc;
            },
            {
              [ROW_IDX_KEY]: (index + 1).toString(),
            } as Record<string, string>
          )
        ) || empty
      );
    },
    [isIgnoreHeaderRow]
  );

  const rows = useMemo(() => createRows(csvArray), [csvArray, createRows]);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  const sortedRows = useMemo((): Record<string, string>[] => {
    if (sortColumns.length === 0) {
      return rows;
    }

    return rows
      .toSorted((a, b) => {
        for (const sort of sortColumns) {
          const compResult = a[sort.columnKey].localeCompare(b[sort.columnKey]);
          if (compResult !== 0) {
            return sort.direction === "ASC" ? compResult : -compResult;
          }
        }
        return 0;
      })
      .map((row, index) => ({ ...row, [ROW_IDX_KEY]: (index + 1).toString() }));
  }, [rows, sortColumns]);

  return { rows, sortedRows, sortColumns, setSortColumns };
}
