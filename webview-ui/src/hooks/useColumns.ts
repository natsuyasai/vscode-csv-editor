import { useMemo } from "react";
import { Column } from "react-data-grid";
import TextAreaEditor from "@/components/Row/TextAreaEditor";

export function useColumns(csvArray: Array<Array<string>>, isIgnoreHeaderRow: boolean) {
  const empty: Column<Record<string, string>>[] = [];
  const columns = useMemo(
    () => createColumns(csvArray, isIgnoreHeaderRow),
    [csvArray, isIgnoreHeaderRow]
  );

  function createColumns(
    csvArray: Array<Array<string>>,
    isIgnoreHeaderRow: boolean
  ): Column<Record<string, string>>[] {
    if (csvArray.length === 0) {
      return empty;
    }
    return (
      csvArray[0]?.map((header, index) => ({
        key: `col${index}`,
        name: isIgnoreHeaderRow ? "" : header,
        resizable: true,
        renderEditCell: TextAreaEditor,
      })) || empty
    );
  }
  return { columns };
}
