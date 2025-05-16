import { FC } from "react";
import styles from "./EditableTableRoot.module.scss";
import {
  CellClickArgs,
  CellKeyboardEvent,
  CellKeyDownArgs,
  CellMouseEvent,
  DataGrid,
  FillEvent,
} from "react-data-grid";
import { useDirection } from "@/hooks/useDirection";
import { createPortal } from "react-dom";
import { useRows } from "@/hooks/useRows";
import { useColumns } from "@/hooks/useColumns";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useCellCopy } from "@/hooks/useCellCopy";
import { ContextMenu } from "./ContextMenu";
import { useUpdateRows } from "@/hooks/useUpdateRows";

interface Props {
  csvArray: Array<Array<string>>;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({ csvArray, setCSVArray }) => {
  const direction = useDirection();
  const { rows } = useRows(csvArray);
  const { columns } = useColumns(csvArray);
  const { contextMenuProps, setContextMenuProps, menuRef, isContextMenuOpen } = useContextMenu();
  const { handleCellCopy } = useCellCopy();
  const { insertRow, deleteRow, updateRow } = useUpdateRows(csvArray, setCSVArray);

  function handleSelectContextMenu(value: string) {
    if (contextMenuProps === null) {
      return;
    }

    if (value === "deleteRow") {
      deleteRow(contextMenuProps.rowIdx);
    } else if (value === "insertRowAbove") {
      insertRow(contextMenuProps.rowIdx);
    } else if (value === "insertRowBelow") {
      insertRow(contextMenuProps.rowIdx + 1);
    }
  }

  function handleCellContextMenu(
    args: CellClickArgs<NoInfer<Record<string, string>>, unknown>,
    event: CellMouseEvent
  ) {
    event.preventGridDefault();
    event.preventDefault();
    setContextMenuProps({
      rowIdx: rows.indexOf(args.row),
      top: event.clientY,
      left: event.clientX,
    });
  }

  function handleFill(event: FillEvent<NoInfer<Record<string, string>>>) {
    return {
      ...event.targetRow,
      [event.columnKey]: event.sourceRow[event.columnKey as keyof Record<string, string>],
    };
  }

  function handleKeyDown(
    args: CellKeyDownArgs<NoInfer<Record<string, string>>, unknown>,
    e: CellKeyboardEvent
  ) {
    if (e.key === "D" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      deleteRow(args.rowIdx);
      return;
    }
    if (e.key === "I" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertRow(args.rowIdx);
      return;
    }
    if (e.key === "B" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertRow(args.rowIdx + 1);
      return;
    }
  }

  return (
    <>
      <DataGrid
        className={styles.dataGrid}
        enableVirtualization={true}
        columns={columns}
        rows={rows}
        rowKeyGetter={(row) => row.col0}
        onRowsChange={updateRow}
        onFill={handleFill}
        onCellCopy={handleCellCopy}
        direction={direction}
        onCellContextMenu={handleCellContextMenu}
        onCellKeyDown={handleKeyDown}
      />
      {isContextMenuOpen &&
        createPortal(
          <ContextMenu
            isContextMenuOpen={isContextMenuOpen}
            menuRef={menuRef}
            contextMenuProps={contextMenuProps}
            className={styles.contextMenu}
            onSelect={handleSelectContextMenu}
            onClose={() => setContextMenuProps(null)}
          />,
          document.body
        )}
    </>
  );
};
