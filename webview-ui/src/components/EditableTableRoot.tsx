import { FC, useEffect, useState } from "react";
import styles from "./EditableTableRoot.module.scss";
import { DataGrid, type Column } from "react-data-grid";

interface Props {
  csvArray: Array<Array<string>>;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({ csvArray, setCSVArray }) => {
  return (
    <>
      <div className={styles.root}>
        <DataGrid
          columns={csvArray[0]?.map((header, index) => ({ key: `col${index}`, name: header }))}
          rows={csvArray.slice(1).map((row, rowIndex) =>
            row.reduce(
              (acc, cell, colIndex) => {
                acc[`col${colIndex}`] = cell;
                return acc;
              },
              {} as Record<string, string>
            )
          )}
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
