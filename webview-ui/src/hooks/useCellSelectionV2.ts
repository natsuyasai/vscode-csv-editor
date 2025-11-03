import { useCallback, useEffect, useState } from "react";

/**
 * セル選択機能のカスタムフック
 * 複数セルの選択、一括編集、コピー&ペースト機能を提供
 */
export const useCellSelectionV2 = <TData extends Record<string, unknown>>(
  data: TData[],
  setData: React.Dispatch<React.SetStateAction<TData[]>>,
  updateCellsCallback?: (cells: Array<{ rowIdx: number; colIdx: number; value: string }>) => void
) => {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

  // セルキーを生成するヘルパー関数
  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  // マウスダウン時のハンドラー（選択開始）
  const handleCellMouseDown = useCallback((row: number, col: number) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectedCells(new Set([getCellKey(row, col)]));
  }, []);

  // マウスエンター時のハンドラー（範囲選択）
  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isSelecting || !selectionStart) return;

      const minRow = Math.min(selectionStart.row, row);
      const maxRow = Math.max(selectionStart.row, row);
      const minCol = Math.min(selectionStart.col, col);
      const maxCol = Math.max(selectionStart.col, col);

      const newSelection = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(getCellKey(r, c));
        }
      }
      setSelectedCells(newSelection);
    },
    [isSelecting, selectionStart]
  );

  // マウスアップ時のハンドラー（選択終了）
  const handleCellMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  // ドキュメント全体でのマウスアップイベントを監視
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      setIsSelecting(false);
    };
    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, []);

  // 選択中のセルに一括で値を設定
  const handleBulkEdit = useCallback(() => {
    if (selectedCells.size === 0) {
      return;
    }

    const value = window.prompt("選択したセルに設定する値を入力してください:");
    if (value === null) {
      return; // キャンセルされた
    }

    // 選択中のセルを更新
    if (updateCellsCallback) {
      // updateCellsCallbackがある場合はそれを使用（履歴管理あり）
      const cellUpdates = Array.from(selectedCells).map((cellKey) => {
        const [rowStr, colStr] = cellKey.split("-");
        return {
          rowIdx: parseInt(rowStr),
          colIdx: parseInt(colStr),
          value,
        };
      });
      updateCellsCallback(cellUpdates);
    } else {
      // フォールバック: 直接setDataを使用（履歴管理なし）
      setData((old) => {
        const newData = [...old];
        selectedCells.forEach((cellKey) => {
          const [rowStr, colStr] = cellKey.split("-");
          const rowIndex = parseInt(rowStr);
          const colIndex = parseInt(colStr);
          const columnId = `col${colIndex}`;

          if (newData[rowIndex]) {
            newData[rowIndex] = {
              ...newData[rowIndex],
              [columnId]: value,
            };
          }
        });
        return newData;
      });
    }

    // 選択をクリア
    setSelectedCells(new Set());
  }, [selectedCells, setData, updateCellsCallback]);

  // 選択中のセルをコピー
  const handleCopy = useCallback(async () => {
    if (selectedCells.size === 0) {
      return;
    }

    // 選択されたセルを行と列でグループ化
    const cellsArray = Array.from(selectedCells).map((cellKey) => {
      const [rowStr, colStr] = cellKey.split("-");
      return {
        row: parseInt(rowStr),
        col: parseInt(colStr),
      };
    });

    // 行と列でソート
    cellsArray.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    // TSV形式でデータを作成（Excelと互換性あり）
    const minRow = Math.min(...cellsArray.map((c) => c.row));
    const maxRow = Math.max(...cellsArray.map((c) => c.row));
    const minCol = Math.min(...cellsArray.map((c) => c.col));
    const maxCol = Math.max(...cellsArray.map((c) => c.col));

    const rows: string[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      const cols: string[] = [];
      for (let col = minCol; col <= maxCol; col++) {
        const columnId = `col${col}`;
        const value = (data[row]?.[columnId] as string) ?? "";
        cols.push(value);
      }
      rows.push(cols.join("\t"));
    }

    const text = rows.join("\n");

    // クリップボードにコピー
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("クリップボードへのコピーに失敗しました:", err);
    }
  }, [selectedCells, data]);

  // クリップボードからペースト
  const handlePaste = useCallback(async () => {
    if (selectedCells.size === 0) {
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split("\n").map((row) => row.split("\t"));

      // 選択範囲の左上のセルを取得
      const cellsArray = Array.from(selectedCells).map((cellKey) => {
        const [rowStr, colStr] = cellKey.split("-");
        return {
          row: parseInt(rowStr),
          col: parseInt(colStr),
        };
      });
      const minRow = Math.min(...cellsArray.map((c) => c.row));
      const minCol = Math.min(...cellsArray.map((c) => c.col));

      // データを更新
      if (updateCellsCallback) {
        // updateCellsCallbackがある場合はそれを使用（履歴管理あり）
        const cellUpdates: Array<{ rowIdx: number; colIdx: number; value: string }> = [];
        rows.forEach((rowData, rowOffset) => {
          rowData.forEach((cellValue, colOffset) => {
            const targetRow = minRow + rowOffset;
            const targetCol = minCol + colOffset;
            if (targetCol >= 0) {
              cellUpdates.push({
                rowIdx: targetRow,
                colIdx: targetCol,
                value: cellValue,
              });
            }
          });
        });
        updateCellsCallback(cellUpdates);
      } else {
        // フォールバック: 直接setDataを使用（履歴管理なし）
        setData((old) => {
          const newData = [...old];
          rows.forEach((rowData, rowOffset) => {
            rowData.forEach((cellValue, colOffset) => {
              const targetRow = minRow + rowOffset;
              const targetCol = minCol + colOffset;
              const columnId = `col${targetCol}`;

              if (newData[targetRow] && targetCol >= 0) {
                newData[targetRow] = {
                  ...newData[targetRow],
                  [columnId]: cellValue,
                };
              }
            });
          });
          return newData;
        });
      }

      // 選択をクリア
      setSelectedCells(new Set());
    } catch (err) {
      console.error("クリップボードからの読み取りに失敗しました:", err);
    }
  }, [selectedCells, setData, updateCellsCallback]);

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
  }, []);

  return {
    selectedCells,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleBulkEdit,
    handleCopy,
    handlePaste,
    clearSelection,
  };
};
