import { FC, useCallback, useEffect, useRef, useState } from "react";
import { CalculatedColumn, RenderHeaderCellProps } from "react-data-grid";
import styles from "./CustomHeaderCell.module.scss";

interface Props {
  isIgnoreHeaderRow: boolean;
  onHeaderCellContextMenu: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: MouseEvent
  ) => void;
  onHeaderEdit: (cellIdx: number, updateText: string) => void;
  onKeyDown: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: KeyboardEvent
  ) => void;
}

export const CustomHeaderCell: FC<
  RenderHeaderCellProps<NoInfer<Record<string, string>>, unknown> & Props
> = (props) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
    const textLen = textAreaRef.current?.value.length ?? 0;
    textAreaRef.current?.setSelectionRange(textLen, textLen);
  }, [isEditing]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "F2") {
        setIsEditing(true);
      }
      props.onKeyDown(props.column, e);
    },
    [props.column]
  );

  const handleContextMenu = useCallback(
    (e: Event) => {
      props.onHeaderCellContextMenu(props.column, e as MouseEvent);
    },
    [props.column]
  );

  function handleDoubleClick(e: Event) {
    if (e.target !== ref.current?.parentElement) {
      return;
    }
    setIsEditing(true);
  }

  function handleWindowClick(e: MouseEvent) {
    if (e.target !== textAreaRef.current) {
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (props.isIgnoreHeaderRow) {
      return;
    }
    ref.current?.parentElement?.addEventListener("keydown", handleKeyDown);
    ref.current?.parentElement?.addEventListener("contextmenu", handleContextMenu);
    ref.current?.parentElement?.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("click", handleWindowClick);

    return () => {
      ref.current?.parentElement?.removeEventListener("keydown", handleKeyDown);
      ref.current?.parentElement?.removeEventListener("contextmenu", handleContextMenu);
      ref.current?.parentElement?.removeEventListener("dblclick", handleDoubleClick);
      window.removeEventListener("click", handleWindowClick);
    };
  }, [props.column, props.isIgnoreHeaderRow]);

  return (
    <>
      {!props.isIgnoreHeaderRow && isEditing && (
        <textarea
          ref={textAreaRef}
          className={styles.textArea}
          value={props.column.name as string}
          onChange={(e) => {
            props.onHeaderEdit(props.column.idx, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.shiftKey) {
              props.onHeaderEdit(props.column.idx, (e.target as HTMLTextAreaElement).value);
            } else if (e.key === "Enter" || e.key === "Tab") {
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
      {!isEditing && <span ref={ref}>{props.column.name}</span>}
    </>
  );
};
