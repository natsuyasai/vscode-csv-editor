import { useCallback, useMemo } from "react";
import { Column } from "react-data-grid";
import TextAreaEditor from "@/components/Row/TextAreaEditor";
import { ROW_IDX_COL } from "@/types";
import { useColumnAlignmentStore } from "@/stores/useColumnAlignmentStore";

const empty: Column<Record<string, string>>[] = [];
export function useColumns(csvArray: Array<Array<string>>, isIgnoreHeaderRow: boolean) {
  const columnAlignments = useColumnAlignmentStore((state) => state.columnAlignments);
  const getColumnAlignment = useColumnAlignmentStore((state) => state.getColumnAlignment);
  const createColumns = useCallback(
    (
      csvArray: Array<Array<string>>,
      isIgnoreHeaderRow: boolean
    ): Column<Record<string, string>>[] => {
      if (csvArray.length === 0) {
        return empty;
      }
      if (csvArray[0].length === 0) {
        return empty;
      }
      return [
        ROW_IDX_COL,
        ...csvArray[0].map((header, index) => {
          const columnKey = `col${index}`;
          const alignment = getColumnAlignment(columnKey);
          return {
            key: columnKey,
            name: isIgnoreHeaderRow ? "" : header,
            resizable: true,
            renderEditCell: TextAreaEditor,
            cellClass: `cell-align-v-${alignment.vertical} cell-align-h-${alignment.horizontal}`,
          };
        }),
      ];
    },
    [getColumnAlignment]
  );

  const columns = useMemo(
    () => createColumns(csvArray, isIgnoreHeaderRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [csvArray, isIgnoreHeaderRow, createColumns, columnAlignments]
  );

  return { columns };
}
