import { useState, useEffect } from "react";
import { Column } from "react-data-grid";
import TextAreaEditor from "@/components/TextAreaEditor";

export function useColumns(csvArray: Array<Array<string>>) {
  const [columns, setColumns] = useState((): Column<Record<string, string>>[] =>
    createColumns(csvArray)
  );

  useEffect(() => {
    setColumns(createColumns(csvArray));
  }, [csvArray]);

  function createColumns(csvArray: Array<Array<string>>): Column<Record<string, string>>[] {
    if (csvArray.length === 0) {
      return [];
    }
    return (
      csvArray[0]?.map((header, index) => ({
        key: `col${index}`,
        name: header,
        resizeable: true,
        renderEditCell: TextAreaEditor,
      })) || []
    );
  }

  return { columns, setColumns };
}
