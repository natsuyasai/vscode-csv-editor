import { FC } from "react";
import { RenderRowProps, Row } from "react-data-grid";
import { useDrag, useDrop } from "react-dnd";
import styles from "./CustomRow.module.scss";
export interface Props {
  rowKey: React.Key;
  onRowReorder: (sourceIndex: number, targetIndex: number) => void;
}

export type CustomRowProps = Props & RenderRowProps<NoInfer<Record<string, string>>, unknown>;

export const CustomRow: FC<CustomRowProps> = (props) => {
  const [{ isDragging }, drag] = useDrag({
    type: "ROW_DRAG",
    item: { index: props.rowIdx },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: "ROW_DRAG",
    drop({ index }: { index: number }) {
      props.onRowReorder(index, props.rowIdx);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <Row
      ref={(ref) => {
        if (ref) {
          drag(ref.firstElementChild);
        }
        drop(ref);
      }}
      key={props.rowKey}
      className={[isDragging ? styles.rowDragging : "", isOver ? styles.rowOver : ""].join(" ")}
      {...(({ rowKey: _rowKey, onRowReorder: _onRowReorder, ...rest }) => rest)(props)}
    />
  );
};
