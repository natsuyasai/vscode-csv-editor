import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearch } from "@/hooks/useSearch";
import { DataGridHandle } from "react-data-grid";

describe("useSearch", () => {
  let sortedRows: Array<Record<string, string>>;
  let scrollToCell: ReturnType<typeof vi.fn>;
  let gridRef: React.RefObject<DataGridHandle | null>;

  beforeEach(() => {
    sortedRows = [
      { _csv_row_id_key: "", _csv_row_index: "1", id: "1", col1: "apple", col2: "banana" },
      { _csv_row_id_key: "", _csv_row_index: "2", id: "2", col1: "orange", col2: "grape" },
      { _csv_row_id_key: "", _csv_row_index: "3", id: "3", col1: "melon", col2: "banana" },
    ];
    scrollToCell = vi.fn();
    gridRef = {
      current: {
        scrollToCell,
      } as unknown as DataGridHandle,
    };
  });
  describe("handleSearch", () => {
    it("一致するセルがある場合、最初の一致セルにスクロール・選択される", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("banana"));
      expect(scrollToCell).toHaveBeenCalledWith({ idx: 3, rowIdx: 0 });
      expect(result.current.isMatched).toBe(true);
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 0 });
    });

    it("大文字小文字を区別せず検索できる", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("BANANA"));
      expect(scrollToCell).toHaveBeenCalledWith({ idx: 3, rowIdx: 0 });
      expect(result.current.isMatched).toBe(true);
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 0 });
    });

    it("一致するセルが複数ある場合、全ての位置が記録される", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("banana"));
      // 1行目col2, 3行目col2
      expect(scrollToCell).toHaveBeenCalledWith({ idx: 3, rowIdx: 0 });
      expect(result.current.isMatched).toBe(true);
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 0 });
      // handleNextSearchで次の一致セルに移動
      act(() => result.current.handleNextSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 2 });
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 2 });
    });

    it("空文字列の場合は何もしない", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch(""));
      expect(scrollToCell).not.toHaveBeenCalled();
      expect(result.current.isMatched).toBe(false);
      expect(result.current.currentCell).toBeNull();
    });

    it("一致するセルがない場合は何もしない", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("notfound"));
      expect(scrollToCell).not.toHaveBeenCalled();
      expect(result.current.isMatched).toBe(false);
      expect(result.current.currentCell).toBeNull();
    });

    it("固定列（index=0）は検索対象外", () => {
      sortedRows = [
        { id: "apple", col1: "foo", col2: "bar" },
        { id: "banana", col1: "baz", col2: "qux" },
      ];
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("apple"));
      expect(scrollToCell).not.toHaveBeenCalled();
      expect(result.current.isMatched).toBe(false);
      expect(result.current.currentCell).toBeNull();
    });
  });

  describe("handleNextSearch", () => {
    it("一致セルが1つしかない場合は同じセルに戻る", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("orange"));
      act(() => result.current.handleNextSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 2, rowIdx: 1 });
      expect(result.current.currentCell).toEqual({ colIdx: 2, rowIdx: 1 });
    });

    it("一致セルが複数ある場合は次のセルに移動し、末尾で先頭に戻る", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("banana"));
      act(() => result.current.handleNextSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 2 });
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 2 });
      act(() => result.current.handleNextSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 0 });
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 0 });
    });

    it("一致セルがない場合は何もしない", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleNextSearch());
      expect(scrollToCell).not.toHaveBeenCalled();
      expect(result.current.isMatched).toBe(false);
      expect(result.current.currentCell).toBeNull();
    });
  });

  describe("handlePreviousSearch", () => {
    it("一致セルが1つしかない場合は同じセルに戻る", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("orange"));
      act(() => result.current.handlePreviousSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 2, rowIdx: 1 });
      expect(result.current.currentCell).toEqual({ colIdx: 2, rowIdx: 1 });
    });

    it("一致セルが複数ある場合は前のセルに移動し、先頭で末尾に戻る", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handleSearch("banana"));
      act(() => result.current.handlePreviousSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 2 });
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 2 });
      act(() => result.current.handlePreviousSearch());
      expect(scrollToCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 0 });
      expect(result.current.currentCell).toEqual({ colIdx: 3, rowIdx: 0 });
    });

    it("一致セルがない場合は何もしない", () => {
      const { result } = renderHook(() => useSearch({ sortedRows, gridRef }));
      act(() => result.current.handlePreviousSearch());
      expect(scrollToCell).not.toHaveBeenCalled();
      expect(result.current.isMatched).toBe(false);
      expect(result.current.currentCell).toBeNull();
    });
  });
});
