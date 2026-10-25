import { useCallback, useState } from "react";
import { ROW_IDX_KEY, ROW_ID_KEY } from "@/types";

/**
 * 検索結果の位置情報
 */
export interface SearchPosition {
  rowIdx: number;
  colIdx: number;
}

/**
 * テーブル検索機能のカスタムフック
 * 検索、次へ/前へナビゲーション、検索終了機能を提供
 *
 * 検索対象・検索結果の位置はすべて「表示位置」(ソート・フィルター後の並び)で扱う。
 *
 * @param viewRows - 検索対象の行データ（表示されている並び＝ソート・フィルター後）
 * @param scrollToRow - 表示位置の行へスクロールする関数（仮想スクローラ経由で個別の行高さが反映される）
 * @param onSelectCell - セル選択時のコールバック関数（表示位置で呼ばれる。オプショナル）
 */
export const useTableSearch = <TData extends Record<string, unknown>>(
  viewRows: TData[],
  scrollToRow: (viewRowIdx: number) => void,
  onSelectCell?: (row: number, col: number) => void
) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedItemPositions, setMatchedItemPositions] = useState<SearchPosition[]>([]);
  const [searchedSelectedItemIdx, setSearchedSelectedItemIdx] = useState(0);

  const handleSearch = useCallback(
    (text: string) => {
      const trimmedText = text.trim();
      if (trimmedText === "") {
        return;
      }
      const lowerText = trimmedText.toLowerCase();
      const positions: SearchPosition[] = [];

      viewRows.forEach((row, rowIdx) => {
        Object.keys(row).forEach((key) => {
          if (key === ROW_IDX_KEY || key === ROW_ID_KEY) {
            return;
          }
          const colIdx = parseInt(key.replace("col", ""));
          const value = row[key];
          if (
            value &&
            (typeof value === "string" || typeof value === "number") &&
            String(value).toLowerCase().includes(lowerText)
          ) {
            positions.push({ rowIdx, colIdx });
          }
        });
      });

      if (positions.length === 0) {
        return;
      }

      setMatchedItemPositions(positions);
      setSearchedSelectedItemIdx(0);

      // 最初のマッチ位置にスクロール
      const firstMatch = positions[0];
      scrollToRow(firstMatch.rowIdx);

      // セルを選択状態にする
      if (onSelectCell) {
        onSelectCell(firstMatch.rowIdx, firstMatch.colIdx);
      }
    },
    [viewRows, scrollToRow, onSelectCell]
  );

  const handleNextSearch = useCallback(() => {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const nextIdx =
      searchedSelectedItemIdx + 1 < matchedItemPositions.length ? searchedSelectedItemIdx + 1 : 0;
    const position = matchedItemPositions[nextIdx];
    setSearchedSelectedItemIdx(nextIdx);

    scrollToRow(position.rowIdx);

    // セルを選択状態にする
    if (onSelectCell) {
      onSelectCell(position.rowIdx, position.colIdx);
    }
  }, [matchedItemPositions, searchedSelectedItemIdx, scrollToRow, onSelectCell]);

  const handlePreviousSearch = useCallback(() => {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const prevIdx =
      searchedSelectedItemIdx - 1 >= 0
        ? searchedSelectedItemIdx - 1
        : matchedItemPositions.length - 1;
    const position = matchedItemPositions[prevIdx];
    setSearchedSelectedItemIdx(prevIdx);

    scrollToRow(position.rowIdx);

    // セルを選択状態にする
    if (onSelectCell) {
      onSelectCell(position.rowIdx, position.colIdx);
    }
  }, [matchedItemPositions, searchedSelectedItemIdx, scrollToRow, onSelectCell]);

  const handleCloseSearch = useCallback(() => {
    setMatchedItemPositions([]);
    setSearchedSelectedItemIdx(0);
    setSearchOpen(false);
  }, []);

  // 検索結果だけを破棄する（検索フォームは開いたまま）。ソート・フィルター変更時に使う
  const clearMatches = useCallback(() => {
    setMatchedItemPositions([]);
    setSearchedSelectedItemIdx(0);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  return {
    searchOpen,
    matchedItemPositions,
    searchedSelectedItemIdx,
    handleSearch,
    handleNextSearch,
    handlePreviousSearch,
    handleCloseSearch,
    clearMatches,
    openSearch,
  };
};
