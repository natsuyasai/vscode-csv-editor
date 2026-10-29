import { useCallback, useRef, useState } from "react";
import { remapOnMove, shiftOnDelete, shiftOnInsert } from "@/utilities/indexKeyRemap";

/**
 * 行のリサイズ機能を提供するカスタムフック
 */
export const useRowResize = (defaultRowHeight: number) => {
  // 行ごとの高さを管理するマップ（行インデックス -> 高さ）
  const [rowHeights, setRowHeights] = useState<Map<number, number>>(new Map());
  // リサイズ開始時の初期高さを保持（同期的にアクセスするためrefを使用）
  const initialHeightRef = useRef<number>(0);

  /**
   * 指定された行の高さを取得
   */
  const getRowHeight = useCallback(
    (rowIndex: number): number => {
      return rowHeights.get(rowIndex) ?? defaultRowHeight;
    },
    [rowHeights, defaultRowHeight]
  );

  /**
   * 行の高さを設定
   */
  const setRowHeight = useCallback((rowIndex: number, height: number) => {
    setRowHeights((prev) => {
      const newMap = new Map(prev);
      // 最小高さは20px、最大高さは500pxに制限
      const clampedHeight = Math.max(20, Math.min(500, height));
      newMap.set(rowIndex, clampedHeight);
      return newMap;
    });
  }, []);

  /**
   * リサイズ開始
   */
  const startResize = useCallback(
    (rowIndex: number) => {
      // リサイズ開始時の高さを保存（refを使用して同期的に保存）
      initialHeightRef.current = rowHeights.get(rowIndex) ?? defaultRowHeight;
    },
    [rowHeights, defaultRowHeight]
  );

  /**
   * リサイズ中
   */
  const handleResize = useCallback(
    (rowIndex: number, deltaY: number) => {
      // 初期の高さに累積的なdeltaYを加算
      const newHeight = initialHeightRef.current + deltaY;
      setRowHeight(rowIndex, newHeight);
    },
    [setRowHeight]
  );

  /**
   * リサイズ終了
   */
  const endResize = useCallback(() => {
    // リサイズ終了時の処理（現在は特になし）
  }, []);

  /**
   * すべての行の高さをリセット
   */
  const resetAllRowHeights = useCallback(() => {
    setRowHeights(new Map());
  }, []);

  /**
   * デフォルトの行高さを変更した際に、カスタマイズされていない行の高さをクリア
   */
  const updateDefaultHeight = useCallback(() => {
    // カスタマイズされた行の高さは保持する
    // この関数は、デフォルト高さが変更されたときに呼ばれる
  }, []);

  /**
   * 行が挿入されたとき、設定が同じ行に付いたままになるようキーを付け替える
   */
  const onRowInserted = useCallback((index: number) => {
    setRowHeights((prev) => shiftOnInsert(prev, index));
  }, []);

  /**
   * 行が削除されたとき、削除された行の設定を破棄し、後続のキーを付け替える
   */
  const onRowDeleted = useCallback((index: number) => {
    setRowHeights((prev) => shiftOnDelete(prev, index));
  }, []);

  /**
   * 行が移動されたとき、設定が移動した行に付いていくようキーを付け替える
   */
  const onRowMoved = useCallback((from: number, to: number) => {
    setRowHeights((prev) => remapOnMove(prev, from, to));
  }, []);

  return {
    rowHeights,
    getRowHeight,
    setRowHeight,
    startResize,
    handleResize,
    endResize,
    resetAllRowHeights,
    updateDefaultHeight,
    onRowInserted,
    onRowDeleted,
    onRowMoved,
  };
};
