import { FC, useCallback, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import styles from "./RowIndexCell.module.scss";
import { RowIndexCellProps } from "./types";

/**
 * 行番号セルコンポーネント
 *
 * 行番号を表示し、行の選択、ドラッグ&ドロップによる行の並び替え、
 * リサイズ、コンテキストメニューの表示をサポートします。
 */
export const RowIndexCell: FC<RowIndexCellProps> = (props) => {
  const [isResizeHover, setIsResizeHover] = useState(false);
  const resizeStartY = useRef<number>(0);
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

  // リサイズハンドラーのマウスダウン
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // ドラッグ操作を妨げないよう、イベントの伝播を停止
      e.preventDefault();
      e.stopPropagation();

      resizeStartY.current = e.clientY;
      props.onRowResizeStart?.(props.rowIndex);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        // 累積的なdeltaYを計算（開始位置からの差分）
        const deltaY = moveEvent.clientY - resizeStartY.current;
        props.onRowResize?.(props.rowIndex, deltaY);
      };

      const handleMouseUp = () => {
        props.onRowResizeEnd?.();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [props]
  );

  // リサイズハンドラーのクリックイベントを停止して、セル選択を妨げないようにする
  const handleResizeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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
    <div className={styles.rowIndexCellContainer}>
      <div
        ref={combinedRef}
        className={cellClassName}
        onClick={props.onSelect}
        onContextMenu={(e) => {
          e.preventDefault();
          props.onContextMenu?.(e, props.rowIndex);
        }}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            props.onSelect();
          }
        }}
      >
        {props.getValue() as string}
      </div>
      <button
        type="button"
        className={`${styles.resizeHandle} ${isResizeHover ? styles.resizeHandleHover : ""}`}
        onMouseDown={handleResizeMouseDown}
        onClick={handleResizeClick}
        onMouseEnter={() => setIsResizeHover(true)}
        onMouseLeave={() => setIsResizeHover(false)}
        aria-label="行の高さを調整"
      />
    </div>
  );
};
