import { useCellCopy } from "@/hooks/useCellCopy";
import { useColumns } from "@/hooks/useColumns";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useDirection } from "@/hooks/useDirection";
import { useRows } from "@/hooks/useRows";
import { VscodeContextMenu } from "@vscode-elements/react-elements";
import { FC } from "react";
import { DataGrid, FillEvent } from "react-data-grid";
import { createPortal } from "react-dom";
import styles from "./EditableTableRoot.module.scss";

interface Props {
  csvArray: Array<Array<string>>;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({ csvArray, setCSVArray }) => {
  const direction = useDirection();
  const { rows, setRows } = useRows(csvArray);
  const { columns } = useColumns(csvArray);
  const { contextMenuProps, setContextMenuProps, menuRef, isContextMenuOpen } = useContextMenu();
  const { handleCellCopy } = useCellCopy();

  function insertRow(insertRowIdx: number) {
    const newRow = csvArray[0].map(() => "");
    if (insertRowIdx >= csvArray.length - 1) {
      setCSVArray([...csvArray, newRow]);
      return;
    }
    const updatedCSVArray = [
      csvArray[0],
      ...csvArray.slice(1).reduce(
        (acc, row, index) => {
          if (index === insertRowIdx) {
            acc.push(newRow);
          }
          acc.push(row);
          return acc;
        },
        [] as Array<Array<string>>
      ),
    ];
    setCSVArray(updatedCSVArray);
  }

  return (
    <div className={styles.root}>
      <DataGrid
        className={styles.dataGrid}
        columns={columns}
        rows={rows}
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
        onFill={({ columnKey, sourceRow, targetRow }: FillEvent<Record<string, string>>) => {
          return {
            ...targetRow,
            [columnKey]: sourceRow[columnKey as keyof Record<string, string>],
          };
        }}
        onCellCopy={handleCellCopy}
        direction={direction}
        onCellContextMenu={({ row }, event) => {
          event.preventGridDefault();
          event.preventDefault();
          setContextMenuProps({
            rowIdx: rows.indexOf(row),
            top: event.clientY,
            left: event.clientX,
          });
        }}
      />
      {isContextMenuOpen &&
        createPortal(
          <VscodeContextMenu
            ref={menuRef}
            show={isContextMenuOpen}
            className={styles.contextMenu}
            data={[
              {
                label: "Delete Row",
                keybinding: "Ctrl+Shift+D",
                value: "deleteRow",
                tabindex: 0,
              },
              {
                label: "Insert Row Above",
                keybinding: "Ctrl+Shift+I",
                value: "insertRowAbove",
                tabindex: 1,
              },
              {
                label: "Insert Row Below",
                keybinding: "Ctrl+Shift+B",
                value: "insertRowBelow",
                tabindex: 2,
              },
            ]}
            onVscContextMenuSelect={(item) => {
              if (contextMenuProps === null) {
                return;
              }
              if (item.detail.value === "deleteRow") {
                setRows(rows.toSpliced(contextMenuProps.rowIdx, 1));
              } else if (item.detail.value === "insertRowAbove") {
                insertRow(contextMenuProps.rowIdx);
              } else if (item.detail.value === "insertRowBelow") {
                insertRow(contextMenuProps.rowIdx + 1);
              }
              setContextMenuProps(null);
            }}
            style={{
              top: contextMenuProps?.top,
              left: contextMenuProps?.left,
            }}></VscodeContextMenu>,
          document.body
        )}
    </div>
  );
};
