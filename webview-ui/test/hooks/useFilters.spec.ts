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

  // 全角半角同一視のテスト
  it("全角半角を同一視してフィルタリングすること", () => {
    const testRows = [
      { name: "田中Ａｂｃ", value: "１２３" },
      { name: "佐藤Abc", value: "123" },
      { name: "鈴木ＸＹＺ", value: "456" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // 全角で検索
    act(() => {
      result.current.setFilter("name", "Ａｂｃ");
    });

    expect(result.current.filteredRows).toHaveLength(2);
    expect(result.current.filteredRows.some((row) => row.name === "田中Ａｂｃ")).toBe(true);
    expect(result.current.filteredRows.some((row) => row.name === "佐藤Abc")).toBe(true);

    // 半角で検索
    act(() => {
      result.current.clearFilters();
      result.current.setFilter("value", "123");
    });

    expect(result.current.filteredRows).toHaveLength(2);
    expect(result.current.filteredRows.some((row) => row.value === "１２３")).toBe(true);
    expect(result.current.filteredRows.some((row) => row.value === "123")).toBe(true);
  });

  it("全角スペースも正しく処理されること", () => {
    const testRows = [{ text: "Hello　World" }, { text: "Hello World" }, { text: "Goodbye World" }];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("text", "Hello World");
    });

    expect(result.current.filteredRows).toHaveLength(2);
  });

  // AND検索のテスト
  it("AND検索が動作すること（スペース区切り）", () => {
    const testRows = [
      { name: "田中太郎", category: "Engineering" },
      { name: "田中花子", category: "Marketing" },
      { name: "佐藤太郎", category: "Sales" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("name", "田中 太郎");
    });

    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].name).toBe("田中太郎");
  });

  it("AND検索が動作すること（and キーワード使用）", () => {
    const testRows = [
      { name: "田中太郎", category: "Engineering" },
      { name: "田中花子", category: "Marketing" },
      { name: "佐藤太郎", category: "Sales" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("name", "田中 and 太郎");
    });

    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].name).toBe("田中太郎");
  });

  // OR検索のテスト
  it("OR検索が動作すること", () => {
    const testRows = [
      { name: "田中太郎", category: "Engineering" },
      { name: "佐藤花子", category: "Marketing" },
      { name: "鈴木一郎", category: "Sales" },
      { name: "高橋美子", category: "HR" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("category", "Engineering or Marketing");
    });

    expect(result.current.filteredRows).toHaveLength(2);
    expect(
      result.current.filteredRows.every(
        (row) => row.category === "Engineering" || row.category === "Marketing"
      )
    ).toBe(true);
  });

  it("複数項目のOR検索が動作すること", () => {
    const testRows = [
      { name: "田中太郎" },
      { name: "佐藤花子" },
      { name: "鈴木一郎" },
      { name: "高橋美子" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("name", "田中 or 佐藤 or 鈴木");
    });

    expect(result.current.filteredRows).toHaveLength(3);
    expect(
      result.current.filteredRows.every(
        (row) => row.name.includes("田中") || row.name.includes("佐藤") || row.name.includes("鈴木")
      )
    ).toBe(true);
  });

  it("基本的な英語フィルタリングが動作すること", () => {
    const testRows = [{ status: "Active" }, { status: "Inactive" }, { status: "Paused" }];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("status", "Active");
    });

    // "Active"は"Active"と"Inactive"の両方にマッチする（部分一致、大文字小文字を区別しない）
    expect(result.current.filteredRows).toHaveLength(2);
    expect(result.current.filteredRows.some((row) => row.status === "Active")).toBe(true);
    expect(result.current.filteredRows.some((row) => row.status === "Inactive")).toBe(true);
  });

  it("複雑なAND/OR組み合わせが動作すること", () => {
    const testRows = [
      { name: "田中太郎", status: "Running" },
      { name: "田中花子", status: "Stopped" },
      { name: "佐藤太郎", status: "Running" },
      { name: "佐藤花子", status: "Stopped" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // まずステータスフィルターのみでテスト
    act(() => {
      result.current.setFilter("status", "Running");
    });

    // Runningの行は2行のはず
    expect(result.current.filteredRows).toHaveLength(2);
    expect(result.current.filteredRows.every((row) => row.status === "Running")).toBe(true);

    // フィルターをクリアして、名前でOR検索
    act(() => {
      result.current.clearFilters();
      result.current.setFilter("name", "田中 or 佐藤");
    });

    // 全4行がマッチするはず（全員が田中または佐藤）
    expect(result.current.filteredRows).toHaveLength(4);

    // 次にステータスでも絞り込み
    act(() => {
      result.current.setFilter("status", "Running");
    });

    // 名前が（田中 or 佐藤） AND ステータスがRunning の行：2行
    expect(result.current.filteredRows).toHaveLength(2);
    expect(
      result.current.filteredRows.every(
        (row) =>
          (row.name.includes("田中") || row.name.includes("佐藤")) && row.status === "Running"
      )
    ).toBe(true);
  });
});
