import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTableSearch } from "@/hooks/useTableSearch";
import { ROW_IDX_KEY, ROW_ID_KEY } from "@/types";

describe("useTableSearch - Property-Based Tests", () => {
  let mockTableContainerRef: React.RefObject<HTMLDivElement>;
  let mockScrollTo: ReturnType<typeof vi.fn>;
  const rowHeight = 40;

  beforeEach(() => {
    mockScrollTo = vi.fn();
    mockTableContainerRef = {
      current: {
        scrollTo: mockScrollTo,
      } as unknown as HTMLDivElement,
    };
    vi.clearAllMocks();
  });

  // テーブルデータのジェネレータ
  const tableDataArb = fc.array(
    fc.record({
      [ROW_IDX_KEY]: fc.string(),
      [ROW_ID_KEY]: fc.string(),
      col0: fc.string(),
      col1: fc.string(),
      col2: fc.string(),
    }),
    { minLength: 1, maxLength: 20 }
  );

  it("検索結果の数は、検索文字列を含むセルの数と一致する", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string({ minLength: 1, maxLength: 10 }), (data, searchText) => {
        const { result } = renderHook(() => useTableSearch(data, rowHeight, mockTableContainerRef));

        act(() => {
          result.current.handleSearch(searchText);
        });

        // 手動でマッチ数を計算（空白のみの検索文字列は0件とする）
        let expectedMatches = 0;
        const trimmedSearchText = searchText.trim();
        const lowerSearchText = trimmedSearchText.toLowerCase();

        // 空白のみの場合は0件
        expectedMatches =
          trimmedSearchText === ""
            ? 0
            : data.reduce((count, row) => {
                return (
                  count +
                  Object.keys(row).reduce((cellCount, key) => {
                    if (key === ROW_IDX_KEY || key === ROW_ID_KEY) {
                      return cellCount;
                    }
                    const value = row[key as keyof typeof row];
                    return (
                      cellCount +
                      (value &&
                      (typeof value === "string" || typeof value === "number") &&
                      String(value).toLowerCase().includes(lowerSearchText)
                        ? 1
                        : 0)
                    );
                  }, 0)
                );
              }, 0);

        expect(result.current.matchedItemPositions.length).toBe(expectedMatches);
      }),
      { numRuns: 50 }
    );
  });

  it("次へを繰り返すと、最終的に最初の検索結果に戻る", () => {
    fc.assert(
      fc.property(
        tableDataArb.chain((data) =>
          fc
            .string({ minLength: 1, maxLength: 5 })
            .filter((searchText) => {
              // マッチがあるかを事前確認
              const lowerSearchText = searchText.toLowerCase();
              return data.some((row) =>
                Object.keys(row).some((key) => {
                  if (key === ROW_IDX_KEY || key === ROW_ID_KEY) return false;
                  const value = row[key as keyof typeof row];
                  return (
                    value &&
                    (typeof value === "string" || typeof value === "number") &&
                    String(value).toLowerCase().includes(lowerSearchText)
                  );
                })
              );
            })
            .map((searchText) => ({ data, searchText }))
        ),
        ({ data, searchText }) => {
          const { result } = renderHook(() => useTableSearch(data, rowHeight, mockTableContainerRef));

          act(() => {
            result.current.handleSearch(searchText);
          });

          const matchCount = result.current.matchedItemPositions.length;

          // マッチ数回「次へ」を実行（reduceで実行）
          Array.from({ length: matchCount }).reduce(() => {
            act(() => {
              result.current.handleNextSearch();
            });
            return null;
          }, null);

          // 最初のインデックス（0）に戻っていること
          expect(result.current.searchedSelectedItemIdx).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("前へを繰り返すと、最終的に最後の検索結果に戻る", () => {
    fc.assert(
      fc.property(
        tableDataArb.chain((data) =>
          fc
            .string({ minLength: 1, maxLength: 5 })
            .filter((searchText) => {
              // マッチがあるかを事前確認
              const lowerSearchText = searchText.toLowerCase();
              return data.some((row) =>
                Object.keys(row).some((key) => {
                  if (key === ROW_IDX_KEY || key === ROW_ID_KEY) return false;
                  const value = row[key as keyof typeof row];
                  return (
                    value &&
                    (typeof value === "string" || typeof value === "number") &&
                    String(value).toLowerCase().includes(lowerSearchText)
                  );
                })
              );
            })
            .map((searchText) => ({ data, searchText }))
        ),
        ({ data, searchText }) => {
          const { result } = renderHook(() => useTableSearch(data, rowHeight, mockTableContainerRef));

          act(() => {
            result.current.handleSearch(searchText);
          });

          const matchCount = result.current.matchedItemPositions.length;

          // マッチ数回「前へ」を実行（reduceで実行）
          Array.from({ length: matchCount }).reduce(() => {
            act(() => {
              result.current.handlePreviousSearch();
            });
            return null;
          }, null);

          // 最初のインデックス（0）に戻っていること
          expect(result.current.searchedSelectedItemIdx).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("次へ → 前へを繰り返すと、インデックスが変化しない", () => {
    fc.assert(
      fc.property(
        tableDataArb.chain((data) =>
          fc
            .string({ minLength: 1, maxLength: 5 })
            .filter((searchText) => {
              // マッチがあるかを事前確認
              const lowerSearchText = searchText.toLowerCase();
              return data.some((row) =>
                Object.keys(row).some((key) => {
                  if (key === ROW_IDX_KEY || key === ROW_ID_KEY) return false;
                  const value = row[key as keyof typeof row];
                  return (
                    value &&
                    (typeof value === "string" || typeof value === "number") &&
                    String(value).toLowerCase().includes(lowerSearchText)
                  );
                })
              );
            })
            .chain((searchText) =>
              fc.integer({ min: 1, max: 10 }).map((iterations) => ({ data, searchText, iterations }))
            )
        ),
        ({ data, searchText, iterations }) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          act(() => {
            result.current.handleSearch(searchText);
          });

          const initialIdx = result.current.searchedSelectedItemIdx;

          // 次へ → 前へを繰り返す（reduceで実行）
          Array.from({ length: iterations }).reduce(() => {
            act(() => {
              result.current.handleNextSearch();
            });
            act(() => {
              result.current.handlePreviousSearch();
            });
            return null;
          }, null);

          // 最初のインデックスに戻っていること
          expect(result.current.searchedSelectedItemIdx).toBe(initialIdx);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("検索を閉じると、すべての状態がリセットされる", () => {
    fc.assert(
      fc.property(tableDataArb, fc.string({ minLength: 1, maxLength: 10 }), (data, searchText) => {
        const { result } = renderHook(() => useTableSearch(data, rowHeight, mockTableContainerRef));

        // 検索を開いて実行
        act(() => {
          result.current.openSearch();
        });
        act(() => {
          result.current.handleSearch(searchText);
        });

        // 検索を閉じる
        act(() => {
          result.current.handleCloseSearch();
        });

        // すべての状態がリセットされていること
        expect(result.current.searchOpen).toBe(false);
        expect(result.current.matchedItemPositions).toEqual([]);
        expect(result.current.searchedSelectedItemIdx).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  it("空文字列や空白文字のみの検索では、マッチ結果が空になる", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.constantFrom("", "  ", "\t", "\n", "   \t\n  "),
        (data, emptySearchText) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          act(() => {
            result.current.handleSearch(emptySearchText);
          });

          // 空文字列や空白文字の検索では何もマッチしない
          expect(result.current.matchedItemPositions).toEqual([]);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("検索結果がある場合、searchedSelectedItemIdxは常に有効な範囲内", () => {
    fc.assert(
      fc.property(
        tableDataArb.chain((data) =>
          fc
            .string({ minLength: 1, maxLength: 5 })
            .map((s) => s.trim())
            .filter((searchText) => {
              // 空文字列を除外
              if (searchText === "") return false;

              // マッチがあるかを事前確認
              const lowerSearchText = searchText.toLowerCase();
              return data.some((row) =>
                Object.keys(row).some((key) => {
                  if (key === ROW_IDX_KEY || key === ROW_ID_KEY) return false;
                  const value = row[key as keyof typeof row];
                  return (
                    value &&
                    (typeof value === "string" || typeof value === "number") &&
                    String(value).toLowerCase().includes(lowerSearchText)
                  );
                })
              );
            })
            .chain((searchText) =>
              fc
                .array(fc.constantFrom("next", "previous"), { minLength: 1, maxLength: 20 })
                .map((actions) => ({ data, searchText, actions }))
            )
        ),
        ({ data, searchText, actions }) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          act(() => {
            result.current.handleSearch(searchText);
          });

          const matchCount = result.current.matchedItemPositions.length;

          // 次へ/前へを繰り返す（forEachはセットアップ操作として許可）
          actions.forEach((action) => {
            act(() => {
              if (action === "next") {
                result.current.handleNextSearch();
              } else {
                result.current.handlePreviousSearch();
              }
            });

            // インデックスが有効な範囲内であることを確認
            expect(result.current.searchedSelectedItemIdx).toBeGreaterThanOrEqual(0);
            expect(result.current.searchedSelectedItemIdx).toBeLessThan(matchCount);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("大文字小文字を区別せずに検索される", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            [ROW_IDX_KEY]: fc.string(),
            [ROW_ID_KEY]: fc.string(),
            col0: fc.constantFrom("Apple", "APPLE", "apple", "ApPlE"),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom("apple", "APPLE", "Apple", "aPpLe"),
        (data, searchText) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          act(() => {
            result.current.handleSearch(searchText);
          });

          // すべての行がマッチするはず（大文字小文字を区別しないため）
          expect(result.current.matchedItemPositions.length).toBe(data.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("ROW_IDX_KEYとROW_ID_KEYは常に検索対象外", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            [ROW_IDX_KEY]: fc.string({ minLength: 1, maxLength: 10 }),
            [ROW_ID_KEY]: fc.string({ minLength: 1, maxLength: 10 }),
            col0: fc.string(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (data) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          // ROW_IDX_KEYの値を検索
          const rowIdxValue = data[0][ROW_IDX_KEY];
          act(() => {
            result.current.handleSearch(rowIdxValue);
          });

          // ROW_IDX_KEYの値がcol0に含まれない限り、マッチしないはず
          const expectedMatches = data.filter((row) =>
            String(row.col0).toLowerCase().includes(rowIdxValue.toLowerCase())
          ).length;

          expect(result.current.matchedItemPositions.length).toBe(expectedMatches);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("数値データも検索対象に含まれる", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            [ROW_IDX_KEY]: fc.string(),
            [ROW_ID_KEY]: fc.string(),
            col0: fc.oneof(fc.string(), fc.integer()),
            col1: fc.oneof(fc.string(), fc.integer()),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 999 }),
        (data, searchNumber) => {
          const { result } = renderHook(() =>
            useTableSearch(data, rowHeight, mockTableContainerRef)
          );

          act(() => {
            result.current.handleSearch(String(searchNumber));
          });

          // 手動でマッチ数を計算
          let expectedMatches = 0;
          const searchText = String(searchNumber);

          data.forEach((row) => {
            if (String(row.col0).includes(searchText)) {
              expectedMatches++;
            }
            if (String(row.col1).includes(searchText)) {
              expectedMatches++;
            }
          });

          expect(result.current.matchedItemPositions.length).toBe(expectedMatches);
        }
      ),
      { numRuns: 30 }
    );
  });
});
