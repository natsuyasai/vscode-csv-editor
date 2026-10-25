import { useCallback, useState } from "react";
import { CellAlignment } from "@/types";
import { remapOnMove, shiftOnDelete, shiftOnInsert } from "@/utilities/indexKeyRemap";

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

  /**
   * 列が挿入されたとき、設定が同じ列に付いたままになるようキーを付け替える
   */
  const onColumnInserted = useCallback((index: number) => {
    setColumnAlignments((prev) => shiftOnInsert(prev, index));
  }, []);

  /**
   * 列が削除されたとき、削除された列の設定を破棄し、後続のキーを付け替える
   */
  const onColumnDeleted = useCallback((index: number) => {
    setColumnAlignments((prev) => shiftOnDelete(prev, index));
  }, []);

  /**
   * 列が移動されたとき、設定が移動した列に付いていくようキーを付け替える
   */
  const onColumnMoved = useCallback((from: number, to: number) => {
    setColumnAlignments((prev) => remapOnMove(prev, from, to));
  }, []);

  return {
    columnAlignments,
    handleAlignmentChange,
    getCurrentAlignment,
    getColumnAlignment,
    onColumnInserted,
    onColumnDeleted,
    onColumnMoved,
  };
};
