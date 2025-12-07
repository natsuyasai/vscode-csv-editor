import {
  VscodeButton,
  VscodeCheckbox,
  VscodeIcon,
  VscodeLabel,
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";
import { FC } from "react";
import { useAlignmentModeStore } from "@/stores/useAlignmentModeStore";
import { RowSizeType, CellAlignment } from "@/types";
import { CellAlignmentControls } from "./CellAlignmentControls";
import styles from "./Header.module.scss";

export interface HeaderProps {
  isIgnoreHeaderRow: boolean;
  onUpdateIgnoreHeaderRow: (checked: boolean) => void;
  rowSize: RowSizeType;
  onUpdateRowSize: (rowSize: RowSizeType) => void;
  onSearch: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isEnabledUndo: boolean;
  isEnabledRedo: boolean;
  onClickApply: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  selectedColumnKey?: string | null;
  currentAlignment?: CellAlignment;
  onAlignmentChange?: (alignment: CellAlignment) => void;
  // 行/列操作
  onInsertRow?: () => void;
  onDeleteRow?: () => void;
  isRowSelected?: boolean;
  onInsertColumn?: () => void;
  onDeleteColumn?: () => void;
  isColumnSelected?: boolean;
  // セル操作
  onBulkEdit?: () => void;
  onClearSelection?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  selectedCellsCount?: number;
}

export const Header: FC<HeaderProps> = ({
  isIgnoreHeaderRow,
  onUpdateIgnoreHeaderRow,
  rowSize,
  onUpdateRowSize,
  onSearch,
  onUndo,
  onRedo,
  isEnabledUndo,
  isEnabledRedo,
  onClickApply,
  showFilters = false,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters = false,
  selectedColumnKey,
  currentAlignment,
  onAlignmentChange,
  onInsertRow,
  onDeleteRow,
  isRowSelected = false,
  onInsertColumn,
  onDeleteColumn,
  isColumnSelected = false,
  onBulkEdit,
  onClearSelection,
  onCopy,
  onPaste,
  selectedCellsCount = 0,
}) => {
  // Zustandの状態を分割して取得（再レンダリングを確実にするため）
  const isAlignmentModeEnabled = useAlignmentModeStore((state) => state.isAlignmentModeEnabled);
  const setAlignmentModeEnabled = useAlignmentModeStore((state) => state.setAlignmentModeEnabled);
  return (
    <>
      <div className={styles.headerRoot}>
        <VscodeCheckbox
          label="Ignore Header Row"
          tabIndex={0}
          aria-label="Ignore Header Row"
          checked={isIgnoreHeaderRow}
          onChange={(e) => {
            if (e.target instanceof HTMLElement) {
              const target = e.target as HTMLInputElement;
              onUpdateIgnoreHeaderRow(target.checked);
            }
          }}
        ></VscodeCheckbox>
        <div className={styles.rowSize}>
          <VscodeLabel>Row size :</VscodeLabel>
          <VscodeSingleSelect
            tabIndex={0}
            aria-label="Row size"
            className={styles.rowSizeSelect}
            onChange={(e) => {
              if (e.target instanceof HTMLElement) {
                const target = e.target as HTMLSelectElement;
                onUpdateRowSize(target.value as RowSizeType);
              }
            }}
          >
            <VscodeOption aria-label="small" value="small" selected={rowSize === "small"}>
              small
            </VscodeOption>
            <VscodeOption aria-label="normal" value="normal" selected={rowSize === "normal"}>
              normal
            </VscodeOption>
            <VscodeOption aria-label="large" value="large" selected={rowSize === "large"}>
              large
            </VscodeOption>
            <VscodeOption
              aria-label="extra large"
              value="extra large"
              selected={rowSize === "extra large"}
            >
              extra large
            </VscodeOption>
          </VscodeSingleSelect>
        </div>
        <div className={styles.buttons}>
          <VscodeButton
            tabIndex={0}
            aria-label="undo"
            secondary
            disabled={!isEnabledUndo}
            onClick={() => onUndo()}
          >
            <VscodeIcon name="discard" action-icon />
          </VscodeButton>
          <VscodeButton
            tabIndex={0}
            aria-label="redo"
            secondary
            disabled={!isEnabledRedo}
            onClick={() => onRedo()}
          >
            <VscodeIcon name="redo" action-icon />
          </VscodeButton>
          <VscodeButton
            tabIndex={0}
            aria-label="search"
            aria-description="Search text"
            secondary
            onClick={() => onSearch()}
          >
            <VscodeIcon name="search" action-icon />
          </VscodeButton>
          {onToggleFilters && (
            <VscodeButton
              tabIndex={0}
              aria-label="toggle filters"
              aria-description="Toggle column filters"
              secondary
              onClick={() => onToggleFilters()}
            >
              <VscodeIcon name={showFilters ? "filter-filled" : "filter"} action-icon />
            </VscodeButton>
          )}
          {onClearFilters && hasActiveFilters && (
            <VscodeButton
              tabIndex={0}
              aria-label="clear filters"
              aria-description="Clear all filters"
              secondary
              onClick={() => onClearFilters()}
            >
              <VscodeIcon name="clear-all" action-icon />
            </VscodeButton>
          )}
          {onInsertRow && (
            <VscodeButton
              tabIndex={0}
              aria-label="insert row"
              aria-description="Insert row"
              secondary
              onClick={() => onInsertRow()}
            >
              <VscodeIcon name="add" action-icon />
              行を追加
            </VscodeButton>
          )}
          {onDeleteRow && (
            <VscodeButton
              tabIndex={0}
              aria-label="delete row"
              aria-description="Delete selected row"
              secondary
              disabled={!isRowSelected}
              onClick={() => onDeleteRow()}
            >
              <VscodeIcon name="trash" action-icon />
              行を削除
            </VscodeButton>
          )}
          {onInsertColumn && (
            <VscodeButton
              tabIndex={0}
              aria-label="insert column"
              aria-description="Insert column"
              secondary
              onClick={() => onInsertColumn()}
            >
              <VscodeIcon name="add" action-icon />
              列を追加
            </VscodeButton>
          )}
          {onDeleteColumn && (
            <VscodeButton
              tabIndex={0}
              aria-label="delete column"
              aria-description="Delete selected column"
              secondary
              disabled={!isColumnSelected}
              onClick={() => onDeleteColumn()}
            >
              <VscodeIcon name="trash" action-icon />
              列を削除
            </VscodeButton>
          )}
          {onBulkEdit && (
            <VscodeButton
              tabIndex={0}
              aria-label="bulk edit"
              aria-description={`Bulk edit ${selectedCellsCount} cells`}
              secondary
              disabled={selectedCellsCount === 0}
              onClick={() => onBulkEdit()}
            >
              <VscodeIcon name="edit" action-icon />
              一括編集 ({selectedCellsCount})
            </VscodeButton>
          )}
          {onClearSelection && (
            <VscodeButton
              tabIndex={0}
              aria-label="clear selection"
              aria-description="Clear cell selection"
              secondary
              disabled={selectedCellsCount === 0}
              onClick={() => onClearSelection()}
            >
              <VscodeIcon name="close" action-icon />
            </VscodeButton>
          )}
          {onCopy && (
            <VscodeButton
              tabIndex={0}
              aria-label="copy"
              aria-description={`Copy ${selectedCellsCount} cells`}
              secondary
              disabled={selectedCellsCount === 0}
              onClick={() => onCopy()}
            >
              <VscodeIcon name="copy" action-icon />
              コピー ({selectedCellsCount}セル)
            </VscodeButton>
          )}
          {onPaste && (
            <VscodeButton
              tabIndex={0}
              aria-label="paste"
              aria-description="Paste cells"
              secondary
              disabled={selectedCellsCount === 0}
              onClick={() => onPaste()}
            >
              <VscodeIcon name="clippy" action-icon />
              ペースト
            </VscodeButton>
          )}
          <VscodeButton
            tabIndex={0}
            aria-label="toggle alignment mode"
            aria-description="Toggle cell alignment mode"
            {...(isAlignmentModeEnabled ? {} : { secondary: true })}
            onClick={() => setAlignmentModeEnabled(!isAlignmentModeEnabled)}
          >
            <VscodeIcon name="layout" action-icon />
          </VscodeButton>
        </div>
        <div className={styles.apply}>
          <VscodeButton
            tabIndex={0}
            aria-label="save"
            className={styles.applyButton}
            onClick={(_e) => onClickApply()}
          >
            <VscodeIcon name="save" action-icon />
            Save
          </VscodeButton>
        </div>
      </div>
      {onAlignmentChange && currentAlignment && isAlignmentModeEnabled && (
        <CellAlignmentControls
          selectedColumnKey={selectedColumnKey ?? null}
          currentAlignment={currentAlignment}
          onAlignmentChange={onAlignmentChange}
        />
      )}
    </>
  );
};
