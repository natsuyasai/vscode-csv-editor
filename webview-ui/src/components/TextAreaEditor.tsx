import { useRef, useEffect } from "react";
import { Column, RenderEditCellProps } from "react-data-grid";
import styles from "./TextAreaEditor.module.scss";

export default function TextAreaEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<Record<string, string>>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const textLen = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(textLen, textLen);
  }, []);

  return (
    <textarea
      ref={ref}
      className={styles.textArea}
      value={row[column.key]}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
      onBlur={() => onClose(true, false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.shiftKey) {
          // DataGrid側でEnter入力時に編集モードを抜けてしまうのでイベントを止める
          e.stopPropagation();
          onRowChange({ ...row, [column.key]: `${row[column.key]}\n` });
        }
      }}
    />
  );
}
