import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHistory } from "@/hooks/useHistory";

describe("useHistory - Property-Based Tests", () => {
  let mockSetData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetData = vi.fn();
    vi.clearAllMocks();
  });

  it("任意の数の操作後、undo回数は操作回数と一致する", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.array(fc.array(fc.string(), { minLength: 1, maxLength: 5 }), {
              minLength: 1,
              maxLength: 5,
            }),
            { minLength: 2, maxLength: 20 }
          )
          .filter((ops) => ops.length >= 2),
        (operations) => {
          const { result } = renderHook(() => useHistory(mockSetData));

          // 操作を実行（fc.arrayを使って宣言的に記述）
          operations.slice(1).reduce((currentData, newData) => {
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            return newData;
          }, operations[0]);

          // undo回数をカウント（whileループは結果の検証のみに使用）
          let undoCount = 0;
          const maxUndos = operations.length;
          while (result.current.isEnabledUndo && undoCount < maxUndos) {
            act(() => {
              result.current.undo(operations[0]);
            });
            undoCount++;
          }

          // undoした回数は操作回数-1と一致
          expect(undoCount).toBe(operations.length - 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("undo → redo を繰り返すと元の状態に戻る", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.array(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), {
              minLength: 1,
              maxLength: 3,
            }),
            { minLength: 2, maxLength: 10 }
          )
          .chain((ops) =>
            fc
              .integer({ min: 1, max: Math.min(5, ops.length - 1) })
              .map((undoCount) => ({ operations: ops, undoCount }))
          ),
        ({ operations, undoCount }) => {
          const { result } = renderHook(() => useHistory(mockSetData));

          // 操作を実行
          const finalData = operations.slice(1).reduce((currentData, newData) => {
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            return newData;
          }, operations[0]);

          // 各undo操作の前に現在のデータを記録
          const undoCalls: Array<unknown> = [];
          Array.from({ length: undoCount }).reduce(() => {
            const currentData: unknown =
              mockSetData.mock.calls.length > 0
                ? (mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0] as unknown)
                : finalData;
            undoCalls.push(currentData);
            act(() => {
              result.current.undo(currentData);
            });
            return null;
          }, null);

          // 各redo操作の前に現在のデータを取得して実行
          Array.from({ length: undoCount }).reduce(() => {
            const currentData: unknown =
              mockSetData.mock.calls.length > 0
                ? (mockSetData.mock.calls[mockSetData.mock.calls.length - 1][0] as unknown)
                : finalData;
            act(() => {
              result.current.redo(currentData);
            });
            return null;
          }, null);

          // 元のデータに戻っている
          expect(mockSetData).toHaveBeenLastCalledWith(finalData);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("履歴の上限を超えた場合、古い履歴が削除される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }).chain((maxHistorySize) =>
          fc
            .array(fc.integer({ min: 0, max: 100 }), {
              minLength: maxHistorySize + 5,
              maxLength: 30,
            })
            .map((operations) => ({ operations, maxHistorySize }))
        ),
        ({ operations, maxHistorySize }) => {
          const { result } = renderHook(() => useHistory(mockSetData, { maxHistorySize }));

          // 操作を実行
          operations.slice(1).reduce((currentData, newData) => {
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            return newData;
          }, operations[0]);

          // undo回数をカウント
          let undoCount = 0;
          while (result.current.isEnabledUndo && undoCount < maxHistorySize + 1) {
            act(() => {
              result.current.undo(operations[0]);
            });
            undoCount++;
          }

          // undo回数は最大でmaxHistorySizeまで
          expect(undoCount).toBeLessThanOrEqual(maxHistorySize);
          expect(undoCount).toBe(Math.min(maxHistorySize, operations.length - 1));
        }
      ),
      { numRuns: 50 }
    );
  });

  it("新しい操作を行うとredo履歴は常にクリアされる", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.string(), { minLength: 3, maxLength: 10 })
          .chain((ops) =>
            fc
              .integer({ min: 1, max: Math.min(3, ops.length - 1) })
              .map((undoCount) => ({ operations: ops, undoCount }))
          ),
        ({ operations, undoCount }) => {
          const { result } = renderHook(() => useHistory(mockSetData));

          // 操作を実行
          operations.slice(1).reduce((currentData, newData) => {
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            return newData;
          }, operations[0]);

          // undo実行
          Array.from({ length: undoCount }).reduce(() => {
            act(() => {
              result.current.undo(operations[0]);
            });
            return null;
          }, null);

          // redoが有効であることを確認
          expect(result.current.isEnabledRedo).toBe(true);

          // 新しい操作を実行
          act(() => {
            result.current.setDataAndPushHistory("new-operation", operations[0]);
          });

          // redo履歴がクリアされた
          expect(result.current.isEnabledRedo).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("clearHistoryを実行すると、undo/redo履歴が完全にクリアされる", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.boolean(), { minLength: 2, maxLength: 15 })
          .chain((ops) =>
            fc
              .integer({ min: 0, max: Math.min(5, ops.length - 1) })
              .map((undoCount) => ({ operations: ops, undoCount }))
          ),
        ({ operations, undoCount }) => {
          const { result } = renderHook(() => useHistory(mockSetData));

          // 操作を実行
          operations.slice(1).reduce((currentData, newData) => {
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            return newData;
          }, operations[0]);

          // undo実行
          Array.from({ length: undoCount }).reduce(() => {
            act(() => {
              result.current.undo(operations[0]);
            });
            return null;
          }, null);

          // clearHistory実行
          act(() => {
            result.current.clearHistory();
          });

          // undo/redoが無効
          expect(result.current.isEnabledUndo).toBe(false);
          expect(result.current.isEnabledRedo).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("履歴が空の状態でundoを実行しても何も起きない", () => {
    fc.assert(
      fc.property(fc.anything(), (data) => {
        const { result } = renderHook(() => useHistory(mockSetData));
        const initialCallCount = mockSetData.mock.calls.length;

        act(() => {
          result.current.undo(data);
        });

        // setDataが呼ばれていない
        expect(mockSetData.mock.calls.length).toBe(initialCallCount);
        expect(result.current.isEnabledUndo).toBe(false);
        expect(result.current.isEnabledRedo).toBe(false);
      }),
      { numRuns: 30 }
    );
  });

  it("履歴が空の状態でredoを実行しても何も起きない", () => {
    fc.assert(
      fc.property(fc.anything(), (data) => {
        const { result } = renderHook(() => useHistory(mockSetData));
        const initialCallCount = mockSetData.mock.calls.length;

        act(() => {
          result.current.redo(data);
        });

        // setDataが呼ばれていない
        expect(mockSetData.mock.calls.length).toBe(initialCallCount);
        expect(result.current.isEnabledUndo).toBe(false);
        expect(result.current.isEnabledRedo).toBe(false);
      }),
      { numRuns: 30 }
    );
  });
});
