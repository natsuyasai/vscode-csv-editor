import { useMemo, useState } from "react";
import { DataGridHandle } from "react-data-grid";

interface Parameters {
  sortedRows: Array<Record<string, string>>;
  gridRef: React.RefObject<DataGridHandle | null>;
}

type Position = { colIdx: number; rowIdx: number };

export function useSearch({ sortedRows, gridRef }: Parameters) {
  const [matchedItemPositions, setMatchedItemPositions] = useState<Position[]>([]);
  const [searchedSelectedItemIdx, setSearchedSelectedItemIdx] = useState(0);

  const isMatched = useMemo(() => {
    return matchedItemPositions.length > 0;
  }, [matchedItemPositions]);

  function handleSearch(text: string) {
    if (text.trim() === "") {
      return;
    }
    const lowerText = text.toLowerCase();
    const matchedRows = sortedRows.filter((row) =>
      Object.values(row).some((value, index) => {
        if (index === 0) {
          // 固定列は検索対象外
          return false;
        }
        return value.toLowerCase().includes(lowerText);
      })
    );
    if (matchedRows.length === 0) {
      return;
    }
    const positions: Position[] = [];
    matchedRows.forEach((row) => {
      const rowIdx = sortedRows.indexOf(row);
      if (rowIdx === -1) {
        return;
      }
      // 一致するセルを探す
      const matchedColumns: number[] = [];
      Object.values(row).forEach((value, index) => {
        if (index === 0) {
          // 固定列は検索対象外
          return;
        }
        if (value.toLowerCase().includes(lowerText)) {
          matchedColumns.push(index);
        }
      });
      matchedColumns.forEach((colIdx) => {
        positions.push({ colIdx, rowIdx });
      });
    });
    if (positions.length === 0) {
      return;
    }

    setMatchedItemPositions(positions);
    setSearchedSelectedItemIdx(0);
    const position = positions[0];
    gridRef.current!.scrollToCell({ idx: position.colIdx, rowIdx: position.rowIdx });
    gridRef.current!.selectCell({ idx: position.colIdx, rowIdx: position.rowIdx });
  }

  function handleNextSearch() {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const nextIdx =
      searchedSelectedItemIdx + 1 < matchedItemPositions.length ? searchedSelectedItemIdx + 1 : 0;
    const position = matchedItemPositions[nextIdx];
    setSearchedSelectedItemIdx(nextIdx);
    gridRef.current!.scrollToCell({ idx: position.colIdx, rowIdx: position.rowIdx });
    gridRef.current!.selectCell({ idx: position.colIdx, rowIdx: position.rowIdx });
  }

  function handlePreviousSearch() {
    if (matchedItemPositions.length === 0) {
      return;
    }
    const prevIdx =
      searchedSelectedItemIdx - 1 >= 0
        ? searchedSelectedItemIdx - 1
        : matchedItemPositions.length - 1;
    const position = matchedItemPositions[prevIdx];
    setSearchedSelectedItemIdx(prevIdx);
    gridRef.current!.scrollToCell({ idx: position.colIdx, rowIdx: position.rowIdx });
    gridRef.current!.selectCell({ idx: position.colIdx, rowIdx: position.rowIdx });
  }

  return { isMatched, handleSearch, handleNextSearch, handlePreviousSearch };
}
