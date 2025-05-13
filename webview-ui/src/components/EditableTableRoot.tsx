import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./EditableTableRoot.module.scss";
import { DataGrid, type Column, textEditor, FillEvent, CellPasteEvent } from "react-data-grid";
import { useDirection } from "@/hooks/useDirection";
import { createPortal } from "react-dom";
import { VscodeContextMenu, VscodeContextMenuItem } from "@vscode-elements/react-elements";

interface Props {
  csvArray: Array<Array<string>>;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({ csvArray, setCSVArray }) => {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<string> => new Set());
  const [copiedCell, setCopiedCell] = useState<{
    readonly row: Record<string, string>;
    readonly column: Column<Record<string, string>>;
  } | null>(null);

  const direction = useDirection();

  const [rows, setRows] = useState((): Record<string, string>[] => createRows());
  useEffect(() => {
    setRows(createRows());
  }, [csvArray]);

  const [columns, setColumns] = useState((): Column<Record<string, string>>[] => createColumns());
  useEffect(() => {
    setColumns(createColumns());
  }, [csvArray]);

  function createColumns(): Column<Record<string, string>>[] {
    if (csvArray.length === 0) {
      return [];
    }
    const array =
      csvArray[0]?.map((header, index) => ({
        key: `col${index}`,
        name: header,
        resizeable: true,
        renderEditCell: textEditor,
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

  function handleCellCopy(
    { row, column }: { row: Record<string, string>; column: Column<Record<string, string>> },
    event: React.ClipboardEvent<HTMLDivElement>
  ): void {
    // copy highlighted text only
    if (window.getSelection()?.isCollapsed === false) {
      setCopiedCell(null);
      return;
    }

    setCopiedCell({ row, column });
    event.clipboardData.setData("text/plain", row[column.key as string] || "");
    event.preventDefault();
  }

  const [contextMenuProps, setContextMenuProps] = useState<{
    rowIdx: number;
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<any>(null);
  const isContextMenuOpen = contextMenuProps !== null;

  useLayoutEffect(() => {
    if (!isContextMenuOpen) return;

    function onMouseDown(event: MouseEvent) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      // setContextMenuProps(null);
    }

    addEventListener("mousedown", onMouseDown);

    return () => {
      removeEventListener("mousedown", onMouseDown);
    };
  }, [isContextMenuOpen]);

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
    <>
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
            // Do not show the default context menu
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
                top: contextMenuProps.top,
                left: contextMenuProps.left,
              }}></VscodeContextMenu>,
            document.body
          )}
      </div>
    </>
  );
};
