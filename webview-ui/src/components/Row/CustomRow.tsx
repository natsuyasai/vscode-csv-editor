import { FC } from "react";
import { RenderRowProps, Row } from "react-data-grid";
import { useDrag, useDrop } from "react-dnd";
import styles from "./CustomRow.module.scss";
export interface Props {
  rowKey: React.Key;
  onUpdateRowHeight: (rowIdx: number, height: number) => void;
  onRowReorder: (sourceIndex: number, targetIndex: number) => void;
}

export type CustomRowProps = Props & RenderRowProps<NoInfer<Record<string, string>>, unknown>;

export const CustomRow: FC<CustomRowProps> = (props) => {
  // const refRow = useRef<HTMLDivElement>(null);
  // const startY = useRef(0);
  // const [isResizing, setIsResizing] = useState(false);

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

  // function handleMouseDown(e: MouseEvent) {
  //   setIsResizing(true);
  //   startY.current = e.clientY - (refRow.current?.getBoundingClientRect()?.height ?? 0);
  // }

  // function handleMouseMove(e: MouseEvent) {
  //   if (!isResizing) {
  //     return;
  //   }
  //   const height = e.clientY - startY.current;
  //   const minHeight = 24;
  //   if (height < minHeight) {
  //     return;
  //   }
  //   props.onUpdateRowHeight(props.rowIdx, height);
  // }

  // function handleMouseUp(e: MouseEvent) {
  //   setIsResizing(false);
  // }

  return (
    <Row
      ref={(ref) => {
        // refRow.current = ref;
        if (ref) {
          drag(ref.firstElementChild);
        }
        drop(ref);
      }}
      key={props.rowKey}
      className={[
        styles.row,
        isDragging ? styles.rowDragging : "",
        isOver ? styles.rowOver : "",
      ].join(" ")}
      {...(({
        rowKey: _rowKey,
        onUpdateRowHeight: _onUpdateRowHeight,
        onRowReorder: _onRowReorder,
        ...rest
      }) => rest)(props)}
      // onMouseDown={(e) => handleMouseDown}
      // onMouseMove={(e) => handleMouseMove}
      // onMouseUp={(e) => handleMouseUp}
    />
  );
};
