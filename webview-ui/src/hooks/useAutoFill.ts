import { useCallback, useState } from "react";

/**
 * オートフィル機能を提供するカスタムフック
 *
 * エクセルのようなオートフィル機能を実装します。
 * セルの右下のフィルハンドルをドラッグすることで、
 * 値のコピーまたは連番での自動入力が可能です。
 */
export const useAutoFill = <TData extends Record<string, unknown>>(
  data: TData[],
  updateCellsCallback?: (cells: Array<{ rowIdx: number; colIdx: number; value: string }>) => void
) => {
  const [fillStartCell, setFillStartCell] = useState<{ row: number; col: number } | null>(null);
  const [fillEndCell, setFillEndCell] = useState<{ row: number; col: number } | null>(null);
  const [isFilling, setIsFilling] = useState(false);

  /**
   * フィルハンドルのドラッグ開始
   */
  const handleFillStart = useCallback((row: number, col: number) => {
    setFillStartCell({ row, col });
    setFillEndCell({ row, col });
    setIsFilling(true);
  }, []);

  /**
   * フィルハンドルのドラッグ中
   */
  const handleFillMove = useCallback(
    (row: number, col: number) => {
      if (!isFilling || !fillStartCell) return;
      setFillEndCell({ row, col });
    },
    [isFilling, fillStartCell]
  );

  /**
   * フィルハンドルのドラッグ終了
   */
  const handleFillEnd = useCallback(() => {
    if (!isFilling || !fillStartCell || !fillEndCell) {
      setIsFilling(false);
      setFillStartCell(null);
      setFillEndCell(null);
      return;
    }

    // 開始セルと終了セルが同じ場合は何もしない
    if (fillStartCell.row === fillEndCell.row && fillStartCell.col === fillEndCell.col) {
      setIsFilling(false);
      setFillStartCell(null);
      setFillEndCell(null);
      return;
    }

    // 開始セルの値を取得
    const startValue = data[fillStartCell.row]?.[`col${fillStartCell.col}`] as string;
    if (startValue === undefined) {
      setIsFilling(false);
      setFillStartCell(null);
      setFillEndCell(null);
      return;
    }

    // フィル範囲を計算
    const minRow = Math.min(fillStartCell.row, fillEndCell.row);
    const maxRow = Math.max(fillStartCell.row, fillEndCell.row);
    const minCol = Math.min(fillStartCell.col, fillEndCell.col);
    const maxCol = Math.max(fillStartCell.col, fillEndCell.col);

    // 数値かどうかチェック
    const numValue = parseFloat(startValue);
    const isNumber = !isNaN(numValue) && startValue.trim() !== "";

    // フィル対象のセルを収集
    const cellsToFill: Array<{ rowIdx: number; colIdx: number; value: string }> = [];

    // 縦方向のフィル
    if (fillStartCell.col === fillEndCell.col) {
      for (let r = minRow; r <= maxRow; r++) {
        if (r === fillStartCell.row) continue; // 開始セルはスキップ

        let value: string;
        if (isNumber) {
          // 数値の場合は連番
          const offset = r - fillStartCell.row;
          value = String(numValue + offset);
        } else {
          // 文字列の場合はコピー
          value = startValue;
        }

        cellsToFill.push({
          rowIdx: r,
          colIdx: fillStartCell.col,
          value,
        });
      }
    }
    // 横方向のフィル
    else if (fillStartCell.row === fillEndCell.row) {
      for (let c = minCol; c <= maxCol; c++) {
        if (c === fillStartCell.col) continue; // 開始セルはスキップ

        let value: string;
        if (isNumber) {
          // 数値の場合は連番
          const offset = c - fillStartCell.col;
          value = String(numValue + offset);
        } else {
          // 文字列の場合はコピー
          value = startValue;
        }

        cellsToFill.push({
          rowIdx: fillStartCell.row,
          colIdx: c,
          value,
        });
      }
    }
    // 矩形範囲のフィル（コピーのみ）
    else {
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (r === fillStartCell.row && c === fillStartCell.col) continue; // 開始セルはスキップ

          cellsToFill.push({
            rowIdx: r,
            colIdx: c,
            value: startValue,
          });
        }
      }
    }

    // セルを更新
    if (cellsToFill.length > 0 && updateCellsCallback) {
      updateCellsCallback(cellsToFill);
    }

    setIsFilling(false);
    setFillStartCell(null);
    setFillEndCell(null);
  }, [isFilling, fillStartCell, fillEndCell, data, updateCellsCallback]);

  /**
   * フィル範囲に含まれるかチェック
   */
  const isInFillRange = useCallback(
    (row: number, col: number): boolean => {
      if (!isFilling || !fillStartCell || !fillEndCell) return false;

      const minRow = Math.min(fillStartCell.row, fillEndCell.row);
      const maxRow = Math.max(fillStartCell.row, fillEndCell.row);
      const minCol = Math.min(fillStartCell.col, fillEndCell.col);
      const maxCol = Math.max(fillStartCell.col, fillEndCell.col);

      return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    },
    [isFilling, fillStartCell, fillEndCell]
  );

  return {
    isFilling,
    fillStartCell,
    fillEndCell,
    handleFillStart,
    handleFillMove,
    handleFillEnd,
    isInFillRange,
  };
};
