import { FC, useRef, useState } from "react";
import { Cell, CellRendererProps } from "react-data-grid";
import styles from "./CustomCell.module.scss";
import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";

interface Props {
  cellKey: React.Key;
  isSearchTarget?: boolean;
  onUpdateRowHeight: (rowIdx: number, height: number) => void;
  onClickRow: (rowKey?: string) => void;
}

export type CustomCellProps = Props & CellRendererProps<NoInfer<Record<string, string>>, unknown>;

export const CustomCell: FC<CustomCellProps> = (props) => {
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

  function handleClick() {
    if (props.column.key === ROW_IDX_KEY) {
      props.onClickRow(props.row[ROW_ID_KEY]);
    } else {
      props.onClickRow();
    }
  }

  return (
    <Cell
      ref={refCell}
      key={props.cellKey}
      className={[`${styles.cell}`, `${props.isSearchTarget ? styles.searchTarget : ""}`].join(" ")}
      {...(({ cellKey: _rowKey, onUpdateRowHeight: _onUpdateRowHeight, ...rest }) => rest)(props)}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}></Cell>
  );
};
