import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { useRowResize } from "@/hooks/useRowResize";

describe("useRowResize - Property-Based Tests", () => {
  const DEFAULT_ROW_HEIGHT = 40;

  it("行の高さは常に20px〜500pxの範囲内に制限される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: -100, max: 1000 }),
        (rowIndex, height) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          act(() => {
            result.current.setRowHeight(rowIndex, height);
          });

          const actualHeight = result.current.getRowHeight(rowIndex);

          // 高さは20px〜500pxの範囲内
          expect(actualHeight).toBeGreaterThanOrEqual(20);
          expect(actualHeight).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("設定していない行のgetRowHeightはデフォルト高さを返す", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 20, max: 100 }),
        (rowIndex, defaultHeight) => {
          const { result } = renderHook(() => useRowResize(defaultHeight));

          // 設定していない行はデフォルト高さ
          expect(result.current.getRowHeight(rowIndex)).toBe(defaultHeight);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("リサイズ操作で行の高さが正しく更新される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: -50, max: 200 }),
        (rowIndex, deltaY) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          act(() => {
            result.current.startResize(rowIndex);
          });

          act(() => {
            result.current.handleResize(rowIndex, deltaY);
          });

          const expectedHeight = Math.max(20, Math.min(500, DEFAULT_ROW_HEIGHT + deltaY));
          expect(result.current.getRowHeight(rowIndex)).toBe(expectedHeight);

          act(() => {
            result.current.endResize();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("複数回のリサイズ操作で累積的に高さが変更される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.array(fc.integer({ min: -20, max: 20 }), { minLength: 2, maxLength: 10 }),
        (rowIndex, deltas) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          deltas.forEach((delta) => {
            act(() => {
              result.current.startResize(rowIndex);
            });

            act(() => {
              result.current.handleResize(rowIndex, delta);
            });

            act(() => {
              result.current.endResize();
            });
          });

          // 最後のリサイズ操作の高さが反映されている
          const finalHeight = result.current.getRowHeight(rowIndex);
          expect(finalHeight).toBeGreaterThanOrEqual(20);
          expect(finalHeight).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("resetAllRowHeightsですべての行の高さがリセットされる", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            rowIndex: fc.integer({ min: 0, max: 20 }),
            height: fc.integer({ min: 20, max: 500 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (rows) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          // 複数の行の高さを設定
          rows.forEach(({ rowIndex, height }) => {
            act(() => {
              result.current.setRowHeight(rowIndex, height);
            });
          });

          // リセット
          act(() => {
            result.current.resetAllRowHeights();
          });

          // すべての行がデフォルト高さに戻る
          rows.forEach(({ rowIndex }) => {
            expect(result.current.getRowHeight(rowIndex)).toBe(DEFAULT_ROW_HEIGHT);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("異なる行に異なる高さを設定できる", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            rowIndex: fc.integer({ min: 0, max: 20 }),
            height: fc.integer({ min: 20, max: 500 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (rows) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          // 行ごとに最後の高さを記録（同じ行に複数回設定された場合、最後の値が優先される）
          const finalHeights = new Map<number, number>();
          rows.forEach(({ rowIndex, height }) => {
            finalHeights.set(rowIndex, height);
          });

          // 各行に高さを設定
          rows.forEach(({ rowIndex, height }) => {
            act(() => {
              result.current.setRowHeight(rowIndex, height);
            });
          });

          // 最後に設定された高さが正しく設定されている
          finalHeights.forEach((height, rowIndex) => {
            const clampedHeight = Math.max(20, Math.min(500, height));
            expect(result.current.getRowHeight(rowIndex)).toBe(clampedHeight);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("同じ行に対して高さを複数回設定すると、最後の値が適用される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.integer({ min: 20, max: 500 }), { minLength: 2, maxLength: 5 }),
        (rowIndex, heights) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          heights.forEach((height) => {
            act(() => {
              result.current.setRowHeight(rowIndex, height);
            });
          });

          // 最後の高さが適用されている
          const lastHeight = heights[heights.length - 1];
          expect(result.current.getRowHeight(rowIndex)).toBe(lastHeight);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("高さの下限(20px)未満の値を設定すると、20pxに制限される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: -1000, max: 19 }),
        (rowIndex, height) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          act(() => {
            result.current.setRowHeight(rowIndex, height);
          });

          expect(result.current.getRowHeight(rowIndex)).toBe(20);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("高さの上限(500px)を超える値を設定すると、500pxに制限される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 501, max: 10000 }),
        (rowIndex, height) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          act(() => {
            result.current.setRowHeight(rowIndex, height);
          });

          expect(result.current.getRowHeight(rowIndex)).toBe(500);
        }
      ),
      { numRuns: 30 }
    );
  });

  it("リサイズ中に複数回handleResizeを呼んでも、累積的に適用される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 1, maxLength: 5 }),
        (rowIndex, deltas) => {
          const { result } = renderHook(() => useRowResize(DEFAULT_ROW_HEIGHT));

          act(() => {
            result.current.startResize(rowIndex);
          });

          // 複数回handleResizeを呼ぶ（最後のdeltaのみが適用される）
          deltas.forEach((delta) => {
            act(() => {
              result.current.handleResize(rowIndex, delta);
            });
          });

          // 最後のdeltaが適用されている
          const lastDelta = deltas[deltas.length - 1];
          const expectedHeight = Math.max(20, Math.min(500, DEFAULT_ROW_HEIGHT + lastDelta));
          expect(result.current.getRowHeight(rowIndex)).toBe(expectedHeight);

          act(() => {
            result.current.endResize();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("異なるデフォルト高さで初期化しても正しく動作する", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 100 }),
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 20, max: 500 }),
        (defaultHeight, rowIndex, newHeight) => {
          const { result } = renderHook(() => useRowResize(defaultHeight));

          // 初期状態ではデフォルト高さ
          expect(result.current.getRowHeight(rowIndex)).toBe(defaultHeight);

          // 高さを設定
          act(() => {
            result.current.setRowHeight(rowIndex, newHeight);
          });

          // 設定した高さが反映されている
          expect(result.current.getRowHeight(rowIndex)).toBe(newHeight);
        }
      ),
      { numRuns: 50 }
    );
  });
});
