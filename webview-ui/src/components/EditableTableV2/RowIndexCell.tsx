import { FC, useCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
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

  return (
    <div
      ref={combinedRef}
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
      }}
      style={{
        width: "100%",
        height: "100%",
        padding: "8px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isDragging ? "grabbing" : "grab",
        backgroundColor: props.isSelected
          ? "var(--vscode-list-activeSelectionBackground)"
          : isOver
            ? "var(--vscode-list-hoverBackground)"
            : "transparent",
        color: props.isSelected ? "var(--vscode-list-activeSelectionForeground)" : "inherit",
        opacity: isDragging ? 0.5 : 1,
        border: isOver ? "2px solid var(--vscode-focusBorder)" : "none",
      }}>
      {props.getValue() as string}
    </div>
  );
};
