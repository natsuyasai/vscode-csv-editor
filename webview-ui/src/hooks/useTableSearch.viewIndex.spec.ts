import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useTableSearch } from "@/hooks/useTableSearch";

/**
 * 検索は表示位置(ソート・フィルター後の並び)を基準にする (issue #79)
 */
describe("useTableSearch (表示順で検索)", () => {
  // 呼び出し側は表示されている並びの行データを渡す（ソート・フィルター後）
  const viewRows = [
    { col0: "match-c", col1: "x" },
    { col0: "none", col1: "match-a" },
    { col0: "match-b", col1: "y" },
  ];

  it("検索結果の位置は渡された行の並び(表示位置)で返る", () => {
    const { result } = renderHook(() => useTableSearch(viewRows, vi.fn()));
    act(() => result.current.handleSearch("match"));
    expect(result.current.matchedItemPositions).toEqual([
      { rowIdx: 0, colIdx: 0 },
      { rowIdx: 1, colIdx: 1 },
      { rowIdx: 2, colIdx: 0 },
    ]);
  });

  it("スクロールは表示位置で scrollToRow に委譲され、セル選択も表示位置で通知される", () => {
    const scrollToRow = vi.fn();
    const onSelectCell = vi.fn();
    const { result } = renderHook(() => useTableSearch(viewRows, scrollToRow, onSelectCell));
    act(() => result.current.handleSearch("match"));
    expect(scrollToRow).toHaveBeenLastCalledWith(0);
    act(() => result.current.handleNextSearch());
    expect(scrollToRow).toHaveBeenLastCalledWith(1);
    expect(onSelectCell).toHaveBeenLastCalledWith(1, 1);
    act(() => result.current.handlePreviousSearch());
    expect(scrollToRow).toHaveBeenLastCalledWith(0);
  });

  it("表示行が変わった後の検索は新しい並びが対象になる", () => {
    const { result, rerender } = renderHook(({ rows }) => useTableSearch(rows, vi.fn()), {
      initialProps: { rows: viewRows },
    });
    rerender({ rows: [viewRows[2], viewRows[0]] });
    act(() => result.current.handleSearch("match"));
    expect(result.current.matchedItemPositions).toEqual([
      { rowIdx: 0, colIdx: 0 },
      { rowIdx: 1, colIdx: 0 },
    ]);
  });

  it("clearMatchesで検索結果だけが破棄され検索フォームは開いたまま", () => {
    const { result } = renderHook(() => useTableSearch(viewRows, vi.fn()));
    act(() => result.current.openSearch());
    act(() => result.current.handleSearch("match"));
    act(() => result.current.clearMatches());
    expect(result.current.matchedItemPositions).toEqual([]);
    expect(result.current.searchedSelectedItemIdx).toBe(0);
    expect(result.current.searchOpen).toBe(true);
  });
});
