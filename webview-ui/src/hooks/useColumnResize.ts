import { useCallback, useRef, useState } from "react";

/**
 * 列のリサイズ機能を提供するカスタムフック
 */
export const useColumnResize = (defaultColumnWidth: number) => {
  // 列ごとの幅を管理するマップ（列インデックス -> 幅）
  const [columnWidths, setColumnWidths] = useState<Map<number, number>>(new Map());
  // リサイズ開始時の初期幅を保持（同期的にアクセスするためrefを使用）
  const initialWidthRef = useRef<number>(0);

  /**
   * 指定された列の幅を取得
   */
  const getColumnWidth = useCallback(
    (columnIndex: number): number => {
      return columnWidths.get(columnIndex) ?? defaultColumnWidth;
    },
    [columnWidths, defaultColumnWidth]
  );

  /**
   * 列の幅を設定
   */
  const setColumnWidth = useCallback((columnIndex: number, width: number) => {
    setColumnWidths((prev) => {
      const newMap = new Map(prev);
      // 最小幅は50px、最大幅は1000pxに制限
      const clampedWidth = Math.max(50, Math.min(1000, width));
      newMap.set(columnIndex, clampedWidth);
      return newMap;
    });
  }, []);

  /**
   * リサイズ開始
   */
  const startResize = useCallback(
    (columnIndex: number) => {
      // リサイズ開始時の幅を保存（refを使用して同期的に保存）
      initialWidthRef.current = columnWidths.get(columnIndex) ?? defaultColumnWidth;
    },
    [columnWidths, defaultColumnWidth]
  );

  /**
   * リサイズ中
   */
  const handleResize = useCallback(
    (columnIndex: number, deltaX: number) => {
      // 初期の幅に累積的なdeltaXを加算
      const newWidth = initialWidthRef.current + deltaX;
      setColumnWidth(columnIndex, newWidth);
    },
    [setColumnWidth]
  );

  /**
   * リサイズ終了
   */
  const endResize = useCallback(() => {
    // リサイズ終了時の処理（現在は特になし）
  }, []);

  /**
   * すべての列の幅をリセット
   */
  const resetAllColumnWidths = useCallback(() => {
    setColumnWidths(new Map());
  }, []);

  /**
   * デフォルトの列幅を変更した際に、カスタマイズされていない列の幅をクリア
   */
  const updateDefaultWidth = useCallback(() => {
    // カスタマイズされた列の幅は保持する
    // この関数は、デフォルト幅が変更されたときに呼ばれる
  }, []);

  return {
    columnWidths,
    getColumnWidth,
    setColumnWidth,
    startResize,
    handleResize,
    endResize,
    resetAllColumnWidths,
    updateDefaultWidth,
  };
};
