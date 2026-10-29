import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAutoFill } from "@/hooks/useAutoFill";

describe("useAutoFill - Property-Based Tests", () => {
  let mockUpdateCells = vi.fn();

  beforeEach(() => {
    mockUpdateCells = vi.fn();
    vi.clearAllMocks();
  });

  // テーブルデータのジェネレータ
  const tableDataArb = fc.array(
    fc.record({
      col0: fc.string(),
      col1: fc.string(),
      col2: fc.string(),
    }),
    { minLength: 5, maxLength: 20 }
  );

  it("フィル開始と終了が同じセルの場合、何も更新されない", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        (data, row, col) => {
          const validRow = Math.min(row, data.length - 1);
          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validRow, col);
          });

          act(() => {
            result.current.handleFillEnd();
          });

          // 同じセルなので更新されない
          expect(mockUpdateCells).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30 }
    );
  });

  it("縦方向のフィルで数値の場合、連番が生成される", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              col0: fc.integer({ min: 1, max: 100 }).map(String),
              col1: fc.string(),
            }),
            { minLength: 5, maxLength: 15 }
          )
          .chain((data) =>
            fc
              .integer({ min: 0, max: Math.min(10, data.length - 2) })
              .chain((startRow) =>
                fc
                  .integer({ min: 1, max: Math.min(4, data.length - startRow - 1) })
                  .map((fillCount) => ({ data, startRow, fillCount }))
              )
          ),
        ({ data, startRow, fillCount }) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = startRow;
          const validEndRow = validStartRow + fillCount;

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, 0);
          });

          act(() => {
            result.current.handleFillMove(validEndRow, 0);
          });

          act(() => {
            result.current.handleFillEnd();
          });

          expect(mockUpdateCells).toHaveBeenCalledTimes(1);

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{
            rowIdx: number;
            colIdx: number;
            value: string;
          }>;
          // フィル範囲のセル数は validEndRow - validStartRow
          expect(calls.length).toBe(Math.abs(validEndRow - validStartRow));
        }
      ),
      { numRuns: 50 }
    );
  });

  it("横方向のフィルで数値の場合、連番が生成される", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              col0: fc.integer({ min: 1, max: 100 }).map(String),
              col1: fc.string(),
              col2: fc.string(),
            }),
            { minLength: 5, maxLength: 15 }
          )
          .chain((data) =>
            fc
              .integer({ min: 0, max: Math.min(10, data.length - 1) })
              .chain((startRow) =>
                fc
                  .integer({ min: 0, max: 1 })
                  .chain((startCol) =>
                    fc
                      .integer({ min: 1, max: Math.min(2, 2 - startCol) })
                      .map((fillCount) => ({ data, startRow, startCol, fillCount }))
                  )
              )
          ),
        ({ data, startRow, startCol, fillCount }) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = startRow;
          const validEndCol = startCol + fillCount;

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, startCol);
          });

          act(() => {
            result.current.handleFillMove(validStartRow, validEndCol);
          });

          act(() => {
            result.current.handleFillEnd();
          });

          expect(mockUpdateCells).toHaveBeenCalledTimes(1);

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{
            rowIdx: number;
            colIdx: number;
            value: string;
          }>;
          // フィル範囲のセル数は validEndCol - startCol
          expect(calls.length).toBe(Math.abs(validEndCol - startCol));
        }
      ),
      { numRuns: 50 }
    );
  });

  it("文字列のフィルでは、同じ値がコピーされる", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              col0: fc.constantFrom("text", "hello", "world", "test", "abc"),
              col1: fc.string(),
            }),
            { minLength: 5, maxLength: 15 }
          )
          .chain((data) =>
            fc
              .integer({ min: 0, max: Math.min(10, data.length - 2) })
              .chain((startRow) =>
                fc
                  .integer({ min: 1, max: Math.min(4, data.length - startRow - 1) })
                  .map((fillCount) => ({ data, startRow, fillCount }))
              )
          ),
        ({ data, startRow, fillCount }) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = startRow;
          const validEndRow = validStartRow + fillCount;

          const startValue = data[validStartRow].col0;

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, 0);
          });

          act(() => {
            result.current.handleFillMove(validEndRow, 0);
          });

          act(() => {
            result.current.handleFillEnd();
          });

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{
            rowIdx: number;
            colIdx: number;
            value: string;
          }>;
          // すべてのセルが同じ値でコピーされている
          calls.forEach((call) => {
            expect(call.value).toBe(startValue);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("矩形範囲のフィルでは、開始セルの値がすべてのセルにコピーされる", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              col0: fc.string({ minLength: 1, maxLength: 10 }),
              col1: fc.string(),
              col2: fc.string(),
            }),
            { minLength: 5, maxLength: 15 }
          )
          .chain((data) =>
            fc
              .integer({ min: 0, max: Math.min(10, data.length - 2) })
              .chain((startRow) =>
                fc
                  .integer({ min: 0, max: 1 })
                  .chain((startCol) =>
                    fc
                      .integer({ min: 1, max: Math.min(3, data.length - startRow - 1) })
                      .chain((rowFill) =>
                        fc
                          .integer({ min: 1, max: Math.min(2, 2 - startCol) })
                          .map((colFill) => ({ data, startRow, startCol, rowFill, colFill }))
                      )
                  )
              )
          ),
        ({ data, startRow, startCol, rowFill, colFill }) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = startRow;
          const validEndRow = validStartRow + rowFill;
          const validEndCol = startCol + colFill;

          const startValue = data[validStartRow][`col${startCol}` as keyof (typeof data)[0]];

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, startCol);
          });

          act(() => {
            result.current.handleFillMove(validEndRow, validEndCol);
          });

          act(() => {
            result.current.handleFillEnd();
          });

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{
            rowIdx: number;
            colIdx: number;
            value: string;
          }>;
          // すべてのセルが同じ値でコピーされている
          calls.forEach((call) => {
            expect(call.value).toBe(startValue);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("isInFillRangeは、フィル範囲内のセルに対してtrueを返す", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        (data, startRow, startCol, endRow, endCol) => {
          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(endRow, data.length - 1);

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, startCol);
          });

          act(() => {
            result.current.handleFillMove(validEndRow, endCol);
          });

          // フィル範囲の計算
          const minRow = Math.min(validStartRow, validEndRow);
          const maxRow = Math.max(validStartRow, validEndRow);
          const minCol = Math.min(startCol, endCol);
          const maxCol = Math.max(startCol, endCol);

          // 範囲内のセルはtrue（reduceで検証）
          Array.from({ length: maxRow - minRow + 1 }).reduce((_, __, rowOffset) => {
            const r = minRow + rowOffset;
            Array.from({ length: maxCol - minCol + 1 }).reduce((__, ___, colOffset) => {
              const c = minCol + colOffset;
              expect(result.current.isInFillRange(r, c)).toBe(true);
              return null;
            }, null);
            return null;
          }, null);

          // 範囲外のセルはfalse（reduceで外側1セル分を検証）
          Array.from({ length: maxRow - minRow + 1 }).reduce((_, __, rowOffset) => {
            const r = minRow + rowOffset;
            expect(result.current.isInFillRange(r, minCol - 1)).toBe(false);
            expect(result.current.isInFillRange(r, maxCol + 1)).toBe(false);
            return null;
          }, null);
          Array.from({ length: maxCol - minCol + 1 }).reduce((_, __, colOffset) => {
            const c = minCol + colOffset;
            expect(result.current.isInFillRange(minRow - 1, c)).toBe(false);
            expect(result.current.isInFillRange(maxRow + 1, c)).toBe(false);
            return null;
          }, null);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("フィル操作中、isFillingがtrueになる", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        (data, row, col) => {
          const validRow = Math.min(row, data.length - 1);
          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          // 初期状態ではfalse
          expect(result.current.isFilling).toBe(false);

          act(() => {
            result.current.handleFillStart(validRow, col);
          });

          // フィル開始後はtrue
          expect(result.current.isFilling).toBe(true);

          act(() => {
            result.current.handleFillEnd();
          });

          // フィル終了後はfalse
          expect(result.current.isFilling).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("フィル終了後、fillStartCellとfillEndCellがnullにリセットされる", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        (data, startRow, startCol, endRow, endCol) => {
          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(endRow, data.length - 1);

          const { result } = renderHook(() => useAutoFill(data, mockUpdateCells));

          act(() => {
            result.current.handleFillStart(validStartRow, startCol);
          });

          expect(result.current.fillStartCell).not.toBeNull();

          act(() => {
            result.current.handleFillMove(validEndRow, endCol);
          });

          expect(result.current.fillEndCell).not.toBeNull();

          act(() => {
            result.current.handleFillEnd();
          });

          // フィル終了後はnull
          expect(result.current.fillStartCell).toBeNull();
          expect(result.current.fillEndCell).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  it("updateCellsCallbackが未指定の場合、エラーが発生しない", () => {
    fc.assert(
      fc.property(
        tableDataArb,
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 1, max: 3 }),
        (data, startRow, startCol, fillCount) => {
          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(validStartRow + fillCount, data.length - 1);

          // updateCellsCallbackを渡さない
          const { result } = renderHook(() => useAutoFill(data));

          expect(() => {
            act(() => {
              result.current.handleFillStart(validStartRow, startCol);
            });

            act(() => {
              result.current.handleFillMove(validEndRow, startCol);
            });

            act(() => {
              result.current.handleFillEnd();
            });
          }).not.toThrow();
        }
      ),
      { numRuns: 30 }
    );
  });
});
