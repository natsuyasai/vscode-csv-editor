import { VscodeDivider } from "@vscode-elements/react-elements";
import { FC, useCallback, useRef, useState } from "react";
import {
  CalculatedColumn,
  CellKeyboardEvent,
  CellKeyDownArgs,
  CellMouseArgs,
  CellMouseEvent,
  DataGrid,
  DataGridHandle,
  FillEvent,
  SortColumn,
} from "react-data-grid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DataGridContext } from "@/contexts/dataGridContext";
import { useCellCopy } from "@/hooks/useCellCopy";
import { useColumns } from "@/hooks/useColumns";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useFilters } from "@/hooks/useFilters";
import { useHeaderAction } from "@/hooks/useHeaderAction";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRows } from "@/hooks/useRows";
import { useSearch } from "@/hooks/useSearch";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { useCellEditStore } from "@/stores/useCellEditStore";
import { useColumnAlignmentStore } from "@/stores/useColumnAlignmentStore";
import { useSelectedHeaderStore } from "@/stores/useSelectedHeaderStore";
import { ROW_ID_KEY, RowSizeType, CellAlignment } from "@/types";
import { canEdit } from "@/utilities/keyboard";
import { PortalManager } from "./EditableTable/PortalManager";
import styles from "./EditableTable.module.scss";
import { Header } from "./Header";
import { CustomHeaderCell, CustomHeaderCellProps } from "./Header/CustomHeaderCell";
import { CustomCell, CustomCellProps } from "./Row/CustomCell";
import { CustomRow, CustomRowProps } from "./Row/CustomRow";

interface Props {
  csvArray: Array<Array<string>>;
  theme: "light" | "dark";
  setCSVArray: (csv: Array<Array<string>>) => void;
  onApply: () => void;
}

