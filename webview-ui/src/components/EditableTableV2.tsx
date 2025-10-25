import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  CellContext,
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
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { ROW_ID_KEY, ROW_IDX_KEY, RowSizeType } from "@/types";
import styles from "./EditableTable.module.scss";
import { Header } from "./Header";
import cellEditStyles from "./Row/TextAreaEditor.module.scss";
import { Search } from "./Search";

interface Props {
  csvArray: Array<Array<string>>;
  theme: "light" | "dark";
  setCSVArray: (csv: Array<Array<string>>) => void;
  onApply: () => void;
}

type RowData = Record<string, string>;

// TableMetaの型を拡張
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    updateData?: (rowIndex: number, columnId: string, value: string) => void;
    selectedRowIndex?: number | null;
    setSelectedRowIndex?: (index: number | null) => void;
    selectedCells?: Set<string>;
    handleCellMouseDown?: (row: number, col: number) => void;
    handleCellMouseEnter?: (row: number, col: number) => void;
    handleCellMouseUp?: () => void;
  }
}

// フィルター入力コンポーネント
interface FilterInputProps {
  column: {
    getFilterValue: () => unknown;
    setFilterValue: (value: string) => void;
  };
}

const FilterInput: FC<FilterInputProps> = ({ column }) => {
  const columnFilterValue = column.getFilterValue() as string;

  return (
    <input
      type="text"
      value={columnFilterValue ?? ""}
      onChange={(e) => {
        column.setFilterValue(e.target.value);
      }}
      placeholder="フィルター..."
      style={{
        width: "100%",
        padding: "4px",
        boxSizing: "border-box",
        border: "1px solid var(--vscode-input-border)",
        backgroundColor: "var(--vscode-input-background)",
        color: "var(--vscode-input-foreground)",
        fontSize: "12px",
        fontFamily: "var(--vscode-font-family)",
      }}
    />
  );
};

// 行番号セルコンポーネント
interface RowIndexCellProps extends CellContext<RowData, unknown> {
  isSelected: boolean;
  onSelect: () => void;
}

const RowIndexCell = (props: RowIndexCellProps) => {
  return (
    <div
      onClick={props.onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          props.onSelect();
        }
      }}
      style={{
        width: "100%",
        height: "100%",
        padding: "8px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backgroundColor: props.isSelected
          ? "var(--vscode-list-activeSelectionBackground)"
          : "transparent",
        color: props.isSelected
          ? "var(--vscode-list-activeSelectionForeground)"
          : "inherit",
      }}>
      {props.getValue() as string}
    </div>
  );
};

// 編集可能なセルコンポーネント
const EditableCell = (props: CellContext<RowData, unknown>) => {
  const cellValue = props.getValue();
  let initialValue = "";
  if (typeof cellValue === "string") {
    initialValue = cellValue;
  } else if (typeof cellValue === "number" || typeof cellValue === "boolean") {
    initialValue = String(cellValue);
  }
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  // セル選択状態の取得
  const rowIndex = props.row.index;
  const columnId = props.column.id;
  const columnIndex = columnId.startsWith('col') ? parseInt(columnId.substring(3)) : -1;
  const cellKey = `${rowIndex}-${columnIndex}`;
  const isSelected = props.table.options.meta?.selectedCells?.has(cellKey) ?? false;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const textLen = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(textLen, textLen);
    }
  }, [isEditing]);

  const handleClick = () => {
    clickCountRef.current += 1;

    if (clickCountRef.current === 2) {
      // ダブルクリック
      setIsEditing(true);
      clickCountRef.current = 0;
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    } else {
      // シングルクリック - タイムアウト後にリセット
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = window.setTimeout(() => {
        clickCountRef.current = 0;
        clickTimeoutRef.current = null;
      }, 300);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    props.table.options.meta?.updateData?.(props.row.index, props.column.id, value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      props.table.options.meta?.updateData?.(props.row.index, props.column.id, value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        className={cellEditStyles.textArea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "0",
          boxSizing: "border-box",
          padding: "8px",
          margin: 0,
          border: "1px solid var(--vscode-focusBorder)",
          backgroundColor: "var(--vscode-input-background)",
          color: "var(--vscode-input-foreground)",
          resize: "none",
          lineHeight: "1.5",
          fontSize: "13px",
          fontFamily: "var(--vscode-font-family)",
          overflow: "auto",
        }}
      />
    );
  }

  return (
    <div
      ref={cellRef}
      onClick={handleClick}
      onMouseDown={() => {
        if (columnIndex >= 0) {
          props.table.options.meta?.handleCellMouseDown?.(rowIndex, columnIndex);
        }
      }}
      onMouseEnter={() => {
        if (columnIndex >= 0) {
          props.table.options.meta?.handleCellMouseEnter?.(rowIndex, columnIndex);
        }
      }}
      onMouseUp={() => {
        props.table.options.meta?.handleCellMouseUp?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setIsEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        width: "100%",
        height: "100%",
        cursor: "text",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "8px",
        boxSizing: "border-box",
        backgroundColor: isSelected
          ? "var(--vscode-list-inactiveSelectionBackground)"
          : "transparent",
        border: isSelected
          ? "1px solid var(--vscode-list-activeSelectionBackground)"
          : "1px solid transparent",
      }}>
      {value}
    </div>
  );
};

