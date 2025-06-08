import { useContext, useEffect, useRef } from "react";
import { RenderEditCellProps } from "react-data-grid";
import styles from "./TextAreaEditor.module.scss";
import { useCellEditStore } from "@/stores/useCellEditStore";
import { DataGridContext } from "@/contexts/dataGridContext";

export default function TextAreaEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<Record<string, string>>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const initialCellKey = useCellEditStore((state) => state.initialCellKey);
  const position = useCellEditStore((state) => state.position);
  const clearInitialCellKey = useCellEditStore((state) => state.clearInitialCellKey);
  const clearCellEditStore = useCellEditStore((state) => state.clear);
  const gridRef = useContext(DataGridContext);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current && initialCellKey) {
      onRowChange({ ...row, [column.key]: initialCellKey });
    }
    clearInitialCellKey();
    const textLen = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(textLen, textLen);
  }, [initialCellKey, clearInitialCellKey, row, column, onRowChange]);

  useEffect(() => {
    return () => {
      clearCellEditStore();
    };
  }, [clearCellEditStore]);

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
        } else if (e.key === "Enter" && position) {
          // 行のサイズを超えたら移動は起こらないため、チェックせずに+1
          const nextRow = position.rowIdx + 1;
          gridRef?.selectCell({
            idx: position.idx,
            rowIdx: nextRow,
          });
        }
      }}
    />
  );
}
