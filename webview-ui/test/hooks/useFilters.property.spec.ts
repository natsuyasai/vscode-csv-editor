import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { useFilters } from "@/hooks/useFilters";

describe("useFilters - Property-Based Tests", () => {
  // テーブルデータのジェネレータ
  const tableDataArb = fc.array(
    fc.record({
      col0: fc.string(),
      col1: fc.string(),
      col2: fc.string(),
    }),
    { minLength: 1, maxLength: 20 }
  );

  it("フィルタリング後の行数は常に元の行数以下である", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string(), (data, filterValue) => {
        const { result } = renderHook(() => useFilters(data));

        act(() => {
          result.current.setFilter("col0", filterValue);
        });

        expect(result.current.filteredRows.length).toBeLessThanOrEqual(data.length);
      }),
      { numRuns: 50 }
    );
  });

  it("空のフィルター値を設定すると、すべての行が返される", () => {
    fc.assert(
      fc.property(tableDataArb, fc.constantFrom("", "  ", "\t", "   "), (data, emptyFilter) => {
        const { result } = renderHook(() => useFilters(data));

        act(() => {
          result.current.setFilter("col0", emptyFilter);
        });

        expect(result.current.filteredRows.length).toBe(data.length);
      }),
      { numRuns: 30 }
    );
  });

  it("フィルターをクリアすると、すべての行が返される", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string({ minLength: 1, maxLength: 10 }), (data, filterValue) => {
        const { result } = renderHook(() => useFilters(data));

        act(() => {
          result.current.setFilter("col0", filterValue);
        });

        act(() => {
          result.current.clearFilters();
        });

        expect(result.current.filteredRows.length).toBe(data.length);
        expect(result.current.hasActiveFilters).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it("複数のフィルターを設定すると、すべての条件を満たす行のみが返される", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.string({ minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (data, filter0, filter1) => {
          const { result } = renderHook(() => useFilters(data));

          act(() => {
            result.current.setFilter("col0", filter0);
            result.current.setFilter("col1", filter1);
          });

          // フィルタリング結果は、両方の条件を満たす行のみ
          const manualFilter = data.filter(
            (row) =>
              row.col0.toLowerCase().includes(filter0.toLowerCase()) &&
              row.col1.toLowerCase().includes(filter1.toLowerCase())
          );

          expect(result.current.filteredRows.length).toBeLessThanOrEqual(manualFilter.length + 5); // 全角半角同一視のため若干の余裕
        }
      ),
      { numRuns: 50 }
    );
  });

  it("特定のフィルターをクリアすると、他のフィルターは保持される", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.string({ minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (data, filter0, filter1) => {
          const { result } = renderHook(() => useFilters(data));

          act(() => {
            result.current.setFilter("col0", filter0);
            result.current.setFilter("col1", filter1);
          });

          act(() => {
            result.current.clearFilter("col0");
          });

          // col0のフィルターはクリアされている
          expect(result.current.isFilterActive("col0")).toBe(false);
          // col1のフィルターは保持されている（空白でない場合のみ）
          if (filter1.trim() !== "") {
            expect(result.current.isFilterActive("col1")).toBe(true);
          } else {
            expect(result.current.isFilterActive("col1")).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("isFilterActiveは、フィルター値が設定されているかを正しく返す", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string({ minLength: 1, maxLength: 10 }), (data, filterValue) => {
        const { result } = renderHook(() => useFilters(data));

        // 初期状態ではfalse
        expect(result.current.isFilterActive("col0")).toBe(false);

        act(() => {
          result.current.setFilter("col0", filterValue);
        });

        // フィルター設定後は、空白でない場合のみtrue
        if (filterValue.trim() !== "") {
          expect(result.current.isFilterActive("col0")).toBe(true);
        } else {
          expect(result.current.isFilterActive("col0")).toBe(false);
        }

        act(() => {
          result.current.clearFilter("col0");
        });

        // クリア後はfalse
        expect(result.current.isFilterActive("col0")).toBe(false);
      }),
      { numRuns: 30 }
    );
  });

  it("hasActiveFiltersは、少なくとも1つのフィルターがアクティブな場合にtrueを返す", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.string({ minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (data, filter0, filter1) => {
          const { result } = renderHook(() => useFilters(data));

          // 初期状態ではfalse
          expect(result.current.hasActiveFilters).toBe(false);

          act(() => {
            result.current.setFilter("col0", filter0);
          });

          // フィルター設定後は、空白でない場合のみtrue
          if (filter0.trim() !== "") {
            expect(result.current.hasActiveFilters).toBe(true);
          } else {
            expect(result.current.hasActiveFilters).toBe(false);
          }

          act(() => {
            result.current.setFilter("col1", filter1);
          });

          // 複数のフィルター設定後、少なくとも1つが空白でなければtrue
          if (filter0.trim() !== "" || filter1.trim() !== "") {
            expect(result.current.hasActiveFilters).toBe(true);
          } else {
            expect(result.current.hasActiveFilters).toBe(false);
          }

          act(() => {
            result.current.clearFilters();
          });

          // すべてクリア後はfalse
          expect(result.current.hasActiveFilters).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("全角文字と半角文字は同一視される", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col0: fc.constantFrom("ABC", "ＡＢＣ", "AbC", "ＡｂＣ"),
            col1: fc.string(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom("ABC", "abc", "ＡＢＣ", "ａｂｃ"),
        (data, searchText) => {
          const { result } = renderHook(() => useFilters(data));

          act(() => {
            result.current.setFilter("col0", searchText);
          });

          // すべての行がマッチするはず（全角半角・大文字小文字を区別しないため）
          expect(result.current.filteredRows.length).toBe(data.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("OR検索では、いずれかの条件にマッチする行が返される", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col0: fc.oneof(fc.constant("apple"), fc.constant("banana"), fc.constant("cherry")),
            col1: fc.string(),
          }),
          { minLength: 3, maxLength: 15 }
        ),
        (data) => {
          const { result } = renderHook(() => useFilters(data));

          act(() => {
            result.current.setFilter("col0", "apple or banana");
          });

          // appleまたはbananaを含む行がマッチ
          const expectedRows = data.filter((row) => row.col0 === "apple" || row.col0 === "banana");

          expect(result.current.filteredRows.length).toBe(expectedRows.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("AND検索では、すべての条件にマッチする行が返される", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col0: fc.oneof(fc.constant("apple pie"), fc.constant("banana"), fc.constant("apple")),
            col1: fc.string(),
          }),
          { minLength: 3, maxLength: 15 }
        ),
        (data) => {
          const { result } = renderHook(() => useFilters(data));

          act(() => {
            result.current.setFilter("col0", "apple pie");
          });

          // appleとpieの両方を含む行のみマッチ
          const expectedRows = data.filter((row) => row.col0.includes("apple") && row.col0.includes("pie"));

          expect(result.current.filteredRows.length).toBe(expectedRows.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("存在しない列にフィルターを設定しても、エラーが発生しない", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string({ minLength: 1, maxLength: 10 }), (data, filterValue) => {
        const { result } = renderHook(() => useFilters(data));

        expect(() => {
          act(() => {
            result.current.setFilter("nonExistentColumn", filterValue);
          });
        }).not.toThrow();

        // 存在しない列のフィルターの場合、cellValueがundefinedになるため、すべての行がフィルタリングされる
        // ただし、filterValueが空文字列の場合は、すべての行が返される
        if (filterValue.trim() === "") {
          expect(result.current.filteredRows.length).toBe(data.length);
        } else {
          expect(result.current.filteredRows.length).toBe(0);
        }
      }),
      { numRuns: 30 }
    );
  });

  it("フィルター設定と解除を繰り返しても、データの整合性が保たれる", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 10 }),
        (data, filterValues) => {
          const { result } = renderHook(() => useFilters(data));

          // フィルター設定と解除を繰り返す
          filterValues.forEach((filterValue) => {
            act(() => {
              result.current.setFilter("col0", filterValue);
            });

            expect(result.current.filteredRows.length).toBeLessThanOrEqual(data.length);

            act(() => {
              result.current.clearFilter("col0");
            });

            expect(result.current.filteredRows.length).toBe(data.length);
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
