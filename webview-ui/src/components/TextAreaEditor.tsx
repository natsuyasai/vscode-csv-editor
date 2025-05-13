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
  }, []);

  return (
    <textarea
      ref={ref}
      className={styles.textArea}
      value={row[column.key]}
      onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
      onBlur={() => onClose(true)} // 終了時に変更を保存
      onKeyDown={(e) => {
        // Shift+Enterで改行、Enter単体で編集終了
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onClose(true);
        }
      }}
    />
  );
}
