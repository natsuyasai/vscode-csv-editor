import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";
import { FC, useRef } from "react";
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
      onClick={handleClick}></Cell>
  );
};
