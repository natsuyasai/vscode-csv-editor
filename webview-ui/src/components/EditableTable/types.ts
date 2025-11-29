import { CellContext } from "@tanstack/react-table";

/**
 * EditableTableのProps型
 */
export interface EditableTableProps {
  csvArray: Array<Array<string>>;
  theme: "light" | "dark";
  setCSVArray: (csv: Array<Array<string>>) => void;
  onApply: () => void;
}

/**
 * 行データの型
 */
export type RowData = Record<string, string>;

/**
 * TableMetaの型拡張
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> {
    updateData?: (rowIndex: number, columnId: string, value: string) => void;
    selectedRowIndex?: number | null;
    setSelectedRowIndex?: (index: number | null) => void;
    selectedCells?: Set<string>;
    focusedCell?: { row: number; col: number } | null;
    setFocusedCell?: (cell: { row: number; col: number } | null) => void;
    clearSelection?: () => void;
    handleCellMouseDown?: (row: number, col: number) => void;
    handleCellMouseEnter?: (row: number, col: number) => void;
    handleCellMouseUp?: () => void;
    handleShiftClick?: (row: number, col: number) => void;
    applyValueToSelectedCells?: (value: string) => void;
    // オートフィル関連
    isFilling?: boolean;
    isInFillRange?: (row: number, col: number) => boolean;
    handleFillStart?: (row: number, col: number) => void;
    handleFillMove?: (row: number, col: number) => void;
    handleFillEnd?: () => void;
  }
}

/**
 * FilterInputコンポーネントのProps型
 */
export interface FilterInputProps {
  column: {
    getFilterValue: () => unknown;
    setFilterValue: (value: string) => void;
  };
}

/**
 * DraggableHeaderCellコンポーネントのProps型
 */
export interface DraggableHeaderCellProps {
  columnIndex: number;
  children: React.ReactNode;
  onColumnReorder: (sourceIndex: number, targetIndex: number) => void;
  onSort?: (event: unknown) => void;
  onDoubleClick?: () => void;
  onColumnSelect?: (columnIndex: number) => void;
  onFocusChange?: (isFocused: boolean) => void;
  isSelected: boolean;
}

/**
 * RowIndexCellコンポーネントのProps型
 */
export interface RowIndexCellProps extends CellContext<RowData, unknown> {
  isSelected: boolean;
  onSelect: () => void;
  onRowReorder?: (sourceIndex: number, targetIndex: number) => void;
  onContextMenu?: (e: React.MouseEvent, rowIndex: number) => void;
  rowIndex: number;
  onRowResizeStart?: (rowIndex: number) => void;
  onRowResize?: (rowIndex: number, deltaY: number) => void;
  onRowResizeEnd?: () => void;
}

/**
 * コンテキストメニューの位置情報
 */
export interface ContextMenuPosition {
  itemIdx: number;
  top: number;
  left: number;
}
