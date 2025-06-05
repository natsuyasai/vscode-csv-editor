import { FC, useCallback, useEffect, useRef, useState } from "react";
import { CalculatedColumn, RenderHeaderCellProps, SortColumn } from "react-data-grid";
import { useDrag, useDrop } from "react-dnd";
import styles from "./CustomHeaderCell.module.scss";
import { canEdit } from "@/utilities/keyboard";

interface Props {
  isIgnoreHeaderRow: boolean;
  sortColumnsForWaitingDoubleClick: SortColumn[];
  onHeaderCellContextMenu: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: MouseEvent
  ) => void;
  onHeaderEdit: (cellIdx: number, updateText: string) => void;
  onKeyDown: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: KeyboardEvent
  ) => void;
  onCanSortColumnsChange: (sortColumns: SortColumn[]) => void;
  onDoubleClick: () => void;
}

export type CustomHeaderCellProps = Props &
  RenderHeaderCellProps<NoInfer<Record<string, string>>, unknown>;

export const CustomHeaderCell: FC<CustomHeaderCellProps> = ({
  column,
  sortDirection,
  priority,
  isIgnoreHeaderRow,
  onHeaderCellContextMenu,
  onHeaderEdit,
  onKeyDown,
  onCanSortColumnsChange,
  onDoubleClick,
  sortColumnsForWaitingDoubleClick,
  ..._props
}) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const headerTextRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const WAIT_DOUBLE_CLICK_TH_MS = 500;
  const setTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [, drag] = useDrag({
    type: "COL_DRAG",
    item: { index: column.idx },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "COL_DRAG",
    drop({ index: _index }: { index: number }) {},
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  useEffect(() => {
    textAreaRef.current?.focus();
    const textLen = textAreaRef.current?.value.length ?? 0;
    textAreaRef.current?.setSelectionRange(textLen, textLen);
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "F2") {
        setIsEditing(true);
      } else if (e.key === "Backspace") {
        setIsEditing(true);
      } else if (e.key === "Delete") {
        onHeaderEdit(column.idx, "");
      } else if (!isEditing && canEdit(e)) {
        // 編集モードに移行することで、onHeaderEdit分と通常入力分の2回入力が発生してしまうため止める
        e.preventDefault();
        onHeaderEdit(column.idx, e.key);
        setIsEditing(true);
        return;
      }
      onKeyDown(column, e);
    },
    [column, isEditing, onHeaderEdit, onKeyDown]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      onHeaderCellContextMenu(column, e);
    },
    [column, onHeaderCellContextMenu]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e.target !== headerTextRef.current) {
        return;
      }
      if (setTimeoutRef.current !== null) {
        return;
      }
      if (rootRef.current?.parentElement?.getAttribute("aria-selected") === "false") {
        return;
      }
      setTimeoutRef.current = setTimeout(() => {
        setTimeoutRef.current = null;
        onCanSortColumnsChange(sortColumnsForWaitingDoubleClick);
      }, WAIT_DOUBLE_CLICK_TH_MS);
    },
    [sortColumnsForWaitingDoubleClick, onCanSortColumnsChange]
  );

  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (e.target !== headerTextRef.current) {
        return;
      }
      if (setTimeoutRef.current) {
        clearTimeout(setTimeoutRef.current);
        setTimeoutRef.current = null;
      }
      setIsEditing(true);
      onDoubleClick();
    },
    [onDoubleClick]
  );

  function handleWindowClick(e: MouseEvent) {
    if (e.target !== textAreaRef.current) {
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (isIgnoreHeaderRow) {
      return;
    }
    rootRef.current?.parentElement?.addEventListener("keydown", handleKeyDown);
    rootRef.current?.parentElement?.addEventListener("contextmenu", handleContextMenu);
    rootRef.current?.parentElement?.addEventListener("dblclick", handleDoubleClick);
    rootRef.current?.parentElement?.addEventListener("click", handleClick);
    window.addEventListener("click", handleWindowClick);
    if (setTimeoutRef.current) {
      // クリック判定待ちタイマーが起動していた場合は再度最新の情報でタイマーをセットしなおす
      setTimeoutRef.current = setTimeout(() => {
        setTimeoutRef.current = null;
        onCanSortColumnsChange(sortColumnsForWaitingDoubleClick);
      }, WAIT_DOUBLE_CLICK_TH_MS);
    }

    return () => {
      rootRef.current?.parentElement?.removeEventListener("keydown", handleKeyDown);
      rootRef.current?.parentElement?.removeEventListener("contextmenu", handleContextMenu);
      rootRef.current?.parentElement?.removeEventListener("dblclick", handleDoubleClick);
      rootRef.current?.parentElement?.removeEventListener("click", handleClick);
      window.removeEventListener("click", handleWindowClick);
      if (setTimeoutRef.current) {
        clearTimeout(setTimeoutRef.current);
      }
    };
  }, [
    column,
    isIgnoreHeaderRow,
    onCanSortColumnsChange,
    sortColumnsForWaitingDoubleClick,
    handleKeyDown,
    handleContextMenu,
    handleDoubleClick,
    handleClick,
  ]);

  return (
    <>
      <span
        ref={(ref) => {
          rootRef.current = ref;
          if (ref) {
            drag(ref.firstElementChild);
          }
          drop(ref);
        }}
        className={styles.cellRoot}>
        {!isIgnoreHeaderRow && isEditing && (
          <textarea
            ref={textAreaRef}
            className={styles.textArea}
            value={column.name as string}
            onChange={(e) => {
              onHeaderEdit(column.idx, e.target.value);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                onHeaderEdit(column.idx, (e.target as HTMLTextAreaElement).value);
              } else if (e.key === "Enter" || e.key === "Tab" || e.key === "Escape") {
                setIsEditing(false);
              } else if (
                e.key === "ArrowDown" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowUp" ||
                e.key === "End" ||
                e.key === "Home" ||
                e.key === "PageDown" ||
                e.key === "PageUp" ||
                e.code === "Space"
              ) {
                // DataGridの移動処理を止める
                e.stopPropagation();
              }
            }}></textarea>
        )}
        {!isEditing && (
          <span ref={headerTextRef} className={styles.headerText} role="cell">
            {column.name}
          </span>
        )}

        <span className={styles.sortDirection}>
          {sortDirection !== undefined ? (sortDirection === "ASC" ? "\u2B9D" : "\u2B9F") : null}
        </span>
        <span>{priority}</span>
      </span>
    </>
  );
};
