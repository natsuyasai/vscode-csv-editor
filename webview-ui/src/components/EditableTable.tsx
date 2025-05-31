import { useCellCopy } from "@/hooks/useCellCopy";
import { useColumns } from "@/hooks/useColumns";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useRows } from "@/hooks/useRows";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { RowSizeType } from "@/types";
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalculatedColumn,
  CellClickArgs,
  CellKeyboardEvent,
  CellKeyDownArgs,
  CellMouseEvent,
  DataGrid,
  FillEvent,
  SortColumn,
} from "react-data-grid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createPortal } from "react-dom";
import styles from "./EditableTable.module.scss";
import { CustomHeaderCell } from "./Header/CustomHeaderCell";
import { HeaderCelContextMenu } from "./Header/HeaderCelContextMenu";
import { CustomRow, CustomRowProps } from "./Row/CustomRow";
import { RowContextMenu } from "./Row/RowContextMenu";

interface Props {
  csvArray: Array<Array<string>>;
  isIgnoreHeaderRow: boolean;
  rowSize: RowSizeType;
  setCSVArray: (csv: Array<Array<string>>) => void;
}

export const EditableTable: FC<Props> = ({ csvArray, isIgnoreHeaderRow, rowSize, setCSVArray }) => {
  const { rows, sortedRows, sortColumns, setSortColumns } = useRows(csvArray, isIgnoreHeaderRow);
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
  const {
    insertRow,
    deleteRow,
    updateRow,
    insertCol,
    deleteCol,
    updateCol,
    updateCell,
    swapColumns,
    swapRows,
    undo,
    redo,
  } = useUpdateCsvArray(csvArray, setCSVArray, isIgnoreHeaderRow);

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
    if (e.key === "Delete") {
      updateCell(args.rowIdx, args.column.idx, "");
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

  useEffect(() => {
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

    window.addEventListener("keydown", handleKeyDownForDocument);

    return () => {
      window.removeEventListener("keydown", handleKeyDownForDocument);
    };
  }, [undo, redo]);

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

  const [sortColumnsForWaitingDoubleClick, setSortColumnsForWaitingDoubleClick] = useState<
    SortColumn[]
  >([]);

  function handleColumnsReorder(sourceKey: string, targetKey: string) {
    const sourceIdx = columns.findIndex((col) => col.key === sourceKey);
    const targetIdx = columns.findIndex((col) => col.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) {
      return;
    }
    swapColumns(sourceIdx, targetIdx);
  }

  const renderRow = useCallback(
    (props: CustomRowProps) => {
      function onRowReorder(fromIndex: number, toIndex: number) {
        swapRows(fromIndex, toIndex);
      }
      return <CustomRow key={props.rowKey} {...props} onRowReorder={onRowReorder} />;
    },
    [swapRows]
  );

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <DataGrid
          className={styles.dataGrid}
          enableVirtualization={true}
          columns={columns}
          rows={sortedRows}
          rowHeight={rowHeight}
          rowKeyGetter={(row) => rows.indexOf(row).toString()}
          onRowsChange={updateRow}
          sortColumns={sortColumns}
          onSortColumnsChange={(sortColumns) => {
            // ヘッダの編集用のダブルクリックの判定を待つ必要があるため、保持だけして何もしない
            setSortColumnsForWaitingDoubleClick(sortColumns);
          }}
          onFill={handleFill}
          onCellCopy={handleCellCopy}
          onCellContextMenu={handleCellContextMenu}
          onCellKeyDown={handleKeyDown}
          onColumnsReorder={handleColumnsReorder}
          renderers={{
            renderRow: (key, props) =>
              renderRow({
                ...props,
                rowKey: key,
                onUpdateRowHeight: () => {},
                onRowReorder: () => {},
              }) as ReactNode,
          }}
          defaultColumnOptions={{
            renderHeaderCell: (props) =>
              CustomHeaderCell({
                ...props,
                isIgnoreHeaderRow,
                sortColumnsForWaitingDoubleClick: sortColumnsForWaitingDoubleClick,
                onHeaderCellContextMenu: handleHeaderCellContextMenu,
                onHeaderEdit: handleHeaderEdit,
                onKeyDown: handleKeyDownHeaderCell,
                onCanSortColumnsChange: (sortColumns) => {
                  setSortColumns(sortColumns);
                },
                onDoubleClick: () => {
                  setSortColumnsForWaitingDoubleClick([]);
                },
              }) as ReactNode,
            sortable: true,
            draggable: true,
            resizable: true,
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
      </DndProvider>
    </>
  );
};
