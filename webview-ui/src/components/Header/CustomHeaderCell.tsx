import { FC, useCallback, useEffect, useRef, useState } from "react";
import { CalculatedColumn, RenderHeaderCellProps, SortColumn } from "react-data-grid";
import styles from "./CustomHeaderCell.module.scss";
import { useDrag, useDrop } from "react-dnd";

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

export const CustomHeaderCell: FC<
  RenderHeaderCellProps<NoInfer<Record<string, string>>, unknown> & Props
> = (props) => {
  const rootRef = useRef<HTMLSpanElement>(null);
  const headerTextRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const WAIT_DOUBLE_CLICK_TH_MS = 200;

  const [{}, drag] = useDrag({
    type: "COL_DRAG",
    item: { index: props.column.idx },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{}, drop] = useDrop({
    accept: "COL_DRAG",
    drop({ index }: { index: number }) {},
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
        props.onHeaderEdit(props.column.idx, "");
      }
      props.onKeyDown(props.column, e);
    },
    [props.column]
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      props.onHeaderCellContextMenu(props.column, e as MouseEvent);
    },
    [props.column]
  );

  const setTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e.target !== headerTextRef.current) {
        return;
      }
      if (setTimeoutRef.current !== null) {
        return;
      }

      setTimeoutRef.current = setTimeout(() => {
        setTimeoutRef.current = null;
        props.onCanSortColumnsChange(props.sortColumnsForWaitingDoubleClick);
      }, WAIT_DOUBLE_CLICK_TH_MS);
    },
    [props.sortColumnsForWaitingDoubleClick]
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
      props.onDoubleClick();
    },
    [props.sortColumnsForWaitingDoubleClick]
  );

  function handleWindowClick(e: MouseEvent) {
    if (e.target !== textAreaRef.current) {
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (props.isIgnoreHeaderRow) {
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
        props.onCanSortColumnsChange(props.sortColumnsForWaitingDoubleClick);
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
  }, [props.column, props.isIgnoreHeaderRow]);

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
        {!props.isIgnoreHeaderRow && isEditing && (
          <textarea
            ref={textAreaRef}
            className={styles.textArea}
            value={props.column.name as string}
            onChange={(e) => {
              props.onHeaderEdit(props.column.idx, e.target.value);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                props.onHeaderEdit(props.column.idx, (e.target as HTMLTextAreaElement).value);
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
                e.key === "PageUp"
              ) {
                // DataGridの移動処理を止める
                e.stopPropagation();
              }
            }}></textarea>
        )}
        {!isEditing && (
          <span ref={headerTextRef} className={styles.headerText}>
            {props.column.name}
          </span>
        )}

        <span className={styles.sortDirection}>
          {props.sortDirection !== undefined
            ? props.sortDirection === "ASC"
              ? "\u2B9D"
              : "\u2B9F"
            : null}
        </span>
        <span>{props.priority}</span>
      </span>
    </>
  );
};
