import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./EditableTableRoot.module.scss";
import {
  CalculatedColumn,
  CellClickArgs,
  CellKeyboardEvent,
  CellKeyDownArgs,
  CellMouseEvent,
  DataGrid,
  FillEvent,
  RenderHeaderCellProps,
} from "react-data-grid";
import { useDirection } from "@/hooks/useDirection";
import { createPortal } from "react-dom";
import { useRows } from "@/hooks/useRows";
import { useColumns } from "@/hooks/useColumns";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useCellCopy } from "@/hooks/useCellCopy";
import { RowContextMenu } from "./RowContextMenu";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { RowSizeType } from "@/types";
import { CustomHeaderCell } from "./CustomHeaderCell";
import { HeaderCelContextMenu } from "./HeaderCelContextMenu";
import { CustomCell } from "./CustomCell";
import { CustomRow } from "./CustomRow";

interface Props {
  csvArray: Array<Array<string>>;
  isIgnoreHeaderRow: boolean;
  rowSize: RowSizeType;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTableRoot: FC<Props> = ({
  csvArray,
  isIgnoreHeaderRow,
  rowSize,
  setCSVArray,
}) => {
  const direction = useDirection();
  const { rows } = useRows(csvArray, isIgnoreHeaderRow);
  const { columns } = useColumns(csvArray, isIgnoreHeaderRow);
  const {
    contextMenuProps: rowContextMenuProps,
    setContextMenuProps: setRowContextMenuProps,
    menuRef: rowMenuRef,
    isContextMenuOpen: isRowContextMenuOpen,
  } = useContextMenu();
  const {
    contextMenuProps: headerContextMenuProps,
    setContextMenuProps: setHeaderContextMenuProps,
    menuRef: headerMenuRef,
    isContextMenuOpen: isHeaderContextMenuOpen,
  } = useContextMenu();
  const { handleCellCopy } = useCellCopy();
  const { insertRow, deleteRow, updateRow, insertCol, deleteCol, updateCol, undo, redo } =
    useUpdateCsvArray(csvArray, setCSVArray, isIgnoreHeaderRow);

  function handleSelectRowContextMenu(value: string) {
    if (rowContextMenuProps === null) {
      return;
    }

    if (value === "deleteRow") {
      deleteRow(rowContextMenuProps.itemIdx);
    } else if (value === "insertRowAbove") {
      insertRow(rowContextMenuProps.itemIdx);
    } else if (value === "insertRowBelow") {
      insertRow(rowContextMenuProps.itemIdx + 1);
    }
  }

  function handleSelectHeaderContextMenu(value: string) {
    if (headerContextMenuProps === null) {
      return;
    }

    if (value === "deleteHeaderCel") {
      deleteCol(headerContextMenuProps.itemIdx);
    } else if (value === "insertHeaderCelLeft") {
      insertCol(headerContextMenuProps.itemIdx);
    } else if (value === "insertHeaderCelRight") {
      insertCol(headerContextMenuProps.itemIdx + 1);
    }
  }

  function handleCellContextMenu(
    args: CellClickArgs<NoInfer<Record<string, string>>, unknown>,
    event: CellMouseEvent
  ) {
    event.preventGridDefault();
    event.preventDefault();
    setRowContextMenuProps({
      itemIdx: rows.indexOf(args.row),
      top: event.clientY,
      left: event.clientX,
    });
  }

  function handleHeaderCellContextMenu(
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: MouseEvent
  ) {
    e.preventDefault();
    setHeaderContextMenuProps({
      itemIdx: cell.idx,
      top: e.clientY,
      left: e.clientX,
    });
  }

  function handleHeaderEdit(cellIdx: number, updateText: string) {
    updateCol(cellIdx, updateText);
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
    const key = e.key.toUpperCase();
    if (key === "D" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      deleteRow(args.rowIdx);
      return;
    }
    if (key === "I" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertRow(args.rowIdx);
      return;
    }
    if (key === "B" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertRow(args.rowIdx + 1);
      return;
    }
  }

  function handleKeyDownHeaderCell(
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: KeyboardEvent
  ) {
    const key = e.key.toUpperCase();
    if (key === "D" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      deleteCol(cell.idx);
      return;
    }
    if (key === "L" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertCol(cell.idx);
      return;
    }
    if (key === "R" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      insertCol(cell.idx + 1);
      return;
    }
  }

  function handleKeyDownForDocument(e: KeyboardEvent) {
    const key = e.key.toUpperCase();
    if (key === "Z" && e.ctrlKey) {
      e.stopPropagation();
      undo();
      return;
    }
    if (key === "Y" && e.ctrlKey) {
      e.stopPropagation();
      redo();
      return;
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDownForDocument);

    return () => {
      window.removeEventListener("keydown", handleKeyDownForDocument);
    };
  }, [handleKeyDownForDocument]);

  const rowHeight = useMemo(() => {
    switch (rowSize) {
      case "small":
        return 24;
      case "normal":
        return 40;
      case "large":
        return 80;
      case "extra large":
        return 120;
      default:
        return 40;
    }
  }, [rowSize]);

  // const [rowHeight, setRowHeight] = useState(40);

  // function handleUpdateRowHeight(rowIdx: number, height: number) {
  //   setRowHeight(height);
  // }

  return (
    <>
      <DataGrid
        className={styles.dataGrid}
        enableVirtualization={true}
        columns={columns}
        rows={rows}
        rowHeight={rowHeight}
        rowKeyGetter={(row) => crypto.randomUUID()}
        onRowsChange={updateRow}
        onFill={handleFill}
        onCellCopy={handleCellCopy}
        direction={direction}
        onCellContextMenu={handleCellContextMenu}
        onCellKeyDown={handleKeyDown}
        renderers={{
          // renderRow: (key, props) =>
          //   CustomRow({
          //     ...props,
          //     rowKey: key,
          //     onUpdateRowHeight: () => {},
          //   }) as ReactNode,
          renderCell: (key, props) =>
            CustomCell({
              ...props,
              rowKey: key,
              onUpdateRowHeight: () => {},
            }) as ReactNode,
        }}
        defaultColumnOptions={{
          renderHeaderCell: (props) =>
            CustomHeaderCell({
              ...props,
              isIgnoreHeaderRow,
              onHeaderCellContextMenu: handleHeaderCellContextMenu,
              onHeaderEdit: handleHeaderEdit,
              onKeyDown: handleKeyDownHeaderCell,
            }) as ReactNode,
        }}
      />
      {isRowContextMenuOpen &&
        createPortal(
          <RowContextMenu
            isContextMenuOpen={isRowContextMenuOpen}
            menuRef={rowMenuRef}
            contextMenuProps={rowContextMenuProps}
            className={styles.contextMenu}
            onSelect={handleSelectRowContextMenu}
            onClose={() => setRowContextMenuProps(null)}
          />,
          document.body
        )}
      {isHeaderContextMenuOpen &&
        createPortal(
          <HeaderCelContextMenu
            isContextMenuOpen={isHeaderContextMenuOpen}
            menuRef={headerMenuRef}
            contextMenuProps={headerContextMenuProps}
            className={styles.contextMenu}
            onSelect={handleSelectHeaderContextMenu}
            onClose={() => setHeaderContextMenuProps(null)}
          />,
          document.body
        )}
    </>
  );
};
