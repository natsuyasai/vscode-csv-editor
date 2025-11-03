import { CellContext } from "@tanstack/react-table";
import { FC, useEffect, useRef, useState } from "react";
import styles from "./EditableCell.module.scss";
import { RowData } from "./types";

/**
 * 編集可能なセルコンポーネント
 *
 * セルの表示と編集を管理します。
 * - ダブルクリックで編集モード
 * - キーボードショートカット（Enter、Space、Delete、Backspace、文字入力）
 * - セル選択のサポート
 */
export const EditableCell: FC<CellContext<RowData, unknown>> = (props) => {
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
  const columnIndex = columnId.startsWith("col") ? parseInt(columnId.substring(3)) : -1;
  const cellKey = `${rowIndex}-${columnIndex}`;
  const isInSelectedCells = props.table.options.meta?.selectedCells?.has(cellKey) ?? false;

  // focusedCellを安全に取得
  const meta = props.table.options.meta;
  const focusedCellValue = meta?.focusedCell;
  const isFocused =
    focusedCellValue !== null &&
    focusedCellValue !== undefined &&
    focusedCellValue.row === rowIndex &&
    focusedCellValue.col === columnIndex;

  const isSelected = isInSelectedCells || isFocused;

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

      // Ctrl+Enter: 選択中のすべてのセルに同じ値を適用
      if (e.ctrlKey || e.metaKey) {
        const selectedCells = props.table.options.meta?.selectedCells;
        if (selectedCells && selectedCells.size > 1) {
          // 複数セルが選択されている場合は一括適用
          props.table.options.meta?.applyValueToSelectedCells?.(value);
        } else {
          // 単一セルの場合は通常の更新
          props.table.options.meta?.updateData?.(props.row.index, props.column.id, value);
        }
      } else {
        // 通常のEnter: 現在のセルのみ更新
        props.table.options.meta?.updateData?.(props.row.index, props.column.id, value);
      }
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
        className={styles.textArea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={1}
      />
    );
  }

  const isInFillRangeFn = props.table.options.meta?.isInFillRange as
    | ((row: number, col: number) => boolean)
    | undefined;
  const isFillRange = isInFillRangeFn ? isInFillRangeFn(rowIndex, columnIndex) : false;

  // セルのクラス名を決定
  const cellClassName = `${styles.cell} ${
    isFillRange ? styles.cellFillRange : isSelected ? styles.cellSelected : styles.cellNormal
  }`;

  return (
    <div
      ref={cellRef}
      className={cellClassName}
      onClick={handleClick}
      onMouseDown={(e) => {
        if (columnIndex >= 0) {
          // 行選択を解除
          props.table.options.meta?.setSelectedRowIndex?.(null);

          // Shiftキーが押されている場合は範囲選択
          if (e.shiftKey) {
            props.table.options.meta?.handleShiftClick?.(rowIndex, columnIndex);
          } else {
            props.table.options.meta?.handleCellMouseDown?.(rowIndex, columnIndex);
          }
        }
      }}
      onMouseEnter={() => {
        if (columnIndex >= 0) {
          props.table.options.meta?.handleCellMouseEnter?.(rowIndex, columnIndex);

          // オートフィル中の場合は、フィル範囲を更新
          if (props.table.options.meta?.isFilling) {
            props.table.options.meta?.handleFillMove?.(rowIndex, columnIndex);
          }
        }
      }}
      onMouseUp={() => {
        props.table.options.meta?.handleCellMouseUp?.();
      }}
      onFocus={() => {
        // Tab移動などでフォーカスを受け取った時にfocusedCellを更新
        if (columnIndex >= 0) {
          // 以前の選択をクリア
          const clearSelectionFn = props.table.options.meta?.clearSelection as (() => void) | undefined;
          clearSelectionFn?.();

          // 新しいフォーカスセルを設定
          const setFocusedCellFn = props.table.options.meta?.setFocusedCell as
            | ((cell: { row: number; col: number } | null) => void)
            | undefined;
          setFocusedCellFn?.({ row: rowIndex, col: columnIndex });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          setIsEditing(true);
        } else if (e.key === "Delete") {
          // Deleteキー: 内容をクリアするが、編集モードには移行しない
          e.preventDefault();
          setValue("");
          props.table.options.meta?.updateData?.(props.row.index, props.column.id, "");
        } else if (e.key === "Backspace") {
          // Backspaceキー: 内容をクリアして編集モードに移行
          e.preventDefault();
          setValue("");
          setIsEditing(true);
        } else if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat && e.key.length === 1) {
          // 通常の文字入力: 内容をクリアして入力した文字から編集モードに移行
          e.preventDefault();
          setValue(e.key);
          setIsEditing(true);
        }
      }}
      role="button"
      tabIndex={0}>
      {value}
      {/* フィルハンドル（選択中のセルにのみ表示） */}
      {isSelected && !isEditing && (
        <div
          className={styles.fillHandle}
          role="button"
          aria-label="Auto fill handle"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (columnIndex >= 0) {
              const handleFillStartFn = props.table.options.meta?.handleFillStart as
                | ((row: number, col: number) => void)
                | undefined;
              handleFillStartFn?.(rowIndex, columnIndex);
            }
          }}
        />
      )}
    </div>
  );
};
