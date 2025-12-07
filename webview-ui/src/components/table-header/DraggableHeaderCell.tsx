import { FC, useState, useRef, useCallback, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { DraggableHeaderCellProps } from "../editable-table/types";
import styles from "./DraggableHeaderCell.module.scss";

/**
 * ドラッグ可能なヘッダーセルコンポーネント
 * - 列の並び替え（ドラッグ&ドロップ）
 * - ソート機能（ダブルクリック判定付き）
 * - 列選択
 * - フォーカス管理
 */
export const DraggableHeaderCell: FC<DraggableHeaderCellProps> = ({
  columnIndex,
  children,
  onColumnReorder,
  onSort,
  onDoubleClick,
  onColumnSelect,
  onFocusChange,
  isSelected,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const sortTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WAIT_DOUBLE_CLICK_TH_MS = 500;

  const [{ isDragging }, drag] = useDrag({
    type: "COL_DRAG",
    item: { index: columnIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: "COL_DRAG",
    drop: (item: { index: number }) => {
      onColumnReorder(item.index, columnIndex);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      drag(node);
      drop(node);
    },
    [drag, drop]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // フォーカスされていない場合は何もしない（フォーカスのみ）
      if (!isFocused) {
        return;
      }

      // タイマーが既にセットされている場合は何もしない
      if (sortTimeoutRef.current !== null) {
        return;
      }

      // 未選択のセルをクリックした場合は、選択状態にする（ソートは行わない）
      if (!isSelected) {
        if (onColumnSelect) {
          onColumnSelect(columnIndex);
        }
        return;
      }

      // 既に選択されているセルをクリック → ダブルクリック判定待ちタイマーをセット
      if (onSort) {
        sortTimeoutRef.current = setTimeout(() => {
          sortTimeoutRef.current = null;
          onSort(e);
        }, WAIT_DOUBLE_CLICK_TH_MS);
      }
    },
    [isFocused, isSelected, onSort, onColumnSelect, columnIndex]
  );

  const handleDoubleClick = useCallback(
    (_e: React.MouseEvent) => {
      // ダブルクリック時はタイマーをクリアしてソートを防止
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
        sortTimeoutRef.current = null;
      }

      if (onDoubleClick) {
        onDoubleClick();
      }
    },
    [onDoubleClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && isFocused && isSelected && onSort) {
        e.preventDefault();
        onSort(e);
      }
    },
    [isFocused, isSelected, onSort]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (onFocusChange) {
      onFocusChange(true);
    }
  }, [onFocusChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (onFocusChange) {
      onFocusChange(false);
    }
  }, [onFocusChange]);

  // クラス名を決定
  const cellClassName = `${styles.headerCell} ${
    isOver ? styles.headerCellHover : styles.headerCellNormal
  } ${isFocused ? styles.headerCellFocused : ""} ${isDragging ? styles.headerCellDragging : ""}`;

  return (
    <div
      ref={combinedRef}
      className={cellClassName}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </div>
  );
};
