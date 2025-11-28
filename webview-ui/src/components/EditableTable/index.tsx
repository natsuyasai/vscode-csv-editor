import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { VscodeDivider } from "@vscode-elements/react-elements";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAutoFill } from "@/hooks/useAutoFill";
import { useCellSelection } from "@/hooks/useCellSelection";
import { useColumnAlignment } from "@/hooks/useColumnAlignment";
import { useContextMenus } from "@/hooks/useContextMenus";
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useHeaderEditing } from "@/hooks/useHeaderEditing";
import { useTableSearch } from "@/hooks/useTableSearch";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { ROW_ID_KEY, ROW_IDX_KEY, RowSizeType } from "@/types";
import { PortalManager } from "../EditableTable/PortalManager";
import { Header } from "../Header";
import { EditableCell } from "./EditableCell";
import { FilterInput } from "./FilterInput";
import { HeaderCell } from "./HeaderCell";
import tableStyles from "./index.module.scss";
import { RowIndexCell } from "./RowIndexCell";
import type { EditableTableProps, RowData } from "./types";

export const EditableTable: FC<EditableTableProps> = ({
  csvArray,
  theme,
  setCSVArray,
  onApply,
}) => {
  const { isIgnoreHeaderRow, rowSize, setIsIgnoreHeaderRow, setRowSize } = useHeaderAction();
  const {
    insertRow: _insertRow,
    deleteRow: _deleteRow,
    updateRow: _updateRow,
    insertCol: _insertCol,
    deleteCol: _deleteCol,
    updateCol: _updateCol,
    updateCell: _updateCell,
    updateCells: _updateCells,
    moveColumns: _moveColumns,
    moveRows: _moveRows,
    undo,
    redo,
    isEnabledUndo,
    isEnabledRedo,
  } = useUpdateCsvArray(csvArray, setCSVArray, isIgnoreHeaderRow);

  const [rowHeight, setRowHeight] = useState(40);
  const [data, setData] = useState<RowData[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // rowSizeが変更されたときにrowHeightを更新
  useEffect(() => {
    const heights: Record<RowSizeType, number> = {
      "small": 30,
      "normal": 40,
      "large": 80,
      "extra large": 120,
    };
    setRowHeight(heights[rowSize]);
  }, [rowSize]);

  // セル選択機能
  const {
    selectedCells,
    handleCellMouseDown: _handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleShiftClick: _handleShiftClick,
    handleBulkEdit,
    handleCopy,
    handlePaste,
    clearSelection,
  } = useCellSelection(data, setData, _updateCells);

  // セルクリック時にfocusedCellも更新
  const handleCellMouseDown = useCallback(
    (row: number, col: number) => {
      setFocusedCell({ row, col });
      _handleCellMouseDown(row, col);
    },
    [_handleCellMouseDown]
  );

  // Shift+クリック時にもfocusedCellを更新
  const handleShiftClick = useCallback(
    (row: number, col: number) => {
      setFocusedCell({ row, col });
      _handleShiftClick(row, col);
    },
    [_handleShiftClick]
  );

  // オートフィル機能
  const { isFilling, handleFillStart, handleFillMove, handleFillEnd, isInFillRange } = useAutoFill(
    data,
    _updateCells
  );

  // コンテキストメニュー機能
  const {
    isRowContextMenuOpen,
    rowContextMenuProps,
    rowContextMenuRef,
    openRowContextMenu,
    handleSelectRowContextMenu,
    handleCloseRowContextMenu,
    isColumnContextMenuOpen,
    columnContextMenuProps,
    columnContextMenuRef,
    openColumnContextMenu,
    handleSelectColumnContextMenu,
    handleCloseColumnContextMenu,
  } = useContextMenus(
    {
      deleteRow: _deleteRow,
      insertRow: _insertRow,
    },
    {
      deleteCol: _deleteCol,
      insertCol: _insertCol,
    }
  );

  const [showFilters, setShowFilters] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [focusedColumnIndex, setFocusedColumnIndex] = useState<number | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // 列の配置調整機能
  const { handleAlignmentChange, getCurrentAlignment, getColumnAlignment } =
    useColumnAlignment(selectedColumnIndex);

  // ヘッダー編集機能
  const {
    editingHeaderIndex,
    editingHeaderValue,
    startEditing,
    finishEditing,
    cancelEditing,
    changeEditingValue,
  } = useHeaderEditing(_updateCol);

  // データの変更をCSV配列に反映
  useEffect(() => {
    if (data.length === 0) return;

    const newCsvArray = [...csvArray];

    // ヘッダー行を保持
    const headerRow = isIgnoreHeaderRow ? [] : [csvArray[0]];

    // データ行を更新
    const dataRows = data.map((row) => {
      const cells: string[] = [];
      for (let i = 0; i < csvArray[0].length; i++) {
        cells.push(row[`col${i}`] || "");
      }
      return cells;
    });

    const updatedCsvArray = [...headerRow, ...dataRows];

    // 変更があった場合のみ更新
    const hasChanges = JSON.stringify(newCsvArray) !== JSON.stringify(updatedCsvArray);
    if (hasChanges) {
      setCSVArray(updatedCsvArray);
    }
  }, [data, csvArray, isIgnoreHeaderRow, setCSVArray]);

  // CSVデータから行データを生成
  useMemo((): RowData[] => {
    if (csvArray.length === 0) {
      return [];
    }
    const startIndex = isIgnoreHeaderRow ? 0 : 1;
    const newRows = csvArray.slice(startIndex).map((row, index) =>
      row.reduce(
        (acc, cell, colIndex) => {
          acc[`col${colIndex}`] = cell;
          return acc;
        },
        {
          [ROW_IDX_KEY]: (index + 1).toString(),
          [ROW_ID_KEY]: crypto.randomUUID(),
        } as RowData
      )
    );
    setData(newRows);
    return newRows;
  }, [csvArray, isIgnoreHeaderRow]);

  // 行のドラッグ&ドロップハンドラー
  const handleRowReorder = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (sourceIndex === targetIndex) return;
      _moveRows(sourceIndex, targetIndex);
    },
    [_moveRows]
  );

  // 列のドラッグ&ドロップハンドラー
  const handleColumnReorder = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (sourceIndex === targetIndex) return;
      _moveColumns(sourceIndex, targetIndex);
    },
    [_moveColumns]
  );

  // 列定義を生成
  const columns = useMemo((): ColumnDef<RowData>[] => {
    if (csvArray.length === 0 || csvArray[0].length === 0) {
      return [];
    }

    const cols: ColumnDef<RowData>[] = [
      {
        id: ROW_IDX_KEY,
        accessorKey: ROW_IDX_KEY,
        header: "",
        size: 40,
        enableResizing: false,
        enableSorting: false,
        cell: (props) => {
          const rowIndex = props.row.index;
          const isSelected = props.table.options.meta?.selectedRowIndex === rowIndex;
          const onSelect = () => {
            // セル選択を解除
            clearSelection();

            const currentSelected = props.table.options.meta?.selectedRowIndex;
            if (currentSelected === rowIndex) {
              props.table.options.meta?.setSelectedRowIndex?.(null);
            } else {
              props.table.options.meta?.setSelectedRowIndex?.(rowIndex);
            }
          };
          const onContextMenu = (e: React.MouseEvent, rowIdx: number) => {
            openRowContextMenu(rowIdx, e.clientY, e.clientX);
          };

          return (
            <RowIndexCell
              {...props}
              isSelected={isSelected}
              onSelect={onSelect}
              rowIndex={rowIndex}
              onRowReorder={handleRowReorder}
              onContextMenu={onContextMenu}
            />
          );
        },
      },
    ];

    csvArray[0].forEach((header, index) => {
      cols.push({
        id: `col${index}`,
        accessorKey: `col${index}`,
        header: isIgnoreHeaderRow ? "" : header,
        enableResizing: true,
        enableSorting: true,
        cell: EditableCell,
      });
    });

    return cols;
  }, [csvArray, isIgnoreHeaderRow, handleRowReorder, openRowContextMenu, clearSelection]);

  // TanStack Tableのインスタンスを作成
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      updateData: (rowIndex: number, columnId: string, value: string) => {
        // columnIdから列インデックスを取得（例: "col0" -> 0）
        const colIndex = parseInt(columnId.replace("col", ""));
        _updateCell(rowIndex, colIndex, value);
      },
      selectedRowIndex,
      setSelectedRowIndex,
      selectedCells,
      focusedCell,
      setFocusedCell,
      clearSelection,
      handleCellMouseDown,
      handleCellMouseEnter,
      handleCellMouseUp,
      handleShiftClick,
      applyValueToSelectedCells: (value: string) => {
        // 選択中のセルすべてに値を適用
        const cellUpdates = Array.from(selectedCells).map((cellKey) => {
          const [rowStr, colStr] = cellKey.split("-");
          return {
            rowIdx: parseInt(rowStr),
            colIdx: parseInt(colStr),
            value,
          };
        });
        _updateCells(cellUpdates);
        clearSelection();
      },
      // オートフィル関連
      isFilling,
      isInFillRange,
      handleFillStart,
      handleFillMove,
      handleFillEnd,
    },
  });

  // 仮想スクロールのための参照
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // 検索機能
  const {
    searchOpen,
    matchedItemPositions,
    searchedSelectedItemIdx,
    handleSearch,
    handleNextSearch,
    handlePreviousSearch,
    handleCloseSearch,
    openSearch,
  } = useTableSearch(data, rowHeight, tableContainerRef, (row, col) => {
    // 検索結果のセルを選択状態にする
    handleCellMouseDown(row, col);
    handleCellMouseUp();
  });

  // 行の仮想化
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  // rowHeightが変更されたときにvirtualizerを再計算
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rowVirtualizer]);

  function setRowSizeFromHeader(size: RowSizeType) {
    // rowSizeを設定すると、useEffectでrowHeightが自動的に更新される
    setRowSize(size);
  }

  const handleApply = useCallback(() => {
    onApply();
  }, [onApply]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleClearFilters = useCallback(() => {
    setColumnFilters([]);
  }, []);

  const handleInsertRow = useCallback(() => {
    const index = selectedRowIndex !== null ? selectedRowIndex : data.length;
    _insertRow(index);
    setSelectedRowIndex(null);
  }, [selectedRowIndex, data.length, _insertRow]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowIndex !== null) {
      _deleteRow(selectedRowIndex);
      setSelectedRowIndex(null);
    }
  }, [selectedRowIndex, _deleteRow]);

  const handleInsertColumn = useCallback(() => {
    const index = selectedColumnIndex !== null ? selectedColumnIndex : csvArray[0].length;
    _insertCol(index);
    setSelectedColumnIndex(null);
  }, [selectedColumnIndex, csvArray, _insertCol]);

  const handleDeleteColumn = useCallback(() => {
    if (selectedColumnIndex !== null) {
      _deleteCol(selectedColumnIndex);
      setSelectedColumnIndex(null);
    }
  }, [selectedColumnIndex, _deleteCol]);

  const handleCopyWrapper = useCallback(() => {
    void handleCopy();
  }, [handleCopy]);

  const handlePasteWrapper = useCallback(() => {
    void handlePaste();
  }, [handlePaste]);

  // コンテキストメニュー外クリック時にメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // 行コンテキストメニューが開いている場合
      if (isRowContextMenuOpen) {
        const menuElement = rowContextMenuRef.current;
        if (menuElement && !menuElement.contains(target)) {
          handleCloseRowContextMenu();
        }
      }

      // 列コンテキストメニューが開いている場合
      if (isColumnContextMenuOpen) {
        const menuElement = columnContextMenuRef.current;
        if (menuElement && !menuElement.contains(target)) {
          handleCloseColumnContextMenu();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    isRowContextMenuOpen,
    isColumnContextMenuOpen,
    rowContextMenuRef,
    columnContextMenuRef,
    handleCloseRowContextMenu,
    handleCloseColumnContextMenu,
  ]);

  // キーボードショートカット（Ctrl+Z、Ctrl+Y、Ctrl+F、Escape）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y: Redo
      else if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
      // Ctrl+F: 検索フォームの表示/非表示
      else if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        if (searchOpen) {
          handleCloseSearch();
        } else {
          openSearch();
        }
      }
      // Escape: 検索フォームを閉じる
      else if (e.key === "Escape" && searchOpen) {
        e.preventDefault();
        handleCloseSearch();
        // Ctrl+C: コピー
      } else if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        handleCopy().catch(() => {});
        // Ctrl+V: ペースト
      } else if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        handlePaste().catch(() => {});
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo, searchOpen, openSearch, handleCloseSearch, handleCopy, handlePaste]);

  // オートフィルのmouseupイベント
  useEffect(() => {
    const handleMouseUp = () => {
      if (isFilling) {
        handleFillEnd();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isFilling, handleFillEnd]);

  // focusedCellが変更されたときに該当セルにフォーカスを当てる
  useEffect(() => {
    if (focusedCell === null) {
      return;
    }

    // セルのDOM要素を取得してフォーカスを当てる
    // TanStack Tableのセル構造: td[role="gridcell"] > div[role="button"]
    const allGridCells = document.querySelectorAll('td[role="gridcell"]');

    for (const gridCell of Array.from(allGridCells)) {
      const cellButton = gridCell.querySelector<HTMLElement>('div[role="button"]');
      if (!cellButton) continue;

      // セルの位置から判断する
      const parentRow = gridCell.closest("tr");
      if (!parentRow) continue;

      // 行のインデックスを取得（tbodyの中での位置）
      const tbody = parentRow.closest("tbody");
      if (!tbody) continue;

      const rows = Array.from(tbody.querySelectorAll("tr"));
      const rowIndex = rows.indexOf(parentRow);

      if (rowIndex !== focusedCell.row) continue;

      // セルのインデックスを取得（行番号列を除く）
      const cells = Array.from(parentRow.querySelectorAll('td[role="gridcell"]'));
      const colIndex = cells.indexOf(gridCell) - 1; // -1 for row index column

      if (colIndex === focusedCell.col) {
        cellButton.focus();
        return;
      }
    }
  }, [focusedCell]);

  // 矢印キーでセル選択を移動
  useEffect(() => {
    const handleArrowKeyNavigation = (e: KeyboardEvent) => {
      // 編集中（ヘッダー編集またはセル編集中）の場合は移動しない
      if (editingHeaderIndex !== null) {
        return;
      }

      // input, textarea, select要素内では動作しない
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        return;
      }

      e.preventDefault();

      const totalRows = data.length;
      const totalCols = csvArray[0]?.length || 0;

      if (totalRows === 0 || totalCols === 0) {
        return;
      }

      let newRow = focusedCell?.row ?? 0;
      let newCol = focusedCell?.col ?? 0;

      switch (e.key) {
        case "ArrowUp":
          newRow = Math.max(0, newRow - 1);
          break;
        case "ArrowDown":
          newRow = Math.min(totalRows - 1, newRow + 1);
          break;
        case "ArrowLeft":
          newCol = Math.max(0, newCol - 1);
          break;
        case "ArrowRight":
          newCol = Math.min(totalCols - 1, newCol + 1);
          break;
      }

      setFocusedCell({ row: newRow, col: newCol });

      // Shiftキーが押されている場合は範囲選択
      if (e.shiftKey) {
        handleShiftClick(newRow, newCol);
      } else {
        // 通常の移動時は単一セル選択
        handleCellMouseDown(newRow, newCol);
        handleCellMouseUp();
      }
    };

    document.addEventListener("keydown", handleArrowKeyNavigation);
    return () => {
      document.removeEventListener("keydown", handleArrowKeyNavigation);
    };
  }, [
    editingHeaderIndex,
    focusedCell,
    data.length,
    csvArray,
    handleCellMouseDown,
    handleCellMouseUp,
    handleShiftClick,
  ]);

  return (
    <div className={tableStyles.root}>
      <div className={tableStyles.headerWrapper}>
        <Header
          isIgnoreHeaderRow={isIgnoreHeaderRow}
          onUpdateIgnoreHeaderRow={setIsIgnoreHeaderRow}
          rowSize={rowSize}
          isEnabledUndo={isEnabledUndo}
          isEnabledRedo={isEnabledRedo}
          onUndo={undo}
          onRedo={redo}
          onSearch={openSearch}
          onUpdateRowSize={setRowSizeFromHeader}
          onClickApply={handleApply}
          showFilters={showFilters}
          onToggleFilters={handleToggleFilters}
          onClearFilters={handleClearFilters}
          hasActiveFilters={columnFilters.length > 0}
          selectedColumnKey={selectedColumnIndex !== null ? `col${selectedColumnIndex}` : null}
          currentAlignment={getCurrentAlignment()}
          onAlignmentChange={handleAlignmentChange}
          onInsertRow={handleInsertRow}
          onDeleteRow={handleDeleteRow}
          isRowSelected={selectedRowIndex !== null}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          isColumnSelected={selectedColumnIndex !== null}
          onBulkEdit={handleBulkEdit}
          onClearSelection={clearSelection}
          onCopy={handleCopyWrapper}
          onPaste={handlePasteWrapper}
          selectedCellsCount={selectedCells.size}
        />
        <VscodeDivider className={tableStyles.divider} />
      </div>
      <div className={tableStyles.tableWrapper}>
        <DndProvider backend={HTML5Backend}>
          <div
            ref={tableContainerRef}
            className={[
              tableStyles.dataGrid,
              tableStyles.tableContainer,
              `${theme === "light" ? "rdg-light" : "rdg-dark"}`,
            ].join(" ")}>
            <table className={tableStyles.table}>
              <thead className={tableStyles.thead}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={tableStyles.headerRow}>
                    {headerGroup.headers.map((header, headerIndex) => (
                      <HeaderCell
                        key={header.id}
                        header={header}
                        headerIndex={headerIndex}
                        rowIdxKey={ROW_IDX_KEY}
                        selectedColumnIndex={selectedColumnIndex}
                        focusedColumnIndex={focusedColumnIndex}
                        editingHeaderIndex={editingHeaderIndex}
                        editingHeaderValue={editingHeaderValue}
                        updateCol={_updateCol}
                        startEditing={startEditing}
                        finishEditing={finishEditing}
                        cancelEditing={cancelEditing}
                        changeEditingValue={changeEditingValue}
                        setSelectedColumnIndex={setSelectedColumnIndex}
                        setFocusedColumnIndex={setFocusedColumnIndex}
                        openColumnContextMenu={openColumnContextMenu}
                        handleColumnReorder={handleColumnReorder}
                      />
                    ))}
                  </tr>
                ))}
                {showFilters &&
                  table.getHeaderGroups().map((headerGroup) => (
                    <tr key={`${headerGroup.id}-filter`} className={tableStyles.filterRow}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={tableStyles.filterCell}
                          style={{
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                          }}>
                          {header.column.getCanFilter() && header.column.id !== ROW_IDX_KEY ? (
                            <FilterInput column={header.column} />
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  ))}
              </thead>
              <tbody
                className={tableStyles.tbody}
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  if (!row) return null;
                  const isRowSelected = selectedRowIndex === virtualRow.index;
                  return (
                    <tr
                      key={row.id}
                      className={tableStyles.dataRow}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}>
                      {row.getVisibleCells().map((cell, cellIndex) => {
                        const colIndex = cellIndex - 1; // 行番号列を除く
                        const alignment = colIndex >= 0 ? getColumnAlignment(colIndex) : undefined;
                        const isRowIndexCell = cell.column.id === ROW_IDX_KEY;

                        const handleCellContextMenu = isRowIndexCell
                          ? (e: React.MouseEvent) => {
                              e.preventDefault();
                              openRowContextMenu(row.index, e.clientY, e.clientX);
                            }
                          : undefined;

                        return (
                          <td
                            key={cell.id}
                            role="gridcell"
                            className={tableStyles.dataCell}
                            onContextMenu={handleCellContextMenu}
                            style={{
                              width: `${cell.column.getSize()}px`,
                              minWidth: `${cell.column.getSize()}px`,
                              maxWidth: `${cell.column.getSize()}px`,
                              textAlign: alignment?.horizontal || "left",
                              verticalAlign: alignment?.vertical || "center",
                              backgroundColor: isRowSelected
                                ? "var(--vscode-list-activeSelectionBackground)"
                                : "transparent",
                            }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PortalManager
            isShowSearch={searchOpen}
            searchProps={{
              isMatching: matchedItemPositions.length > 0,
              machedCount: matchedItemPositions.length,
              searchedSelectedItemIdx: searchedSelectedItemIdx,
              onSearch: handleSearch,
              onNext: handleNextSearch,
              onPrevious: handlePreviousSearch,
              onClose: handleCloseSearch,
            }}
            isRowContextMenuOpen={isRowContextMenuOpen}
            rowContextMenuProps={{
              isContextMenuOpen: isRowContextMenuOpen,
              menuRef: rowContextMenuRef,
              contextMenuProps: rowContextMenuProps,
              className: "",
              onSelect: handleSelectRowContextMenu,
              onClose: handleCloseRowContextMenu,
            }}
            isHeaderContextMenuOpen={isColumnContextMenuOpen}
            headerContextMenuProps={{
              isContextMenuOpen: isColumnContextMenuOpen,
              menuRef: columnContextMenuRef,
              contextMenuProps: columnContextMenuProps,
              className: "",
              onSelect: handleSelectColumnContextMenu,
              onClose: handleCloseColumnContextMenu,
            }}
          />
        </DndProvider>
      </div>
    </div>
  );
};
