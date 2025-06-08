import { useEffect, useRef } from "react";
import { RenderEditCellProps } from "react-data-grid";
import styles from "./TextAreaEditor.module.scss";
import { useCellEditStore } from "@/stores/useCellEditStore";

export default function TextAreaEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<Record<string, string>>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const initialCellKey = useCellEditStore((state) => state.initialCellKey);
  const clearCellEditStore = useCellEditStore((state) => state.clear);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current && initialCellKey) {
      onRowChange({ ...row, [column.key]: initialCellKey });
    }
    clearCellEditStore();
    const textLen = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(textLen, textLen);
  }, [initialCellKey, clearCellEditStore, row, column, onRowChange]);

  return (
    <textarea
      ref={ref}
      className={styles.textArea}
      value={row[column.key]}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
      onBlur={() => onClose(true, true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.shiftKey) {
          // DataGrid側でEnter入力時に編集モードを抜けてしまうのでイベントを止める
          e.stopPropagation();
          onRowChange({ ...row, [column.key]: (e.target as HTMLTextAreaElement).value });
        }
      }}
    />
  );
}
