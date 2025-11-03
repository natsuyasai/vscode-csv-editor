import { FC, useCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
import styles from "./RowIndexCell.module.scss";
import { RowIndexCellProps } from "./types";

/**
 * 行番号セルコンポーネント
 *
 * 行番号を表示し、行の選択、ドラッグ&ドロップによる行の並び替え、
 * コンテキストメニューの表示をサポートします。
 */
export const RowIndexCell: FC<RowIndexCellProps> = (props) => {
  const [{ isDragging }, drag] = useDrag({
    type: "ROW_DRAG",
    item: { index: props.rowIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: "ROW_DRAG",
    drop: (item: { index: number }) => {
      if (props.onRowReorder) {
        props.onRowReorder(item.index, props.rowIndex);
      }
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

  // クラス名を決定
  const cellClassName = `${styles.rowIndexCell} ${
    props.isSelected
      ? styles.rowIndexCellSelected
      : isOver
        ? styles.rowIndexCellHover
        : styles.rowIndexCellNormal
  } ${isDragging ? styles.rowIndexCellDragging : ""} ${
    isDragging ? styles.cursorGrabbing : styles.cursorGrab
  }`;

  return (
    <div
      ref={combinedRef}
      className={cellClassName}
      onClick={props.onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        props.onContextMenu?.(e, props.rowIndex);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          props.onSelect();
        }
      }}>
      {props.getValue() as string}
    </div>
  );
};
