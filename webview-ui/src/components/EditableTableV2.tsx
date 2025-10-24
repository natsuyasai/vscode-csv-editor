import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  CellContext,
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
  }
}

// 行番号セルコンポーネント
const RowIndexCell = (props: CellContext<RowData, unknown>) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "8px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
        cell: RowIndexCell,
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
    getCoreRowModel: getCoreRowModel(),
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
          onSearch={() => {}}
          onUpdateRowSize={setRowSizeFromHeader}
          onClickApply={handleApply}
          showFilters={false}
          onToggleFilters={() => {}}
          onClearFilters={() => {}}
          hasActiveFilters={false}
          selectedColumnKey={null}
          currentAlignment={{ vertical: "center", horizontal: "left" }}
          onAlignmentChange={() => {}}
        />
        <VscodeDivider className={styles.divider} />
      </div>
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
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        display: "table-cell",
                        width: `${header.getSize()}px`,
                        minWidth: `${header.getSize()}px`,
                        maxWidth: `${header.getSize()}px`,
                        padding: "8px",
                        textAlign: "left",
                        borderBottom: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-editor-background)",
                        boxSizing: "border-box",
                      }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
    </>
  );
};
