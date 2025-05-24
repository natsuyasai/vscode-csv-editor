import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Row, RenderRowProps } from "react-data-grid";
import styles from "./CustomRow.module.scss";

interface Props {
  rowKey: React.Key;
  onUpdateRowHeight: (rowIdx: number, height: number) => void;
}

export const CustomRow: FC<RenderRowProps<NoInfer<Record<string, string>>, unknown> & Props> = (
  props
) => {
  const refRow = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [isResizing, setIsResizing] = useState(false);

  function handleMouseDown(e: MouseEvent) {
    setIsResizing(true);
    startY.current = e.clientY - (refRow.current?.getBoundingClientRect()?.height ?? 0);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isResizing) {
      return;
    }
    const height = e.clientY - startY.current;
    const minHeight = 24;
    if (height < minHeight) {
      return;
    }
    props.onUpdateRowHeight(props.rowIdx, height);
  }

  function handleMouseUp(e: MouseEvent) {
    setIsResizing(false);
  }

  return (
    <Row
      ref={refRow}
      key={props.rowKey}
      className={styles.row}
      {...props}
      onMouseDown={(e) => handleMouseDown}
      onMouseMove={(e) => handleMouseMove}
      onMouseUp={(e) => handleMouseUp}></Row>
  );
};
