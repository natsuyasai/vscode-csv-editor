import { FC, useEffect, useRef, useState } from "react";
import { CalculatedColumn, RenderHeaderCellProps } from "react-data-grid";
import styles from "./CustomHeaderCell.module.scss";

interface Props {
  onHeaderCellContextMenu: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: MouseEvent
  ) => void;
  onHeaderEdit: (cellIdx: number, updateText: string) => void;
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

  function handleContextMenu(e: Event) {
    props.onHeaderCellContextMenu(props.column, e as MouseEvent);
  }

  function handleDoubleClick() {
    setIsEditing(true);
  }

  function handleWindowClick(e: MouseEvent) {
    if (e.target !== textAreaRef.current) {
      setIsEditing(false);
    }
  }

  useEffect(() => {
    ref.current?.parentElement?.addEventListener("contextmenu", handleContextMenu);
    ref.current?.parentElement?.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("click", handleWindowClick);

    return () => {
      ref.current?.parentElement?.removeEventListener("contextmenu", handleContextMenu);
      ref.current?.parentElement?.removeEventListener("dblclick", handleDoubleClick);
      window.removeEventListener("click", handleWindowClick);
    };
  }, []);

  return (
    <>
      {isEditing && (
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
            } else if (e.key === "Enter") {
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
