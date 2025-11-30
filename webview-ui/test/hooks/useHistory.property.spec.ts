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

  it("任意の数の操作後、undo回数とredo回数の合計は操作回数と一致する", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.array(fc.string(), { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 20 }),
        (operations) => {
          const { result } = renderHook(() => useHistory(mockSetData));
          let currentData = operations[0];

          // 操作を実行
          for (let i = 1; i < operations.length; i++) {
            const newData = operations[i];
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            currentData = newData;
          }

          // すべてundo
          let undoCount = 0;
          while (result.current.isEnabledUndo) {
            act(() => {
              result.current.undo(currentData);
              currentData = operations[operations.length - 2 - undoCount];
            });
            undoCount++;
          }

          // undoした回数 + 1(初期データ) は操作回数と一致するはず
          expect(undoCount).toBe(operations.length - 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("undo → redo を繰り返すと元の状態に戻る", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.array(fc.string(), { minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 3 }), { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (operations, undoCount) => {
          const { result } = renderHook(() => useHistory(mockSetData));
          let currentData = operations[0];

          // 操作を実行
          for (let i = 1; i < operations.length; i++) {
            const newData = operations[i];
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            currentData = newData;
          }

          const actualUndoCount = Math.min(undoCount, operations.length - 1);
          const dataBeforeUndo = currentData;

          // undo実行
          for (let i = 0; i < actualUndoCount; i++) {
            const prevData = operations[operations.length - 1 - i];
            act(() => {
              result.current.undo(prevData);
            });
          }

          // redo実行
          for (let i = 0; i < actualUndoCount; i++) {
            const nextData = operations[operations.length - actualUndoCount + i];
            act(() => {
              result.current.redo(nextData);
            });
          }

          // 最後のsetDataの呼び出しが元のデータであることを確認
          expect(mockSetData).toHaveBeenLastCalledWith(dataBeforeUndo);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("履歴の上限を超えた場合、古い履歴が削除される", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 10, maxLength: 30 }),
        fc.integer({ min: 3, max: 10 }),
        (operations, maxHistorySize) => {
          const { result } = renderHook(() => useHistory(mockSetData, { maxHistorySize }));
          let currentData = operations[0];

          // 操作を実行
          for (let i = 1; i < operations.length; i++) {
            const newData = operations[i];
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            currentData = newData;
          }

          // 最大でmaxHistorySize回までしかundoできない
          let undoCount = 0;
          while (result.current.isEnabledUndo && undoCount < maxHistorySize + 1) {
            act(() => {
              result.current.undo(currentData);
              currentData = operations[Math.max(0, operations.length - 2 - undoCount)];
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
        fc.array(fc.string(), { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 1, max: 3 }),
        (operations, undoCount) => {
          const { result } = renderHook(() => useHistory(mockSetData));
          let currentData = operations[0];

          // 操作を実行
          for (let i = 1; i < operations.length; i++) {
            const newData = operations[i];
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            currentData = newData;
          }

          const actualUndoCount = Math.min(undoCount, operations.length - 1);

          // undo実行
          for (let i = 0; i < actualUndoCount; i++) {
            const prevData = operations[operations.length - 1 - i];
            act(() => {
              result.current.undo(prevData);
            });
          }

          // この時点でredoが有効であることを確認
          if (actualUndoCount > 0) {
            expect(result.current.isEnabledRedo).toBe(true);
          }

          // 新しい操作を実行
          const newOperation = "new-operation";
          const currentDataBeforeNew = operations[operations.length - 1 - actualUndoCount];
          act(() => {
            result.current.setDataAndPushHistory(newOperation, currentDataBeforeNew);
          });

          // redo履歴がクリアされたことを確認
          expect(result.current.isEnabledRedo).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("clearHistoryを実行すると、undo/redo履歴が完全にクリアされる", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 2, maxLength: 15 }),
        fc.integer({ min: 0, max: 5 }),
        (operations, undoCount) => {
          const { result } = renderHook(() => useHistory(mockSetData));
          let currentData = operations[0];

          // 操作を実行
          for (let i = 1; i < operations.length; i++) {
            const newData = operations[i];
            act(() => {
              result.current.setDataAndPushHistory(newData, currentData);
            });
            currentData = newData;
          }

          const actualUndoCount = Math.min(undoCount, operations.length - 1);

          // undo実行
          for (let i = 0; i < actualUndoCount; i++) {
            const prevData = operations[operations.length - 1 - i];
            act(() => {
              result.current.undo(prevData);
            });
          }

          // clearHistory実行
          act(() => {
            result.current.clearHistory();
          });

          // undo/redoが無効になっていることを確認
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

        // setDataが呼ばれていないことを確認
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

        // setDataが呼ばれていないことを確認
        expect(mockSetData.mock.calls.length).toBe(initialCallCount);
        expect(result.current.isEnabledUndo).toBe(false);
        expect(result.current.isEnabledRedo).toBe(false);
      }),
      { numRuns: 30 }
    );
  });
});
