import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";
import { FC, useMemo, useRef, useState } from "react";
import { Cell, CellRendererProps } from "react-data-grid";
import styles from "./CustomCell.module.scss";

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

  function handleClick() {
    if (props.column.key === ROW_IDX_KEY) {
      props.onClickRow(props.row[ROW_ID_KEY]);
    } else {
      props.onClickRow();
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!isIndexCell) {
      return;
    }
    if (!refCell.current) {
      return;
    }

    // after要素はheight: 8pxなので、8px調整した結果対象がafter要素であるかを判別
    const rect = refCell.current.getBoundingClientRect();
    const isAfterElement = e.clientY >= rect.bottom - 8;

    if (!isAfterElement) {
      return;
    }
    // CustomRow側のドラッグイベントを発火させない
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY - rect.height;
  }

  function handleMouseMove(e: React.MouseEvent) {
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

  function handleMouseUp() {
    setIsResizing(false);
  }

  const isIndexCell = useMemo(() => {
    return props.cellKey === ROW_IDX_KEY;
  }, [props.cellKey]);

  return (
    <Cell
      ref={refCell}
      key={props.cellKey}
      className={[
        `${isIndexCell ? styles.cell : ""}`,
        `${props.isSearchTarget ? styles.searchTarget : ""}`,
      ].join(" ")}
      {...(({ cellKey: _rowKey, onUpdateRowHeight: _onUpdateRowHeight, ...rest }) => rest)(props)}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}></Cell>
  );
};
