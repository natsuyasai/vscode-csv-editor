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
import { useCellSelectionV2 } from "@/hooks/useCellSelectionV2";
import { useColumnAlignment } from "@/hooks/useColumnAlignment";
import { useContextMenusV2 } from "@/hooks/useContextMenusV2";
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useHeaderEditing } from "@/hooks/useHeaderEditing";
import { useTableSearchV2 } from "@/hooks/useTableSearchV2";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { ROW_ID_KEY, ROW_IDX_KEY, RowSizeType } from "@/types";
import { PortalManager } from "./EditableTable/PortalManager";
import styles from "./EditableTable.module.scss";
import { DraggableHeaderCell } from "./EditableTableV2/DraggableHeaderCell";
import { EditableCell } from "./EditableTableV2/EditableCell";
import { FilterInput } from "./EditableTableV2/FilterInput";
import { RowIndexCell } from "./EditableTableV2/RowIndexCell";
import type { EditableTableV2Props, RowData } from "./EditableTableV2/types";
import tableStyles from "./EditableTableV2.module.scss";
import { Header } from "./Header";


export const EditableTableV2: FC<EditableTableV2Props> = ({ csvArray, theme, setCSVArray, onApply }) => {
  const { isIgnoreHeaderRow, rowSize, setIsIgnoreHeaderRow, setRowSize } = useHeaderAction();
  const {
    insertRow: _insertRow,
    deleteRow: _deleteRow,
    updateRow: _updateRow,
    insertCol: _insertCol,
    deleteCol: _deleteCol,
    updateCol: _updateCol,
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
      small: 30,
      normal: 40,
      large: 80,
      "extra large": 120,
    };
    setRowHeight(heights[rowSize]);
  }, [rowSize]);

  // セル選択機能
  const {
    selectedCells,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleBulkEdit,
    handleCopy,
    handlePaste,
    clearSelection,
  } = useCellSelectionV2(data, setData);

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
  } = useContextMenusV2(
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
  }, [csvArray, isIgnoreHeaderRow, handleRowReorder, openRowContextMenu]);

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
        setData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
      selectedRowIndex,
      setSelectedRowIndex,
      selectedCells,
      handleCellMouseDown,
      handleCellMouseEnter,
      handleCellMouseUp,
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
  } = useTableSearchV2(data, rowHeight, tableContainerRef);

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

  // キーボードショートカット（Ctrl+Z、Ctrl+Y）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  return (
    <>
      <div>
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
        <VscodeDivider className={styles.divider} />
      </div>
      <div>
        <DndProvider backend={HTML5Backend}>
          <div
            ref={tableContainerRef}
            className={[
              styles.dataGrid,
              tableStyles.tableContainer,
              `${theme === "light" ? "rdg-light" : "rdg-dark"}`,
            ].join(" ")}>
            <table className={tableStyles.table}>
              <thead className={tableStyles.thead}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={tableStyles.headerRow}>
                    {headerGroup.headers.map((header, headerIndex) => {
                      const columnIndex = header.column.id === ROW_IDX_KEY ? null : headerIndex - 1;
                      const isSelected =
                        columnIndex !== null && selectedColumnIndex === columnIndex;
                      const isFocused = columnIndex !== null && focusedColumnIndex === columnIndex;
                      const isEditing = columnIndex !== null && editingHeaderIndex === columnIndex;

                      // キーボード処理
                      const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
                        if (columnIndex === null) return;

                        // 編集モード中の処理
                        if (isEditing) {
                          // textareaのonKeyDownで処理されるため、ここでは何もしない
                          return;
                        }

                        // 編集モードでない場合の処理
                        if (e.key === "Delete") {
                          // ヘッダーの値を削除
                          _updateCol(columnIndex, "");
                        } else if (e.key === "Backspace") {
                          // ヘッダーの値を削除して編集モードに移行
                          _updateCol(columnIndex, "");
                          startEditing(columnIndex, "");
                        } else if (e.key === "F2") {
                          // 編集モードに移行
                          const renderedHeader = flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          );
                          let headerValue = "";
                          if (typeof renderedHeader === "string") {
                            headerValue = renderedHeader;
                          } else if (
                            typeof renderedHeader === "number" ||
                            typeof renderedHeader === "boolean"
                          ) {
                            headerValue = String(renderedHeader);
                          }
                          startEditing(columnIndex, headerValue);
                        } else if (
                          !e.ctrlKey &&
                          !e.altKey &&
                          !e.metaKey &&
                          !e.repeat &&
                          e.key.length === 1
                        ) {
                          // 通常の文字入力で編集モードに移行
                          e.preventDefault();
                          startEditing(columnIndex, e.key);
                        }
                      };

                      return (
                        <th
                          key={header.id}
                          tabIndex={-1}
                          className={tableStyles.headerCell}
                          onKeyDown={handleHeaderKeyDown}
                          onContextMenu={(e) => {
                            if (columnIndex !== null) {
                              e.preventDefault();
                              openColumnContextMenu(columnIndex, e.clientY, e.clientX);
                            }
                          }}
                          style={{
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            backgroundColor: isFocused
                              ? "var(--vscode-list-hoverBackground)"
                              : isSelected
                                ? "var(--vscode-list-activeSelectionBackground)"
                                : "var(--vscode-editor-background)",
                            color: isSelected
                              ? "var(--vscode-list-activeSelectionForeground)"
                              : "inherit",
                            cursor: header.column.getCanSort() ? "pointer" : "default",
                            outline: isFocused ? "2px solid var(--vscode-focusBorder)" : "none",
                          }}>
                          {header.isPlaceholder ? null : columnIndex !== null ? (
                            isEditing ? (
                              <textarea
                                ref={(el) => {
                                  if (el) {
                                    el.focus();
                                    el.setSelectionRange(el.value.length, el.value.length);
                                  }
                                }}
                                value={editingHeaderValue}
                                onChange={(e) => changeEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    finishEditing();
                                  } else if (e.key === "Escape") {
                                    cancelEditing();
                                  } else if (e.key === "Tab") {
                                    e.preventDefault();
                                    finishEditing();
                                  }
                                }}
                                onBlur={() => {
                                  finishEditing();
                                }}
                                className={tableStyles.headerEditTextarea}
                              />
                            ) : (
                              <DraggableHeaderCell
                                columnIndex={columnIndex}
                                isSelected={isSelected}
                                onColumnReorder={handleColumnReorder}
                                onColumnSelect={setSelectedColumnIndex}
                                onFocusChange={(focused) => {
                                  if (columnIndex !== null) {
                                    setFocusedColumnIndex(focused ? columnIndex : null);
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (columnIndex !== null) {
                                    const renderedHeader = flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    );
                                    let headerValue = "";
                                    if (typeof renderedHeader === "string") {
                                      headerValue = renderedHeader;
                                    } else if (
                                      typeof renderedHeader === "number" ||
                                      typeof renderedHeader === "boolean"
                                    ) {
                                      headerValue = String(renderedHeader);
                                    }
                                    startEditing(columnIndex, headerValue);
                                  }
                                }}
                                onSort={
                                  header.column.getCanSort()
                                    ? header.column.getToggleSortingHandler()
                                    : undefined
                                }>
                                <div className={tableStyles.headerContent}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {{
                                    asc: " 🔼",
                                    desc: " 🔽",
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              </DraggableHeaderCell>
                            )
                          ) : (
                            <div className={tableStyles.headerContent}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                          )}
                        </th>
                      );
                    })}
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

                        return (
                          <td
                            key={cell.id}
                            role="gridcell"
                            className={tableStyles.dataCell}
                            onContextMenu={
                              isRowIndexCell
                                ? (e) => {
                                    e.preventDefault();
                                    openRowContextMenu(row.index, e.clientY, e.clientX);
                                  }
                                : undefined
                            }
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
    </>
  );
};
