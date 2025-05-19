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

  function handleMouseDown(e: MouseEvent) {
    setIsResizing(true);
    startY.current = e.clientY - (refCell.current?.getBoundingClientRect()?.height ?? 0);
  }

  function handleMouseUp(e: MouseEvent) {
    setIsResizing(false);
  }

  useEffect(() => {
    refCell.current?.addEventListener("mousedown", handleMouseDown);
    refCell.current?.addEventListener("mouseup", handleMouseUp);
    return () => {
      refCell.current?.removeEventListener("mousedown", handleMouseDown);
      refCell.current?.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isResizing) {
      return;
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

    refCell.current?.addEventListener("mousemove", handleMouseMove);
    return () => {
      refCell.current?.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isResizing]);

  return <Cell ref={refCell} key={props.rowKey} className={styles.cell} {...props}></Cell>;
};
