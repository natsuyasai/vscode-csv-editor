import { FC, useEffect, useState } from "react";
import styles from "./EditableTableRoot.module.scss";
import { DataGrid, type Column } from "react-data-grid";

interface Props {
  csvArray: Array<Array<string>>;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({ csvArray, setCSVArray }) => {
  function createColumns(): Column<Record<string, string>>[] {
    if (csvArray.length === 0) {
      return [];
    }
    const array =
      csvArray[0]?.map((header, index) => ({
        key: `col${index}`,
        name: header,
        editable: true,
      })) || [];
    return array;
  }

  function createRows(): Record<string, string>[] {
    if (csvArray.length === 0) {
      return [];
    }
    const array = csvArray.slice(1).map((row, rowIndex) =>
      row.reduce(
        (acc, cell, colIndex) => {
          acc[`col${colIndex}`] = cell;
          return acc;
        },
        {} as Record<string, string>
      )
    );
    return array;
  }

  return (
    <>
      <div className={styles.root}>
        <DataGrid
          columns={createColumns()}
          rows={createRows()}
          rowKeyGetter={(row) => row.col0}
          onRowsChange={(updatedRows) => {
            const updatedCSVArray = [
              csvArray[0],
              ...updatedRows.map((row) =>
                csvArray[0].map((_, colIndex) => row[`col${colIndex}`] || "")
              ),
            ];
            setCSVArray(updatedCSVArray);
          }}
        />
      </div>
    </>
  );
};
