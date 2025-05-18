import { FC, useEffect, useRef } from "react";
import { RenderHeaderCellProps } from "react-data-grid";

export const CustomHeaderCell: FC<
  RenderHeaderCellProps<NoInfer<Record<string, string>>, unknown>
> = (props) => {
  const ref = useRef<HTMLSpanElement>(null);

  function handleClickParent() {}
  useEffect(() => {
    ref.current?.parentElement?.addEventListener("contextmenu", handleClickParent);

    return () => {
      ref.current?.parentElement?.removeEventListener("contextmenu", handleClickParent);
    };
  }, []);

  return <span ref={ref}>{props.column.name}</span>;
};
