import { FC, useEffect, useState } from "react";
import styles from "./EditableTable.module.scss";
import {
  VscodeTable,
  VscodeTableHeaderCell,
  VscodeTableHeader,
  VscodeTableBody,
  VscodeTableRow,
  VscodeTableCell,
  VscodeTextarea,
} from "@vscode-elements/react-elements";
import { JsonRecords } from "@/hooks/useJsonToViewObject";

interface Props {
  tableTitle: string;
  tableItems: JsonRecords;
  setTableItems: (jsonObject: JsonRecords) => void;
}

export const EditableTable: FC<Props> = ({ tableTitle, tableItems, setTableItems }) => {
  function handleInput(event: Event) {
    console.log(event);
  }
  function handleUpdated(event: Event, rowIndex: number, cellKey: string) {
    const target = event.target as HTMLTextAreaElement;
    const newValue = target.value;
    const updatedTableItems = [...tableItems.record];
    updatedTableItems[rowIndex][cellKey].value = newValue;
    setTableItems({ type: tableItems.type, record: updatedTableItems });
  }

  return (
    <>
      <div key={tableTitle}>
        <h2 className={styles.title}>{tableTitle}</h2>
        <div className={styles.tableRoot}>
          <VscodeTable zebra bordered-rows resizable>
            <VscodeTableHeader slot="header">
              {Object.keys(tableItems.record?.[0] ?? []).map((headerKey) => {
                return (
                  <VscodeTableHeaderCell
                    key={headerKey}
                    className={[styles.cell, styles.headerCell].join(" ")}>
                    {headerKey}
                  </VscodeTableHeaderCell>
                );
              })}
            </VscodeTableHeader>
            <VscodeTableBody slot="body">
              {tableItems.record.map((row, rowIndex) => (
                <VscodeTableRow key={rowIndex}>
                  {Object.keys(row).map((cellKey, cellIndex) => (
                    <VscodeTableCell key={cellIndex} className={styles.cell}>
                      <VscodeTextarea
                        className={styles.textArea}
                        resize="both"
                        value={row[cellKey].value?.toString()}
                        onInput={handleInput}
                        onChange={(e) => {
                          handleUpdated(e, rowIndex, cellKey);
                        }}></VscodeTextarea>
                    </VscodeTableCell>
                  ))}
                </VscodeTableRow>
              ))}
            </VscodeTableBody>
          </VscodeTable>
        </div>
      </div>
    </>
  );
};
