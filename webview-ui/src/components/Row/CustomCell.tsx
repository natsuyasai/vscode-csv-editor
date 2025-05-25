import { FC, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cell, CellRendererProps } from "react-data-grid";
import styles from "./CustomCell.module.scss";

interface Props {
  rowKey: React.Key;
  onUpdateRowHeight: (rowIdx: number, height: number) => void;
}

export const CustomCell: FC<CellRendererProps<NoInfer<Record<string, string>>, unknown> & Props> = (
  props
) => {
  const refCell = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [isResizing, setIsResizing] = useState(false);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setIsResizing(true);
    startY.current = e.clientY - (refCell.current?.getBoundingClientRect()?.height ?? 0);
  }

  function handleMouseUp(_e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setIsResizing(false);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
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

  return (
    <Cell
      ref={refCell}
      key={props.rowKey}
      className={styles.cell}
      {...(({ rowKey, onUpdateRowHeight, ...rest }) => rest)(props)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}></Cell>
  );
};
