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
 * @param data - 検索対象のデータ配列
 * @param rowHeight - 行の高さ（スクロール計算用）
 * @param tableContainerRef - テーブルコンテナの参照
 */
export const useTableSearchV2 = <TData extends Record<string, unknown>>(
  data: TData[],
  rowHeight: number,
  tableContainerRef: React.RefObject<HTMLDivElement | null>
) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchedItemPositions, setMatchedItemPositions] = useState<SearchPosition[]>([]);
  const [searchedSelectedItemIdx, setSearchedSelectedItemIdx] = useState(0);

  const handleSearch = useCallback(
    (text: string) => {
      if (text.trim() === "") {
        return;
      }
      const lowerText = text.toLowerCase();
      const positions: SearchPosition[] = [];

      data.forEach((row, rowIdx) => {
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
      tableContainerRef.current?.scrollTo({
        top: firstMatch.rowIdx * rowHeight,
        behavior: "smooth",
      });
    },
    [data, rowHeight, tableContainerRef]
  );

  const handleNextSearch = useCallback(() => {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const nextIdx =
      searchedSelectedItemIdx + 1 < matchedItemPositions.length ? searchedSelectedItemIdx + 1 : 0;
    const position = matchedItemPositions[nextIdx];
    setSearchedSelectedItemIdx(nextIdx);

    tableContainerRef.current?.scrollTo({
      top: position.rowIdx * rowHeight,
      behavior: "smooth",
    });
  }, [matchedItemPositions, searchedSelectedItemIdx, rowHeight, tableContainerRef]);

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

    tableContainerRef.current?.scrollTo({
      top: position.rowIdx * rowHeight,
      behavior: "smooth",
    });
  }, [matchedItemPositions, searchedSelectedItemIdx, rowHeight, tableContainerRef]);

  const handleCloseSearch = useCallback(() => {
    setMatchedItemPositions([]);
    setSearchedSelectedItemIdx(0);
    setSearchOpen(false);
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
    openSearch,
  };
};