export const EditableTable: FC<Props> = ({ csvArray, theme, setCSVArray, onApply }) => {
  const { isIgnoreHeaderRow, rowSize, setIsIgnoreHeaderRow, setRowSize } = useHeaderAction();
  const { rows, sortedRows, sortColumns, setSortColumns } = useRows(csvArray, isIgnoreHeaderRow);
  const { columns } = useColumns(csvArray, isIgnoreHeaderRow);
  const [showFilters, setShowFilters] = useState(false);

  // フィルター機能を使用（sortedRowsを使ってソート済みのデータをフィルタリング）
  const {
    filters,
    setFilter,
    clearFilters,
    clearFilter,
    isFilterActive,
    hasActiveFilters,
    filteredRows,
  } = useFilters(sortedRows);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string> | undefined>(
    (): ReadonlySet<string> => new Set()
  );
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
    moveColumns,
    moveRows,
    undo,
    redo,
    isEnabledUndo,
    isEnabledRedo,
  } = useUpdateCsvArray(csvArray, setCSVArray, isIgnoreHeaderRow);

  const setColumnAlignment = useColumnAlignmentStore((state) => state.setColumnAlignment);
  const getColumnAlignment = useColumnAlignmentStore((state) => state.getColumnAlignment);
  const selectedColumnKey = useSelectedHeaderStore((state) => state.selectedColumnKey);
  const setSelectedColumnKey = useSelectedHeaderStore((state) => state.setSelectedColumnKey);

  const gridRef = useRef<DataGridHandle>(null);
  const [isShowSearch, setIsShowSearch] = useState(false);
  const {
    isMatched,
    currentCell,
    machedCount,
    searchedSelectedItemIdx,
    handleSearch,
    handleNextSearch,
    handlePreviousSearch,
    handleClose,
  } = useSearch({
    sortedRows,
    gridRef,
  });

  const setInitialCellKey = useCellEditStore((state) => state.setInitialCellKey);
  const setEditCellPosition = useCellEditStore((state) => state.setPosition);

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

  function handleHeaderAlignmentChange(alignment: CellAlignment) {
    if (selectedColumnKey) {
      setColumnAlignment(selectedColumnKey, alignment);
    }
  }

  function handleHeaderCellClick(columnKey: string | null) {
    setSelectedColumnKey(columnKey);
  }

  const handleHeaderClickOutside = useCallback(() => {
    setSelectedColumnKey(null);
  }, [setSelectedColumnKey]);

  function handleCellContextMenu(
    args: CellMouseArgs<Record<string, string>, unknown>,
    event: CellMouseEvent
  ) {
    event.preventGridDefault();
    event.preventDefault();
    setRowContextMenuProps({
      itemIdx: rows.findIndex((item) => item[ROW_ID_KEY] === args.row[ROW_ID_KEY]),
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
      [event.columnKey]: event.sourceRow[event.columnKey],
    };
  }

  function handleKeyDown(
    args: CellKeyDownArgs<NoInfer<Record<string, string>>, unknown>,
    e: CellKeyboardEvent
  ) {
    setEditCellPosition({
      idx: args.column.idx,
      rowIdx: args.rowIdx,
    });

    // データセルにフォーカスが移動した場合、選択中のヘッダー列をクリア
    // （ヘッダーセルの場合はクリアしない）
    setSelectedColumnKey(null);

    if (args.mode === "EDIT") {
      return;
    }
    // ショートカットキー定義
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
    // セル編集開始、変更判定
    if (e.key === "Delete") {
      e.preventGridDefault();
      e.preventDefault();
      setInitialCellKey(e.key);
      args.selectCell(
        {
          idx: args.column.idx,
          rowIdx: args.rowIdx,
        },
        {
          enableEditor: true,
        }
      );
      return;
    }
    if (canEdit(e as unknown as KeyboardEvent)) {
      e.preventGridDefault();
      e.preventDefault();
      setInitialCellKey(e.key);
      args.selectCell(
        {
          idx: args.column.idx,
          rowIdx: args.rowIdx,
        },
        {
          enableEditor: true,
        }
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventGridDefault();
      e.preventDefault();
      // 行のサイズを超えたら移動は起こらないため、チェックせずに+1
      args.selectCell(
        {
          idx: args.column.idx,
          rowIdx: args.rowIdx + 1,
        },
        {
          enableEditor: false,
        }
      );
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

  // グローバルキーボードショートカット
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "z",
        ctrl: true,
        handler: () => undo(),
        stopPropagation: true,
      },
      {
        key: "y",
        ctrl: true,
        handler: () => redo(),
        stopPropagation: true,
      },
      {
        key: "f",
        ctrl: true,
        handler: () => setIsShowSearch((prev) => !prev),
        stopPropagation: true,
      },
      {
        key: "h",
        ctrl: true,
        shift: true,
        handler: () => setShowFilters((prev) => !prev),
        stopPropagation: true,
      },
    ],
    element: window as unknown as HTMLElement,
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

  const [rowHeight, setRowHeight] = useState(40);

  function handleUpdateRowHeight(_rowIdx: number, height: number) {
    const MAX_ROW_HEIGHT = 500;
    if (height > MAX_ROW_HEIGHT) {
      setRowHeight(MAX_ROW_HEIGHT);
    } else {
      setRowHeight(height);
    }
  }

  const [sortColumnsForWaitingDoubleClick, setSortColumnsForWaitingDoubleClick] = useState<
    SortColumn[]
  >([]);

  function handleColumnsReorder(sourceKey: string, targetKey: string) {
    const sourceIdx = columns.findIndex((col) => col.key === sourceKey);
    const targetIdx = columns.findIndex((col) => col.key === targetKey);
    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) {
      return;
    }
    moveColumns(sourceIdx, targetIdx);
  }

  const renderRow = useCallback(
    (props: CustomRowProps) => {
      function onRowReorder(fromIndex: number, toIndex: number) {
        moveRows(fromIndex, toIndex);
      }
      return <CustomRow key={props.rowKey} {...props} onRowReorder={onRowReorder} />;
    },
    [moveRows]
  );

  const renderCell = useCallback((props: CustomCellProps) => {
    return <CustomCell key={props.cellKey} {...props} onUpdateRowHeight={handleUpdateRowHeight} />;
  }, []);

  const renderHeaderCell = useCallback(
    (props: CustomHeaderCellProps) => {
      const columnKey = props.column.key;
      return (
        <CustomHeaderCell
          {...props}
          showFilters={showFilters}
          filterValue={filters[columnKey] || ""}
          onFilterChange={setFilter}
          onFilterClear={clearFilter}
          isFilterActive={isFilterActive(columnKey)}
          onClickOutside={handleHeaderClickOutside}
        />
      );
    },
    [showFilters, filters, setFilter, clearFilter, isFilterActive, handleHeaderClickOutside]
  );

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
          onSearch={() => setIsShowSearch(true)}
          onUpdateRowSize={setRowSizeFromHeader}
          onClickApply={onApply}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          selectedColumnKey={selectedColumnKey}
          currentAlignment={
            selectedColumnKey
              ? getColumnAlignment(selectedColumnKey)
              : ({ vertical: "center", horizontal: "left" } as CellAlignment)
          }
          onAlignmentChange={handleHeaderAlignmentChange}
        />
        <VscodeDivider className={styles.divider} />
      </div>
      <DndProvider backend={HTML5Backend}>
        <DataGridContext.Provider value={gridRef.current}>
          <DataGrid
            ref={gridRef}
            className={[styles.dataGrid, `${theme === "light" ? "rdg-light" : "rdg-dark"}`].join(
              " "
            )}
            enableVirtualization={true}
            columns={columns}
            rows={filteredRows}
            headerRowHeight={showFilters ? 60 : 35}
            rowHeight={rowHeight}
            rowKeyGetter={(row) => row[ROW_ID_KEY]}
            onRowsChange={updateRow}
            sortColumns={sortColumns}
            selectedRows={selectedRows}
            onSelectedRowsChange={() => {}}
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
                  onRowReorder: () => {}, // renderRow内で別途定義しているため不要
                }),
              renderCell: (key, props) =>
                renderCell({
                  ...props,
                  cellKey: key,
                  isSearchTarget:
                    currentCell?.rowIdx === props.rowIdx &&
                    currentCell?.colIdx === props.column.idx,
                  onUpdateRowHeight: () => {},
                  onClickRow: (rowKey) => {
                    // ヘッダーセル以外がクリックされた場合、選択中の列をクリア
                    setSelectedColumnKey(null);

                    if (rowKey) {
                      setSelectedRows(new Set([rowKey]));
                    } else {
                      setSelectedRows(undefined);
                    }
                  },
                }),
            }}
            defaultColumnOptions={{
              renderHeaderCell: (props) =>
                renderHeaderCell({
                  ...props,
                  isIgnoreHeaderRow,
                  sortColumnsForWaitingDoubleClick: sortColumnsForWaitingDoubleClick,
                  onHeaderCellContextMenu: handleHeaderCellContextMenu,
                  onHeaderEdit: handleHeaderEdit,
                  onKeyDown: handleKeyDownHeaderCell,
                  onHeaderCellClick: handleHeaderCellClick,
                  onCanSortColumnsChange: (sortColumns) => {
                    setSortColumns(sortColumns);
                  },
                  onDoubleClick: () => {
                    setSortColumnsForWaitingDoubleClick([]);
                  },
                }),
              sortable: true,
              draggable: true,
              resizable: true,
            }}
          />
          <PortalManager
            isShowSearch={isShowSearch}
            searchProps={{
              isMatching: isMatched,
              machedCount,
              searchedSelectedItemIdx,
              onSearch: handleSearch,
              onClose: () => {
                setIsShowSearch(false);
                handleClose();
              },
              onNext: handleNextSearch,
              onPrevious: handlePreviousSearch,
            }}
            isRowContextMenuOpen={isRowContextMenuOpen}
            rowContextMenuProps={{
              isContextMenuOpen: isRowContextMenuOpen,
              menuRef: rowMenuRef,
              contextMenuProps: rowContextMenuProps,
              className: styles.contextMenu,
              onSelect: handleSelectRowContextMenu,
              onClose: () => setRowContextMenuProps(null),
            }}
            isHeaderContextMenuOpen={isHeaderContextMenuOpen}
            headerContextMenuProps={{
              isContextMenuOpen: isHeaderContextMenuOpen,
              menuRef: headerMenuRef,
              contextMenuProps: headerContextMenuProps,
              className: styles.contextMenu,
              onSelect: handleSelectHeaderContextMenu,
              onClose: () => setHeaderContextMenuProps(null),
            }}
          />
        </DataGridContext.Provider>
      </DndProvider>
    </>
  );
};
