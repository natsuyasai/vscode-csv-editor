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
import { useColumnResize } from "@/hooks/useColumnResize";
import { useContextMenus } from "@/hooks/useContextMenus";
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useHeaderEditing } from "@/hooks/useHeaderEditing";
import { KeyboardShortcut, useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRowResize } from "@/hooks/useRowResize";
import { useTableSearch } from "@/hooks/useTableSearch";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { ROW_ID_KEY, ROW_IDX_KEY, RowSizeType } from "@/types";
import { PortalManager } from "../common/PortalManager";
import { Header } from "../header/Header";
import { EditableCell } from "../table-cell/EditableCell";
import { RowIndexCell } from "../table-cell/RowIndexCell";
import { FilterInput } from "../table-header/FilterInput";
import { HeaderCell } from "../table-header/HeaderCell";
import tableStyles from "./EditableTable.module.scss";
import {
  createRowIndexMapper,
  identityRowIndexMapper,
  type RowIndexMapper,
} from "./rowIndexMapper";
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

  // 行のリサイズ機能
  const {
    rowHeights,
    getRowHeight,
    setRowHeight: _setIndividualRowHeight,
    startResize,
    handleResize,
    endResize,
  } = useRowResize(rowHeight);

  // 列のリサイズ機能
  const {
    columnWidths,
    getColumnWidth,
    setColumnWidth: _setIndividualColumnWidth,
    startResize: startColumnResize,
    handleResize: handleColumnResize,
    endResize: endColumnResize,
  } = useColumnResize(150); // デフォルトの列幅は150px

  // 表示位置(ソート・フィルター後の並び)とデータ位置の変換。
  // table は選択状態などの後に生成されるため、最新の変換器を ref 経由で参照する。
  const rowIndexMapperRef = useRef<RowIndexMapper>(identityRowIndexMapper);
  const viewToDataIndex = useCallback(
    (viewIndex: number) => rowIndexMapperRef.current.toDataIndex(viewIndex),
    []
  );

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
  } = useCellSelection(data, setData, _updateCells, viewToDataIndex);

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
    _updateCells,
    viewToDataIndex
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

  // ソート・フィルター適用中は表示順とデータ順が異なるため、行のドラッグ&ドロップによる並び替えを無効にする
  const isRowReorderDisabled = sorting.length > 0 || columnFilters.length > 0;

  // 行のドラッグ&ドロップハンドラー
  // _moveRows は毎レンダリングで新しくなるため ref 経由で参照し、handleRowReorder の参照を安定させる。
  // 参照が変わると columns が再生成され行番号セルが再マウントされて、
  // mousedown〜mouseup の間に再レンダリングが起きた場合にクリックが失われる。
  const moveRowsRef = useRef(_moveRows);
  useEffect(() => {
    moveRowsRef.current = _moveRows;
  });
  const handleRowReorder = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (isRowReorderDisabled || sourceIndex === targetIndex) return;
      moveRowsRef.current(sourceIndex, targetIndex);
    },
    [isRowReorderDisabled]
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
              isDragDisabled={isRowReorderDisabled}
              onRowReorder={handleRowReorder}
              onContextMenu={onContextMenu}
              onRowResizeStart={startResize}
              onRowResize={handleResize}
              onRowResizeEnd={endResize}
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
        size: getColumnWidth(index),
      });
    });

    return cols;
  }, [
    csvArray,
    isIgnoreHeaderRow,
    handleRowReorder,
    isRowReorderDisabled,
    openRowContextMenu,
    clearSelection,
    startResize,
    handleResize,
    endResize,
    getColumnWidth,
  ]);

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
        const cellUpdates: Array<{ rowIdx: number; colIdx: number; value: string }> = [];
        selectedCells.forEach((cellKey) => {
          const [rowStr, colStr] = cellKey.split("-");
          const dataRowIdx = viewToDataIndex(parseInt(rowStr));
          if (dataRowIdx === undefined) return;
          cellUpdates.push({ rowIdx: dataRowIdx, colIdx: parseInt(colStr), value });
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
      // 行の高さ取得
      getRowHeight,
      // 行の表示位置取得
      getViewRowIndex: (dataRowIndex: number) =>
        rowIndexMapperRef.current.toViewIndex(dataRowIndex) ?? dataRowIndex,
    },
  });

  // 表示行(ソート・フィルター後)から変換器を更新する
  const viewRows = table.getRowModel().rows;
  const rowIndexMapper = useMemo(() => createRowIndexMapper(viewRows), [viewRows]);
  rowIndexMapperRef.current = rowIndexMapper;

  // 仮想スクロールのための参照
  const tableContainerRef = useRef<HTMLDivElement>(null);
  // ヘッダーツールバー領域の参照（列選択解除の対象外にするため）
  const headerWrapperRef = useRef<HTMLDivElement>(null);

  // 行の仮想化
  // 行の高さは行の実体(データ位置)に紐づくため、表示位置からデータ位置へ変換して取得する
  const rowVirtualizer = useVirtualizer({
    count: viewRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => getRowHeight(viewRows[index]?.index ?? index),
    overscan: 10,
  });

  // 表示位置の行へスクロール（個別の行高さは仮想スクローラが反映する）
  const scrollToViewRow = useCallback(
    (viewRowIdx: number) => {
      rowVirtualizer.scrollToIndex(viewRowIdx, { align: "auto" });
    },
    [rowVirtualizer]
  );

  // 検索対象は表示中（ソート・フィルター後）の行
  const searchTargetRows = useMemo(() => viewRows.map((row) => row.original), [viewRows]);

  // 検索機能
  const {
    searchOpen,
    matchedItemPositions,
    searchedSelectedItemIdx,
    handleSearch,
    handleNextSearch,
    handlePreviousSearch,
    handleCloseSearch,
    clearMatches,
    openSearch,
  } = useTableSearch(searchTargetRows, scrollToViewRow, (row, col) => {
    // 検索結果のセルを選択状態にする
    handleCellMouseDown(row, col);
    handleCellMouseUp();
  });

  // ソート・フィルターで表示順が変わると、表示位置で持つ選択・フォーカス・検索結果は
  // 別の行を指してしまうため破棄する
  useEffect(() => {
    clearSelection();
    setFocusedCell(null);
    clearMatches();
  }, [sorting, columnFilters, clearSelection, clearMatches]);

  // rowHeightまたは個別の行の高さが変更されたときにvirtualizerを再計算
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, rowHeights, rowVirtualizer]);

  // columnWidthsが変更されたときにテーブルを再レンダリング
  useEffect(() => {
    // 列幅の変更を反映するため、強制的に再レンダリング
  }, [columnWidths]);

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
    const index = selectedColumnIndex !== null ? selectedColumnIndex : (csvArray[0]?.length ?? 0);
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

  // コンテキストメニュー外クリック時にメニューを閉じる、HeaderCell以外クリック時に列選択を解除
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

      // HeaderCell以外をクリックした場合、列選択を解除
      if (selectedColumnIndex !== null) {
        // HeaderCell（th要素）またはその子要素をクリックしたかチェック
        const isHeaderCellClick = target.closest("th") !== null;
        // ヘッダーツールバー（列操作ボタンを含む）をクリックした場合は解除しない
        const isHeaderWrapperClick = headerWrapperRef.current?.contains(target) ?? false;
        if (!isHeaderCellClick && !isHeaderWrapperClick) {
          setSelectedColumnIndex(null);
          setFocusedColumnIndex(null);
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
    selectedColumnIndex,
    rowContextMenuRef,
    columnContextMenuRef,
    handleCloseRowContextMenu,
    handleCloseColumnContextMenu,
  ]);

  // キーボードショートカット（Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z、Ctrl/Cmd+Y、Ctrl/Cmd+F、Ctrl/Cmd+C/V、Escape）
  // 入力欄(セル編集・検索・フィルター・ヘッダー編集)では標準のテキスト操作を優先する。
  // 検索(Ctrl/Cmd+F)は入力中でも動作させ、Escapeは検索欄から閉じられるようにする。
  const handleToggleSearch = useCallback(() => {
    if (searchOpen) {
      handleCloseSearch();
    } else {
      openSearch();
    }
  }, [searchOpen, openSearch, handleCloseSearch]);

  // Ctrl/Cmd+Shift+D/I/B/L/R の操作対象。
  // 行: 行番号で選択した行 > フォーカス中セルの行(表示位置→データ位置に変換)
  // 列: 列ヘッダーで選択した列 > フォーカス中セルの列
  const resolveTargetRowIndex = useCallback((): number | null => {
    if (selectedRowIndex !== null) {
      return selectedRowIndex;
    }
    if (focusedCell !== null) {
      return rowIndexMapperRef.current.toDataIndex(focusedCell.row) ?? null;
    }
    return null;
  }, [selectedRowIndex, focusedCell]);

  const resolveTargetColumnIndex = useCallback((): number | null => {
    if (selectedColumnIndex !== null) {
      return selectedColumnIndex;
    }
    return focusedCell?.col ?? null;
  }, [selectedColumnIndex, focusedCell]);

  const resetTargetSelection = useCallback(() => {
    setSelectedRowIndex(null);
    setSelectedColumnIndex(null);
    setFocusedColumnIndex(null);
    setFocusedCell(null);
    clearSelection();
  }, [clearSelection]);

  const handleShortcutDelete = useCallback(() => {
    // 行番号で行を選択している場合は行、列ヘッダーで列を選択している場合は列、
    // どちらも無ければフォーカス中セルの行を削除する
    if (selectedRowIndex === null && selectedColumnIndex !== null) {
      _deleteCol(selectedColumnIndex);
      resetTargetSelection();
      return;
    }
    const rowIndex = resolveTargetRowIndex();
    if (rowIndex !== null) {
      _deleteRow(rowIndex);
      resetTargetSelection();
    }
  }, [
    selectedRowIndex,
    selectedColumnIndex,
    _deleteCol,
    _deleteRow,
    resolveTargetRowIndex,
    resetTargetSelection,
  ]);

  const handleShortcutInsertRow = useCallback(
    (offset: 0 | 1) => {
      const rowIndex = resolveTargetRowIndex();
      if (rowIndex !== null) {
        _insertRow(rowIndex + offset);
        resetTargetSelection();
      }
    },
    [resolveTargetRowIndex, _insertRow, resetTargetSelection]
  );

  const handleShortcutInsertColumn = useCallback(
    (offset: 0 | 1) => {
      const colIndex = resolveTargetColumnIndex();
      if (colIndex !== null) {
        _insertCol(colIndex + offset);
        resetTargetSelection();
      }
    },
    [resolveTargetColumnIndex, _insertCol, resetTargetSelection]
  );

  const tableShortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      {
        key: "z",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => redo(),
      },
      {
        key: "z",
        mod: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => undo(),
      },
      {
        key: "y",
        mod: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => redo(),
      },
      { key: "f", mod: true, preventDefault: true, handler: handleToggleSearch },
      // フィルター行の切り替えは入力中でも動作させる(テキスト編集の標準動作と衝突しない)
      { key: "h", mod: true, shift: true, preventDefault: true, handler: handleToggleFilters },
      {
        key: "d",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: handleShortcutDelete,
      },
      {
        key: "i",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => handleShortcutInsertRow(0),
      },
      {
        key: "b",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => handleShortcutInsertRow(1),
      },
      {
        key: "l",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => handleShortcutInsertColumn(0),
      },
      {
        key: "r",
        mod: true,
        shift: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => handleShortcutInsertColumn(1),
      },
      {
        key: "Escape",
        preventDefault: true,
        condition: () => searchOpen,
        handler: () => handleCloseSearch(),
      },
      {
        key: "c",
        mod: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => {
          handleCopy().catch(() => {});
        },
      },
      {
        key: "v",
        mod: true,
        ignoreWhenEditing: true,
        preventDefault: true,
        handler: () => {
          handlePaste().catch(() => {});
        },
      },
    ],
    [
      undo,
      redo,
      searchOpen,
      handleToggleSearch,
      handleCloseSearch,
      handleCopy,
      handlePaste,
      handleToggleFilters,
      handleShortcutDelete,
      handleShortcutInsertRow,
      handleShortcutInsertColumn,
    ]
  );
  useKeyboardShortcuts({ shortcuts: tableShortcuts });

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
  // focusedCell.row は表示位置。DOM上の並び(仮想スクロールで描画中の行のみ)ではなく
  // data-view-row-index 属性で対象を探し、未描画の行は仮想スクローラで描画対象にする
  useEffect(() => {
    if (focusedCell === null) {
      return;
    }

    scrollToViewRow(focusedCell.row);

    const cellButton = tableContainerRef.current?.querySelector<HTMLElement>(
      `tr[data-view-row-index="${focusedCell.row}"] td[data-col-index="${focusedCell.col}"] div[role="button"]`
    );
    // 未描画の行は、描画された時点で EditableCell が自身でフォーカスを取得する
    cellButton?.focus();
  }, [focusedCell, scrollToViewRow]);

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

      // 移動範囲は表示されている行(ソート・フィルター後)
      const totalRows = viewRows.length;
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
    viewRows.length,
    csvArray,
    handleCellMouseDown,
    handleCellMouseUp,
    handleShiftClick,
  ]);

  return (
    <div className={tableStyles.root}>
      <div ref={headerWrapperRef} className={tableStyles.headerWrapper}>
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
            ].join(" ")}
          >
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
                        onColumnResizeStart={startColumnResize}
                        onColumnResize={handleColumnResize}
                        onColumnResizeEnd={endColumnResize}
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
                          }}
                        >
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
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index];
                  if (!row) return null;
                  const isRowSelected = selectedRowIndex === row.index;
                  const rowHeightValue = getRowHeight(row.index);
                  return (
                    <tr
                      key={row.id}
                      data-view-row-index={virtualRow.index}
                      className={tableStyles.dataRow}
                      style={{
                        height: `${rowHeightValue}px`,
                        minHeight: `${rowHeightValue}px`,
                        maxHeight: `${rowHeightValue}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
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
                            data-col-index={colIndex}
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
                            }}
                          >
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
