import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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

  // エッジケース：特殊文字と制御文字
  it("特殊文字や制御文字を含むデータでフィルタリングが動作すること", () => {
    const testRows = [
      { data: "normal text" },
      { data: "text\nwith\nnewlines" },
      { data: "text\twith\ttabs" },
      { data: "text with 改行\n and スペース　" },
      { data: ".*+?^${}()|[]" }, // 正規表現メタ文字
      { data: "<script>alert('xss')</script>" }, // XSS的な文字列
      { data: "🚀🎉✨" }, // 絵文字
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // 改行文字を含む検索
    act(() => {
      result.current.setFilter("data", "newlines");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // 正規表現メタ文字の検索
    act(() => {
      result.current.setFilter("data", ".*+");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // HTMLタグの検索
    act(() => {
      result.current.setFilter("data", "script");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // 絵文字の検索
    act(() => {
      result.current.setFilter("data", "🚀");
    });
    expect(result.current.filteredRows).toHaveLength(1);
  });

  it("不正な形式のダブルクオートが適切に処理されること", () => {
    const testRows = [
      { text: 'incomplete"quote' },
      { text: '"mismatched quote' },
      { text: 'quote"in middle' },
      { text: '""empty quotes""' },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // 不完全なクオートは通常の部分一致として扱われる
    act(() => {
      result.current.setFilter("text", 'incomplete"');
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // 開始クオートのみは通常の部分一致として扱われる
    act(() => {
      result.current.setFilter("text", '"mismatched');
    });
    expect(result.current.filteredRows).toHaveLength(1);
  });

  it("空のデータセットでエラーが発生しないこと", () => {
    const emptyRows: Array<Record<string, string>> = [];
    const { result } = renderHook(() => useFilters(emptyRows));

    act(() => {
      result.current.setFilter("nonexistent", "test");
    });

    expect(result.current.filteredRows).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("非常に長い文字列でのフィルタリングが動作すること", () => {
    const longString = "a".repeat(10000);
    const testRows = [
      { content: longString },
      { content: "short" },
      { content: longString + "extra" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("content", "a".repeat(5000));
    });

    expect(result.current.filteredRows).toHaveLength(2);
  });

  it("nullやundefinedの値が適切に処理されること", () => {
    const testRows = [
      { value: "normal" },
      { value: "" },
      { differentKey: "test" }, // valueキーが存在しない
    ] as Array<Record<string, string>>;

    const { result } = renderHook(() => useFilters(testRows));

    act(() => {
      result.current.setFilter("value", "normal");
    });

    // valueキーが存在しない行は除外される
    expect(result.current.filteredRows).toHaveLength(1);
  });

  it("大量データでのパフォーマンステスト", () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      category: i % 5 === 0 ? "Premium" : "Standard",
    }));

    const { result } = renderHook(() => useFilters(largeDataset));

    const startTime = performance.now();

    act(() => {
      result.current.setFilter("category", "Premium");
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 1000件のデータで100ms以内に処理が完了することを確認
    expect(duration).toBeLessThan(100);
    expect(result.current.filteredRows).toHaveLength(200); // 5で割り切れる数
  });

  it("複数言語文字セットでのフィルタリングが動作すること", () => {
    const testRows = [
      { text: "Hello World" }, // 英語
      { text: "こんにちは世界" }, // 日本語
      { text: "你好世界" }, // 中国語
      { text: "안녕하세요 세계" }, // 韓国語
      { text: "مرحبا بالعالم" }, // アラビア語
      { text: "Здравствуй мир" }, // ロシア語
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // 日本語検索
    act(() => {
      result.current.setFilter("text", "こんにちは");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // 中国語検索
    act(() => {
      result.current.setFilter("text", "你好");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // アラビア語検索
    act(() => {
      result.current.setFilter("text", "مرحبا");
    });
    expect(result.current.filteredRows).toHaveLength(1);
  });

  it("フィルター条件のリアルタイム変更で結果の整合性が保たれること", () => {
    const testRows = [
      { name: "Alice", age: "25", department: "Engineering" },
      { name: "Bob", age: "30", department: "Marketing" },
      { name: "Charlie", age: "35", department: "Engineering" },
    ];

    const { result } = renderHook(() => useFilters(testRows));

    // 最初のフィルター
    act(() => {
      result.current.setFilter("department", "Engineering");
    });
    expect(result.current.filteredRows).toHaveLength(2);

    // 追加フィルター
    act(() => {
      result.current.setFilter("age", "25");
    });
    expect(result.current.filteredRows).toHaveLength(1);

    // フィルター変更
    act(() => {
      result.current.setFilter("age", "30 or 35");
    });
    expect(result.current.filteredRows).toHaveLength(1); // Charlieのみ

    // フィルタークリア
    act(() => {
      result.current.clearFilter("age");
    });
    expect(result.current.filteredRows).toHaveLength(2); // Alice, Charlie
  });
});
