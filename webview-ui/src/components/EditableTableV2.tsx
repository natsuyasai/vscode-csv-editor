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
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { ROW_ID_KEY, ROW_IDX_KEY, RowSizeType, CellAlignment } from "@/types";
import { PortalManager } from "./EditableTable/PortalManager";
import styles from "./EditableTable.module.scss";
import { DraggableHeaderCell } from "./EditableTableV2/DraggableHeaderCell";
import { EditableCell } from "./EditableTableV2/EditableCell";
import { FilterInput } from "./EditableTableV2/FilterInput";
import { RowIndexCell } from "./EditableTableV2/RowIndexCell";
import type { EditableTableV2Props, RowData } from "./EditableTableV2/types";
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

  const [showFilters, setShowFilters] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [focusedColumnIndex, setFocusedColumnIndex] = useState<number | null>(null);
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>("");

  // 検索機能のstate
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedItemPositions, setMatchedItemPositions] = useState<
    Array<{ rowIdx: number; colIdx: number }>
  >([]);
  const [searchedSelectedItemIdx, setSearchedSelectedItemIdx] = useState(0);

  // コンテキストメニューのstate
  const [isRowContextMenuOpen, setIsRowContextMenuOpen] = useState(false);
  const [rowContextMenuProps, setRowContextMenuProps] = useState<{
    itemIdx: number;
    top: number;
    left: number;
  } | null>(null);
  const rowContextMenuRef = useRef<HTMLElement | null>(null);

  const [isColumnContextMenuOpen, setIsColumnContextMenuOpen] = useState(false);
  const [columnContextMenuProps, setColumnContextMenuProps] = useState<{
    itemIdx: number;
    top: number;
    left: number;
  } | null>(null);
  const columnContextMenuRef = useRef<HTMLElement | null>(null);

  // 列の配置調整のstate
  const [columnAlignments, setColumnAlignments] = useState<Record<number, CellAlignment>>({});

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

  // 行コンテキストメニューハンドラー
  const handleSelectRowContextMenu = useCallback(
    (value: string) => {
      if (rowContextMenuProps === null) {
        return;
      }

      const rowIdx = rowContextMenuProps.itemIdx;
      if (value === "deleteRow") {
        _deleteRow(rowIdx);
      } else if (value === "insertRowAbove") {
        _insertRow(rowIdx);
      } else if (value === "insertRowBelow") {
        _insertRow(rowIdx + 1);
      }

      setIsRowContextMenuOpen(false);
      setRowContextMenuProps(null);
    },
    [rowContextMenuProps, _deleteRow, _insertRow]
  );

  const handleCloseRowContextMenu = useCallback(() => {
    setIsRowContextMenuOpen(false);
    setRowContextMenuProps(null);
  }, []);

  // 列コンテキストメニューハンドラー
  const handleSelectColumnContextMenu = useCallback(
    (value: string) => {
      if (columnContextMenuProps === null) {
        return;
      }

      const colIdx = columnContextMenuProps.itemIdx;
      if (value === "deleteHeaderCel") {
        _deleteCol(colIdx);
      } else if (value === "insertHeaderCelLeft") {
        _insertCol(colIdx);
      } else if (value === "insertHeaderCelRight") {
        _insertCol(colIdx + 1);
      }

      setIsColumnContextMenuOpen(false);
      setColumnContextMenuProps(null);
    },
    [columnContextMenuProps, _deleteCol, _insertCol]
  );

  const handleCloseColumnContextMenu = useCallback(() => {
    setIsColumnContextMenuOpen(false);
    setColumnContextMenuProps(null);
  }, []);

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
            setRowContextMenuProps({
              itemIdx: rowIdx,
              top: e.clientY,
              left: e.clientX,
            });
            setIsRowContextMenuOpen(true);
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
  }, [csvArray, isIgnoreHeaderRow, handleRowReorder]);

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

  // 検索ハンドラー
  const handleSearch = useCallback(
    (text: string) => {
      if (text.trim() === "") {
        return;
      }
      const lowerText = text.toLowerCase();
      const positions: Array<{ rowIdx: number; colIdx: number }> = [];

      data.forEach((row, rowIdx) => {
        Object.keys(row).forEach((key) => {
          if (key === ROW_IDX_KEY || key === ROW_ID_KEY) {
            return;
          }
          const colIdx = parseInt(key.replace("col", ""));
          const value = row[key];
          if (value && value.toLowerCase().includes(lowerText)) {
            positions.push({ rowIdx, colIdx });
          }
        });
      });

      if (positions.length === 0) {
        return;
      }

      setMatchedItemPositions(positions);
      setSearchedSelectedItemIdx(0);

      // 最初のマッチ位置にスクロール
      const firstMatch = positions[0];
      tableContainerRef.current?.scrollTo({
        top: firstMatch.rowIdx * rowHeight,
        behavior: "smooth",
      });
    },
    [data, rowHeight]
  );

  const handleNextSearch = useCallback(() => {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const nextIdx =
      searchedSelectedItemIdx + 1 < matchedItemPositions.length ? searchedSelectedItemIdx + 1 : 0;
    const position = matchedItemPositions[nextIdx];
    setSearchedSelectedItemIdx(nextIdx);

    tableContainerRef.current?.scrollTo({
      top: position.rowIdx * rowHeight,
      behavior: "smooth",
    });
  }, [matchedItemPositions, searchedSelectedItemIdx, rowHeight]);

  const handlePreviousSearch = useCallback(() => {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const prevIdx =
      searchedSelectedItemIdx - 1 >= 0
        ? searchedSelectedItemIdx - 1
        : matchedItemPositions.length - 1;
    const position = matchedItemPositions[prevIdx];
    setSearchedSelectedItemIdx(prevIdx);

    tableContainerRef.current?.scrollTo({
      top: position.rowIdx * rowHeight,
      behavior: "smooth",
    });
  }, [matchedItemPositions, searchedSelectedItemIdx, rowHeight]);

  const handleCloseSearch = useCallback(() => {
    setMatchedItemPositions([]);
    setSearchedSelectedItemIdx(0);
    setSearchOpen(false);
  }, []);

  // 列の配置調整ハンドラー
  const handleAlignmentChange = useCallback(
    (alignment: CellAlignment) => {
      if (selectedColumnIndex === null) return;

      setColumnAlignments((prev) => ({
        ...prev,
        [selectedColumnIndex]: alignment,
      }));
    },
    [selectedColumnIndex]
  );

  // 選択された列の現在の配置を取得
  const getCurrentAlignment = useCallback((): CellAlignment => {
    if (selectedColumnIndex === null) {
      return { vertical: "center", horizontal: "left" };
    }
    return columnAlignments[selectedColumnIndex] || { vertical: "center", horizontal: "left" };
  }, [selectedColumnIndex, columnAlignments]);

  function setRowSizeFromHeader(size: RowSizeType) {
    // rowSizeを設定すると、useEffectでrowHeightが自動的に更新される
    setRowSize(size);
  }

  const handleApply = useCallback(() => {
    onApply();
  }, [onApply]);

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
          onSearch={() => setSearchOpen(true)}
          onUpdateRowSize={setRowSizeFromHeader}
          onClickApply={handleApply}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={() => setColumnFilters([])}
          hasActiveFilters={columnFilters.length > 0}
          selectedColumnKey={selectedColumnIndex !== null ? `col${selectedColumnIndex}` : null}
          currentAlignment={getCurrentAlignment()}
          onAlignmentChange={handleAlignmentChange}
        />
        <VscodeDivider className={styles.divider} />
      </div>
      <div
        style={{
          padding: "8px",
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--vscode-panel-border)",
        }}>
        <button
          onClick={() => {
            const index = selectedRowIndex !== null ? selectedRowIndex : data.length;
            _insertRow(index);
            setSelectedRowIndex(null);
          }}
          style={{
            padding: "4px 8px",
            cursor: "pointer",
            backgroundColor: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
          }}>
          行を追加
        </button>
        <button
          onClick={() => {
            if (selectedRowIndex !== null) {
              _deleteRow(selectedRowIndex);
              setSelectedRowIndex(null);
            }
          }}
          disabled={selectedRowIndex === null}
          style={{
            padding: "4px 8px",
            cursor: selectedRowIndex === null ? "not-allowed" : "pointer",
            backgroundColor:
              selectedRowIndex === null
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedRowIndex === null ? 0.5 : 1,
          }}>
          行を削除
        </button>
        <div
          style={{ width: "1px", height: "24px", backgroundColor: "var(--vscode-panel-border)" }}
        />
        <button
          onClick={() => {
            const index = selectedColumnIndex !== null ? selectedColumnIndex : csvArray[0].length;
            _insertCol(index);
            setSelectedColumnIndex(null);
          }}
          style={{
            padding: "4px 8px",
            cursor: "pointer",
            backgroundColor: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
          }}>
          列を追加
        </button>
        <button
          onClick={() => {
            if (selectedColumnIndex !== null) {
              _deleteCol(selectedColumnIndex);
              setSelectedColumnIndex(null);
            }
          }}
          disabled={selectedColumnIndex === null}
          style={{
            padding: "4px 8px",
            cursor: selectedColumnIndex === null ? "not-allowed" : "pointer",
            backgroundColor:
              selectedColumnIndex === null
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedColumnIndex === null ? 0.5 : 1,
          }}>
          列を削除
        </button>
        <div
          style={{ width: "1px", height: "24px", backgroundColor: "var(--vscode-panel-border)" }}
        />
        <button
          onClick={handleBulkEdit}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor:
              selectedCells.size === 0
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedCells.size === 0 ? 0.5 : 1,
          }}>
          一括編集 ({selectedCells.size}セル)
        </button>
        <button
          onClick={clearSelection}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor:
              selectedCells.size === 0
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedCells.size === 0 ? 0.5 : 1,
          }}>
          選択解除
        </button>
        <button
          onClick={() => void handleCopy()}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor:
              selectedCells.size === 0
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedCells.size === 0 ? 0.5 : 1,
          }}>
          コピー ({selectedCells.size}セル)
        </button>
        <button
          onClick={() => void handlePaste()}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor:
              selectedCells.size === 0
                ? "var(--vscode-button-secondaryBackground)"
                : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedCells.size === 0 ? 0.5 : 1,
          }}>
          ペースト
        </button>
      </div>
      <div>
        <DndProvider backend={HTML5Backend}>
          <div
            ref={tableContainerRef}
            className={[styles.dataGrid, `${theme === "light" ? "rdg-light" : "rdg-dark"}`].join(
              " "
            )}
            style={{
              height: "600px",
              overflow: "auto",
            }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                display: "block",
              }}>
              <thead
                style={{
                  display: "table",
                  width: "100%",
                  tableLayout: "fixed",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  backgroundColor: "var(--vscode-editor-background)",
                }}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} style={{ display: "table-row" }}>
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
                          setEditingHeaderIndex(columnIndex);
                          setEditingHeaderValue("");
                        } else if (e.key === "F2") {
                          // 編集モードに移行
                          setEditingHeaderIndex(columnIndex);
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
                          setEditingHeaderValue(headerValue);
                        } else if (
                          !e.ctrlKey &&
                          !e.altKey &&
                          !e.metaKey &&
                          !e.repeat &&
                          e.key.length === 1
                        ) {
                          // 通常の文字入力で編集モードに移行
                          e.preventDefault();
                          setEditingHeaderIndex(columnIndex);
                          setEditingHeaderValue(e.key);
                        }
                      };

                      return (
                        <th
                          key={header.id}
                          tabIndex={-1}
                          onKeyDown={handleHeaderKeyDown}
                          onContextMenu={(e) => {
                            if (columnIndex !== null) {
                              e.preventDefault();
                              setColumnContextMenuProps({
                                itemIdx: columnIndex,
                                top: e.clientY,
                                left: e.clientX,
                              });
                              setIsColumnContextMenuOpen(true);
                            }
                          }}
                          style={{
                            display: "table-cell",
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            padding: "8px",
                            textAlign: "left",
                            borderBottom: "1px solid var(--vscode-panel-border)",
                            backgroundColor: isFocused
                              ? "var(--vscode-list-hoverBackground)"
                              : isSelected
                                ? "var(--vscode-list-activeSelectionBackground)"
                                : "var(--vscode-editor-background)",
                            color: isSelected
                              ? "var(--vscode-list-activeSelectionForeground)"
                              : "inherit",
                            boxSizing: "border-box",
                            cursor: header.column.getCanSort() ? "pointer" : "default",
                            userSelect: "none",
                            outline: isFocused ? "2px solid var(--vscode-focusBorder)" : "none",
                            outlineOffset: "-2px",
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
                                onChange={(e) => setEditingHeaderValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    // ヘッダーの値を更新
                                    _updateCol(columnIndex, editingHeaderValue);
                                    setEditingHeaderIndex(null);
                                  } else if (e.key === "Escape") {
                                    setEditingHeaderIndex(null);
                                  } else if (e.key === "Tab") {
                                    e.preventDefault();
                                    // ヘッダーの値を更新
                                    _updateCol(columnIndex, editingHeaderValue);
                                    setEditingHeaderIndex(null);
                                  }
                                }}
                                onBlur={() => {
                                  // ヘッダーの値を更新
                                  _updateCol(columnIndex, editingHeaderValue);
                                  setEditingHeaderIndex(null);
                                }}
                                style={{
                                  width: "100%",
                                  minHeight: "20px",
                                  resize: "vertical",
                                  fontFamily: "inherit",
                                  fontSize: "inherit",
                                  padding: "2px 4px",
                                  border: "1px solid var(--vscode-focusBorder)",
                                  backgroundColor: "var(--vscode-input-background)",
                                  color: "var(--vscode-input-foreground)",
                                }}
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
                                    setEditingHeaderIndex(columnIndex);
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
                                    setEditingHeaderValue(headerValue);
                                  }
                                }}
                                onSort={
                                  header.column.getCanSort()
                                    ? header.column.getToggleSortingHandler()
                                    : undefined
                                }>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {{
                                    asc: " 🔼",
                                    desc: " 🔽",
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              </DraggableHeaderCell>
                            )
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
                    <tr key={`${headerGroup.id}-filter`} style={{ display: "table-row" }}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          style={{
                            display: "table-cell",
                            width: `${header.getSize()}px`,
                            minWidth: `${header.getSize()}px`,
                            maxWidth: `${header.getSize()}px`,
                            padding: "4px 8px",
                            borderBottom: "1px solid var(--vscode-panel-border)",
                            backgroundColor: "var(--vscode-editor-background)",
                            boxSizing: "border-box",
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
                style={{
                  display: "block",
                  position: "relative",
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  if (!row) return null;
                  const isRowSelected = selectedRowIndex === virtualRow.index;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        display: "table",
                        width: "100%",
                        tableLayout: "fixed",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}>
                      {row.getVisibleCells().map((cell, cellIndex) => {
                        const colIndex = cellIndex - 1; // 行番号列を除く
                        const alignment = colIndex >= 0 ? columnAlignments[colIndex] : undefined;
                        const isRowIndexCell = cell.column.id === ROW_IDX_KEY;

                        return (
                          <td
                            key={cell.id}
                            role="gridcell"
                            onContextMenu={
                              isRowIndexCell
                                ? (e) => {
                                    e.preventDefault();
                                    setRowContextMenuProps({
                                      itemIdx: row.index,
                                      top: e.clientY,
                                      left: e.clientX,
                                    });
                                    setIsRowContextMenuOpen(true);
                                  }
                                : undefined
                            }
                            style={{
                              display: "table-cell",
                              width: `${cell.column.getSize()}px`,
                              minWidth: `${cell.column.getSize()}px`,
                              maxWidth: `${cell.column.getSize()}px`,
                              padding: "0",
                              borderBottom: "1px solid var(--vscode-panel-border)",
                              boxSizing: "border-box",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
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
