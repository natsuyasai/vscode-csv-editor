import { useCallback, useState } from "react";
import { CellAlignment } from "@/types";

/**
 * 列の配置調整機能のカスタムフック
 * 各列の水平・垂直配置を管理する
 *
 * @param selectedColumnIndex - 現在選択されている列のインデックス
 * @returns 配置管理の状態とハンドラー
 */
export const useColumnAlignment = (selectedColumnIndex: number | null) => {
  const [columnAlignments, setColumnAlignments] = useState<Record<number, CellAlignment>>({});

  /**
   * 選択された列の配置を変更する
   */
  const handleAlignmentChange = useCallback(
    (alignment: CellAlignment) => {
      if (selectedColumnIndex === null) return;

      setColumnAlignments((prev) => ({
        ...prev,
        [selectedColumnIndex]: alignment,
      }));
    },
    [selectedColumnIndex]
  );

  /**
   * 選択された列の現在の配置を取得する
   */
  const getCurrentAlignment = useCallback((): CellAlignment => {
    if (selectedColumnIndex === null) {
      return { vertical: "center", horizontal: "left" };
    }
    return columnAlignments[selectedColumnIndex] || { vertical: "center", horizontal: "left" };
  }, [selectedColumnIndex, columnAlignments]);

  /**
   * 指定された列の配置を取得する
   */
  const getColumnAlignment = useCallback(
    (columnIndex: number): CellAlignment | undefined => {
      return columnAlignments[columnIndex];
    },
    [columnAlignments]
  );

  return {
    columnAlignments,
    handleAlignmentChange,
    getCurrentAlignment,
    getColumnAlignment,
  };
};
