import { useCallback, useState } from "react";

/**
 * ヘッダー編集機能のカスタムフック
 * ヘッダーセルの編集状態と編集値を管理する
 *
 * @param updateCol - 列の値を更新する関数
 * @returns ヘッダー編集の状態とハンドラー
 */
export const useHeaderEditing = (updateCol: (columnIndex: number, value: string) => void) => {
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>("");

  /**
   * ヘッダーの編集を開始する
   */
  const startEditing = useCallback((columnIndex: number, initialValue: string) => {
    setEditingHeaderIndex(columnIndex);
    setEditingHeaderValue(initialValue);
  }, []);

  /**
   * ヘッダーの編集を終了し、値を更新する
   */
  const finishEditing = useCallback(() => {
    if (editingHeaderIndex !== null) {
      updateCol(editingHeaderIndex, editingHeaderValue);
      setEditingHeaderIndex(null);
      setEditingHeaderValue("");
    }
  }, [editingHeaderIndex, editingHeaderValue, updateCol]);

  /**
   * ヘッダーの編集をキャンセルする
   */
  const cancelEditing = useCallback(() => {
    setEditingHeaderIndex(null);
    setEditingHeaderValue("");
  }, []);

  /**
   * ヘッダーの編集値を変更する
   */
  const changeEditingValue = useCallback((value: string) => {
    setEditingHeaderValue(value);
  }, []);

  /**
   * 指定された列が編集中かどうかを判定する
   */
  const isEditing = useCallback(
    (columnIndex: number | null): boolean => {
      return columnIndex !== null && editingHeaderIndex === columnIndex;
    },
    [editingHeaderIndex]
  );

  return {
    editingHeaderIndex,
    editingHeaderValue,
    startEditing,
    finishEditing,
    cancelEditing,
    changeEditingValue,
    isEditing,
  };
};
