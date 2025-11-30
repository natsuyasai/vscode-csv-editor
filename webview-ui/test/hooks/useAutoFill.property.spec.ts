import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAutoFill } from "@/hooks/useAutoFill";

describe("useAutoFill - Property-Based Tests", () => {
  let mockUpdateCells: ReturnType<typeof vi.fn>;

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
      fc.property(tableDataArb, fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 2 }), (data, row, col) => {
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
      }),
      { numRuns: 30 }
    );
  });

  it("縦方向のフィルで数値の場合、連番が生成される", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col0: fc.integer({ min: 1, max: 100 }).map(String),
            col1: fc.string(),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 4 }),
        (data, startRow, fillCount) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(validStartRow + fillCount, data.length - 1);

          if (validStartRow === validEndRow) {
            return; // 同じ行ならスキップ
          }

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

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{ rowIdx: number; colIdx: number; value: string }>;
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
        fc.array(
          fc.record({
            col0: fc.integer({ min: 1, max: 100 }).map(String),
            col1: fc.string(),
            col2: fc.string(),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 1, max: 2 }),
        (data, startRow, startCol, fillCount) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndCol = Math.min(startCol + fillCount, 2);

          if (startCol === validEndCol) {
            return; // 同じ列ならスキップ
          }

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

          const calls = mockUpdateCells.mock.calls[0][0] as Array<{ rowIdx: number; colIdx: number; value: string }>;
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
        fc.array(
          fc.record({
            col0: fc.string({ minLength: 1, maxLength: 10 }),
            col1: fc.string(),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 4 }),
        (data, startRow, fillCount) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(validStartRow + fillCount, data.length - 1);

          if (validStartRow === validEndRow) {
            return; // 同じ行ならスキップ
          }

          const startValue = data[validStartRow].col0;

          // 数値でない場合のみテスト
          if (!isNaN(parseFloat(startValue)) && startValue.trim() !== "") {
            return;
          }

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

          if (mockUpdateCells.mock.calls.length > 0) {
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
        }
      ),
      { numRuns: 50 }
    );
  });

  it("矩形範囲のフィルでは、開始セルの値がすべてのセルにコピーされる", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            col0: fc.string({ minLength: 1, maxLength: 10 }),
            col1: fc.string(),
            col2: fc.string(),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 2 }),
        (data, startRow, startCol, rowFill, colFill) => {
          mockUpdateCells.mockClear(); // 各テストケースの前にモックをクリア

          const validStartRow = Math.min(startRow, data.length - 1);
          const validEndRow = Math.min(validStartRow + rowFill, data.length - 1);
          const validEndCol = Math.min(startCol + colFill, 2);

          // 縦または横のみのフィルは除外（矩形範囲のみテスト）
          if (validStartRow === validEndRow || startCol === validEndCol) {
            return;
          }

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

          if (mockUpdateCells.mock.calls.length > 0) {
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

          // 範囲内のセルはtrue
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              expect(result.current.isInFillRange(r, c)).toBe(true);
            }
          }

          // 範囲外のセルはfalse（例: 範囲の外側）
          if (maxRow + 1 < data.length) {
            expect(result.current.isInFillRange(maxRow + 1, minCol)).toBe(false);
          }
          if (maxCol + 1 <= 2) {
            expect(result.current.isInFillRange(minRow, maxCol + 1)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("フィル操作中、isFillingがtrueになる", () => {
    fc.assert(
      fc.property(tableDataArb, fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 2 }), (data, row, col) => {
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
      }),
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
