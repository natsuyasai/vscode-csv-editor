import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFilters } from "@/hooks/useFilters";

describe("useFilters", () => {
  const sampleRows = [
    { col0: "Apple", col1: "Red", col2: "Fruit" },
    { col0: "Banana", col1: "Yellow", col2: "Fruit" },
    { col0: "Carrot", col1: "Orange", col2: "Vegetable" },
    { col0: "apple", col1: "Green", col2: "Fruit" },
  ];

  it("初期状態ではフィルターが空で全行が表示されること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    expect(result.current.filters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredRows).toEqual(sampleRows);
  });

  it("フィルターを設定できること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "apple");
    });

    expect(result.current.filters.col0).toBe("apple");
    expect(result.current.isFilterActive("col0")).toBe(true);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("大文字小文字を区別しない部分一致でフィルタリングされること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "apple");
    });

    expect(result.current.filteredRows).toEqual([
      { col0: "Apple", col1: "Red", col2: "Fruit" },
      { col0: "apple", col1: "Green", col2: "Fruit" },
    ]);
  });

  it("複数のフィルターを設定してAND条件でフィルタリングされること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col2", "Fruit");
      result.current.setFilter("col1", "Red");
    });

    expect(result.current.filteredRows).toEqual([{ col0: "Apple", col1: "Red", col2: "Fruit" }]);
  });

  it("個別のフィルターをクリアできること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "apple");
      result.current.setFilter("col2", "Fruit");
    });

    expect(result.current.filteredRows).toHaveLength(2);

    act(() => {
      result.current.clearFilter("col0");
    });

    expect(result.current.filters.col0).toBeUndefined();
    expect(result.current.isFilterActive("col0")).toBe(false);
    expect(result.current.filteredRows).toEqual([
      { col0: "Apple", col1: "Red", col2: "Fruit" },
      { col0: "Banana", col1: "Yellow", col2: "Fruit" },
      { col0: "apple", col1: "Green", col2: "Fruit" },
    ]);
  });

  it("全てのフィルターをクリアできること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "apple");
      result.current.setFilter("col2", "Fruit");
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredRows).toEqual(sampleRows);
  });

  it("空文字列のフィルターは無視されること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "");
    });

    expect(result.current.isFilterActive("col0")).toBe(false);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredRows).toEqual(sampleRows);
  });

  it("スペースのみのフィルターは無視されること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "   ");
    });

    expect(result.current.isFilterActive("col0")).toBe(false);
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredRows).toEqual(sampleRows);
  });

  it("存在しない列値でフィルターした場合は該当行が除外されること", () => {
    const { result } = renderHook(() => useFilters(sampleRows));

    act(() => {
      result.current.setFilter("col0", "NonExistent");
    });

    expect(result.current.filteredRows).toEqual([]);
  });

  it("データが更新された場合フィルター結果も更新されること", () => {
    const initialRows = [
      { col0: "Apple", col1: "Red", col2: "Fruit" },
      { col0: "Banana", col1: "Yellow", col2: "Fruit" },
    ];

    const updatedRows = [
      { col0: "Apple", col1: "Red", col2: "Fruit" },
      { col0: "Avocado", col1: "Green", col2: "Fruit" },
    ];

    const { result, rerender } = renderHook(({ rows }) => useFilters(rows), {
      initialProps: { rows: initialRows },
    });

    act(() => {
      result.current.setFilter("col0", "a");
    });

    expect(result.current.filteredRows).toHaveLength(2); // Apple, Banana

    rerender({ rows: updatedRows });

    expect(result.current.filteredRows).toHaveLength(2); // Apple, Avocado
    expect(result.current.filteredRows).toEqual([
      { col0: "Apple", col1: "Red", col2: "Fruit" },
      { col0: "Avocado", col1: "Green", col2: "Fruit" },
    ]);
  });
});
