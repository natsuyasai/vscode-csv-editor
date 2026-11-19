import {
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * EditableTable が使う TanStack Table の機能。
 * v9 では使う機能を明示的に登録する必要があるため、v8 で使っていたものだけを登録する。
 * - rowSortingFeature + sortedRowModel: ヘッダーでのソート（比較関数は列定義の sortFn で v8 互換のものを指定）
 * - columnFilteringFeature + filteredRowModel + includesString: フィルター行（v8 の "auto" は文字列列で includesString）
 * - columnSizingFeature: 列幅（size / getSize）
 * - columnResizingFeature: 列定義の enableResizing（リサイズ自体は独自フックで行う）
 * - columnVisibilityFeature: row.getVisibleCells()
 */
export const editableTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
});

export type EditableTableFeatures = typeof editableTableFeatures;
