import { FC, useEffect, useRef } from "react";
import { CalculatedColumn, RenderHeaderCellProps } from "react-data-grid";

interface Props {
  onHeaderCellContextMenu: (
    cell: CalculatedColumn<NoInfer<Record<string, string>>, unknown>,
    e: PointerEvent
  ) => void;
}

export const CustomHeaderCell: FC<
  RenderHeaderCellProps<NoInfer<Record<string, string>>, unknown> & Props
> = (props) => {
  const ref = useRef<HTMLSpanElement>(null);

  function handleClickParent(e: Event) {
    props.onHeaderCellContextMenu(props.column, e as PointerEvent);
  }
  useEffect(() => {
    ref.current?.parentElement?.addEventListener("contextmenu", handleClickParent);

    return () => {
      ref.current?.parentElement?.removeEventListener("contextmenu", handleClickParent);
    };
  }, []);

  return <span ref={ref}>{props.column.name}</span>;
};
