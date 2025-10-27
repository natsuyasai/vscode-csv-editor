import { useCallback, useRef, useState } from "react";

export interface ContextMenuPosition {
  itemIdx: number;
  top: number;
  left: number;
}

export interface RowContextMenuActions {
  deleteRow: (rowIdx: number) => void;
  insertRow: (position: number) => void;
}

export interface ColumnContextMenuActions {
  deleteCol: (colIdx: number) => void;
  insertCol: (position: number) => void;
}

export const useContextMenusV2 = (
  rowActions: RowContextMenuActions,
  columnActions: ColumnContextMenuActions
) => {
  // 行コンテキストメニュー
  const [isRowContextMenuOpen, setIsRowContextMenuOpen] = useState(false);
  const [rowContextMenuProps, setRowContextMenuProps] = useState<ContextMenuPosition | null>(null);
  const rowContextMenuRef = useRef<HTMLElement | null>(null);

  // 列コンテキストメニュー
  const [isColumnContextMenuOpen, setIsColumnContextMenuOpen] = useState(false);
  const [columnContextMenuProps, setColumnContextMenuProps] =
    useState<ContextMenuPosition | null>(null);
  const columnContextMenuRef = useRef<HTMLElement | null>(null);

  // 行コンテキストメニューを開く
  const openRowContextMenu = useCallback((itemIdx: number, top: number, left: number) => {
    setRowContextMenuProps({ itemIdx, top, left });
    setIsRowContextMenuOpen(true);
  }, []);

  // 行コンテキストメニューハンドラー
  const handleSelectRowContextMenu = useCallback(
    (value: string) => {
      if (rowContextMenuProps === null) {
        return;
      }

      const rowIdx = rowContextMenuProps.itemIdx;
      if (value === "deleteRow") {
        rowActions.deleteRow(rowIdx);
      } else if (value === "insertRowAbove") {
        rowActions.insertRow(rowIdx);
      } else if (value === "insertRowBelow") {
        rowActions.insertRow(rowIdx + 1);
      }

      setIsRowContextMenuOpen(false);
      setRowContextMenuProps(null);
    },
    [rowContextMenuProps, rowActions]
  );

  const handleCloseRowContextMenu = useCallback(() => {
    setIsRowContextMenuOpen(false);
    setRowContextMenuProps(null);
  }, []);

  // 列コンテキストメニューを開く
  const openColumnContextMenu = useCallback((itemIdx: number, top: number, left: number) => {
    setColumnContextMenuProps({ itemIdx, top, left });
    setIsColumnContextMenuOpen(true);
  }, []);

  // 列コンテキストメニューハンドラー
  const handleSelectColumnContextMenu = useCallback(
    (value: string) => {
      if (columnContextMenuProps === null) {
        return;
      }

      const colIdx = columnContextMenuProps.itemIdx;
      if (value === "deleteHeaderCel") {
        columnActions.deleteCol(colIdx);
      } else if (value === "insertHeaderCelLeft") {
        columnActions.insertCol(colIdx);
      } else if (value === "insertHeaderCelRight") {
        columnActions.insertCol(colIdx + 1);
      }

      setIsColumnContextMenuOpen(false);
      setColumnContextMenuProps(null);
    },
    [columnContextMenuProps, columnActions]
  );

  const handleCloseColumnContextMenu = useCallback(() => {
    setIsColumnContextMenuOpen(false);
    setColumnContextMenuProps(null);
  }, []);

  return {
    // 行コンテキストメニュー
    isRowContextMenuOpen,
    rowContextMenuProps,
    rowContextMenuRef,
    openRowContextMenu,
    handleSelectRowContextMenu,
    handleCloseRowContextMenu,
    // 列コンテキストメニュー
    isColumnContextMenuOpen,
    columnContextMenuProps,
    columnContextMenuRef,
    openColumnContextMenu,
    handleSelectColumnContextMenu,
    handleCloseColumnContextMenu,
  };
};