export const EditableTableV2: FC<Props> = ({ csvArray, theme, setCSVArray, onApply }) => {
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

  // 検索機能のstate
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedItemPositions, setMatchedItemPositions] = useState<Array<{ rowIdx: number; colIdx: number }>>([]);
  const [searchedSelectedItemIdx, setSearchedSelectedItemIdx] = useState(0);

  // セル選択のヘルパー関数
  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectedCells(new Set([getCellKey(row, col)]));
  }, []);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;

    const minRow = Math.min(selectionStart.row, row);
    const maxRow = Math.max(selectionStart.row, row);
    const minCol = Math.min(selectionStart.col, col);
    const maxCol = Math.max(selectionStart.col, col);

    const newSelection = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelection.add(getCellKey(r, c));
      }
    }
    setSelectedCells(newSelection);
  }, [isSelecting, selectionStart]);

  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // マウスアップイベントをdocumentに登録
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      setIsSelecting(false);
    };
    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, []);

  // 選択中のセルに一括で値を設定する関数
  const handleBulkEdit = useCallback(() => {
    if (selectedCells.size === 0) {
      return;
    }

    const value = window.prompt('選択したセルに設定する値を入力してください:');
    if (value === null) {
      return; // キャンセルされた
    }

    // 選択中のセルを更新
    setData((old) => {
      const newData = [...old];
      selectedCells.forEach((cellKey) => {
        const [rowStr, colStr] = cellKey.split('-');
        const rowIndex = parseInt(rowStr);
        const colIndex = parseInt(colStr);
        const columnId = `col${colIndex}`;

        if (newData[rowIndex]) {
          newData[rowIndex] = {
            ...newData[rowIndex],
            [columnId]: value,
          };
        }
      });
      return newData;
    });

    // 選択をクリア
    setSelectedCells(new Set());
  }, [selectedCells]);

  // 選択中のセルをコピーする関数
  const handleCopy = useCallback(async () => {
    if (selectedCells.size === 0) {
      return;
    }

    // 選択されたセルを行と列でグループ化
    const cellsArray = Array.from(selectedCells).map((cellKey) => {
      const [rowStr, colStr] = cellKey.split('-');
      return {
        row: parseInt(rowStr),
        col: parseInt(colStr),
      };
    });

    // 行と列でソート
    cellsArray.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    // TSV形式でデータを作成（Excelと互換性あり）
    const minRow = Math.min(...cellsArray.map(c => c.row));
    const maxRow = Math.max(...cellsArray.map(c => c.row));
    const minCol = Math.min(...cellsArray.map(c => c.col));
    const maxCol = Math.max(...cellsArray.map(c => c.col));

    const rows: string[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      const cols: string[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const columnId = `col${col}`;
        const value = data[row]?.[columnId] ?? '';
        cols.push(value);
      }
      rows.push(cols.join('\t'));
    }

    const text = rows.join('\n');

    // クリップボードにコピー
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err);
    }
  }, [selectedCells, data]);

  // クリップボードからペーストする関数
  const handlePaste = useCallback(async () => {
    if (selectedCells.size === 0) {
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split('\n').map(row => row.split('\t'));

      // 選択範囲の左上のセルを取得
      const cellsArray = Array.from(selectedCells).map((cellKey) => {
        const [rowStr, colStr] = cellKey.split('-');
        return {
          row: parseInt(rowStr),
          col: parseInt(colStr),
        };
      });
      const minRow = Math.min(...cellsArray.map(c => c.row));
      const minCol = Math.min(...cellsArray.map(c => c.col));

      // データを更新
      setData((old) => {
        const newData = [...old];
        rows.forEach((rowData, rowOffset) => {
          rowData.forEach((cellValue, colOffset) => {
            const targetRow = minRow + rowOffset;
            const targetCol = minCol + colOffset;
            const columnId = `col${targetCol}`;

            if (newData[targetRow] && targetCol >= 0) {
              newData[targetRow] = {
                ...newData[targetRow],
                [columnId]: cellValue,
              };
            }
          });
        });
        return newData;
      });

      // 選択をクリア
      setSelectedCells(new Set());
    } catch (err) {
      console.error('クリップボードからの読み取りに失敗しました:', err);
    }
  }, [selectedCells]);

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
          /* eslint-disable react/prop-types */
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
          /* eslint-enable react/prop-types */
          return <RowIndexCell {...props} isSelected={isSelected} onSelect={onSelect} />;
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
  }, [csvArray, isIgnoreHeaderRow]);

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

  // 検索ハンドラー
  const handleSearch = useCallback((text: string) => {
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
        const colIdx = parseInt(key.replace('col', ''));
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
      behavior: 'smooth',
    });
  }, [data, rowHeight]);

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
      behavior: 'smooth',
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
      behavior: 'smooth',
    });
  }, [matchedItemPositions, searchedSelectedItemIdx, rowHeight]);

  const handleCloseSearch = useCallback(() => {
    setMatchedItemPositions([]);
    setSearchedSelectedItemIdx(0);
    setSearchOpen(false);
  }, []);

  function setRowSizeFromHeader(size: RowSizeType) {
    switch (size) {
      case "small":
        setRowHeight(24);
        break;
      case "normal":
        setRowHeight(40);
        break;
      case "large":
        setRowHeight(80);
        break;
      case "extra large":
        setRowHeight(120);
        break;
      default:
        setRowHeight(40);
        break;
    }
    setRowSize(size);
  }

  const handleApply = useCallback(() => {
    onApply();
  }, [onApply]);

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
          selectedColumnKey={null}
          currentAlignment={{ vertical: "center", horizontal: "left" }}
          onAlignmentChange={() => {}}
        />
        <VscodeDivider className={styles.divider} />
      </div>
      {searchOpen && (
        <Search
          isMatching={matchedItemPositions.length > 0}
          machedCount={matchedItemPositions.length}
          searchedSelectedItemIdx={searchedSelectedItemIdx}
          onSearch={handleSearch}
          onNext={handleNextSearch}
          onPrevious={handlePreviousSearch}
          onClose={handleCloseSearch}
        />
      )}
      <div style={{ padding: "8px", display: "flex", gap: "8px", borderBottom: "1px solid var(--vscode-panel-border)" }}>
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
            backgroundColor: selectedRowIndex === null
              ? "var(--vscode-button-secondaryBackground)"
              : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedRowIndex === null ? 0.5 : 1,
          }}>
          行を削除
        </button>
        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--vscode-panel-border)" }} />
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
            backgroundColor: selectedColumnIndex === null
              ? "var(--vscode-button-secondaryBackground)"
              : "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "2px",
            opacity: selectedColumnIndex === null ? 0.5 : 1,
          }}>
          列を削除
        </button>
        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--vscode-panel-border)" }} />
        <button
          onClick={handleBulkEdit}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor: selectedCells.size === 0
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
          onClick={() => setSelectedCells(new Set())}
          disabled={selectedCells.size === 0}
          style={{
            padding: "4px 8px",
            cursor: selectedCells.size === 0 ? "not-allowed" : "pointer",
            backgroundColor: selectedCells.size === 0
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
            backgroundColor: selectedCells.size === 0
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
            backgroundColor: selectedCells.size === 0
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
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", display: "block" }}>
            <thead style={{
              display: "table",
              width: "100%",
              tableLayout: "fixed",
              position: "sticky",
              top: 0,
              zIndex: 1,
              backgroundColor: "var(--vscode-editor-background)"
            }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ display: "table-row" }}>
                  {headerGroup.headers.map((header, headerIndex) => {
                    const columnIndex = header.column.id === ROW_IDX_KEY ? null : headerIndex - 1;
                    const isSelected = columnIndex !== null && selectedColumnIndex === columnIndex;
                    return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      onContextMenu={(e) => {
                        if (columnIndex !== null) {
                          e.preventDefault();
                          if (selectedColumnIndex === columnIndex) {
                            setSelectedColumnIndex(null);
                          } else {
                            setSelectedColumnIndex(columnIndex);
                          }
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
                        backgroundColor: isSelected
                          ? "var(--vscode-list-activeSelectionBackground)"
                          : "var(--vscode-editor-background)",
                        color: isSelected
                          ? "var(--vscode-list-activeSelectionForeground)"
                          : "inherit",
                        boxSizing: "border-box",
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                        userSelect: "none",
                      }}>
                      {header.isPlaceholder
                        ? null
                        : (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: " 🔼",
                              desc: " 🔽",
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                    </th>
                    );
                  })}
                </tr>
              ))}
              {showFilters && table.getHeaderGroups().map((headerGroup) => (
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
            <tbody style={{
              display: "block",
              position: "relative",
              height: `${rowVirtualizer.getTotalSize()}px`
            }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index];
                if (!row) return null;
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
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
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
                        }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DndProvider>
      </div>
    </>
  );
};
