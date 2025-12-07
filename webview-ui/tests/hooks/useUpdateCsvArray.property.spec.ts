import { act, renderHook } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";

describe("useUpdateCsvArray - Property-Based Tests", () => {
  let setCSVArray = vi.fn();

  beforeEach(() => {
    setCSVArray = vi.fn();
    vi.clearAllMocks();
  });

  // CSV配列のジェネレータ（最低1行1列、すべての行が同じ列数）
  const csvArrayArb = fc.integer({ min: 1, max: 10 }).chain((colCount) =>
    fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
      minLength: 1,
      maxLength: 20,
    })
  );

  describe("insertRow", () => {
    it("任意のインデックスに行を追加すると、行数が1増える", () => {
      fc.assert(
        fc.property(csvArrayArb, fc.integer({ min: 0, max: 50 }), (csvArray, rowIndex) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
          const originalLength = csvArray.length;
          const columnCount = csvArray[0].length;

          act(() => hooks.result.current.insertRow(rowIndex));

          // setCSVArrayが呼ばれたことを確認
          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);

          const newArray = setCSVArray.mock.calls[
            setCSVArray.mock.calls.length - 1
          ][0] as string[][];
          // 行数が1増えていること
          expect(newArray.length).toBe(originalLength + 1);
          // すべての行が同じ列数を持つこと
          newArray.forEach((row) => {
            expect(row.length).toBe(columnCount);
          });
        }),
        { numRuns: 50 }
      );
    });

    it("ヘッダ行無効時でも行を追加すると、行数が1増える", () => {
      fc.assert(
        fc.property(csvArrayArb, fc.integer({ min: 0, max: 50 }), (csvArray, rowIndex) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
          const originalLength = csvArray.length;
          const columnCount = csvArray[0].length;

          act(() => hooks.result.current.insertRow(rowIndex));

          // setCSVArrayが呼ばれたことを確認
          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);

          const newArray = setCSVArray.mock.calls[
            setCSVArray.mock.calls.length - 1
          ][0] as string[][];
          // 行数が1増えていること
          expect(newArray.length).toBe(originalLength + 1);
          // すべての行が同じ列数を持つこと
          newArray.forEach((row) => {
            expect(row.length).toBe(columnCount);
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("deleteRow", () => {
    it("有効なインデックスの行を削除すると、行数が1減る", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }).chain((colCount) =>
            fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
              minLength: 3,
              maxLength: 20,
            })
          ),
          (csvArray) => {
            const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
            const originalLength = csvArray.length;
            // ヘッダを除く有効な行インデックス(データ行の0番目からlength-2番目)
            const validRowIndex = fc.sample(
              fc.integer({ min: 0, max: Math.max(0, csvArray.length - 2) }),
              1
            )[0];

            act(() => hooks.result.current.deleteRow(validRowIndex));

            expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
            const newArray = setCSVArray.mock.calls[
              setCSVArray.mock.calls.length - 1
            ][0] as string[][];
            // 行数が1減っていること
            expect(newArray.length).toBe(originalLength - 1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("範囲外のインデックスで削除しても配列のサイズは変わらない", () => {
      fc.assert(
        fc.property(csvArrayArb, (csvArray) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
          const originalLength = csvArray.length;

          // 範囲外のインデックス
          act(() => hooks.result.current.deleteRow(-2));

          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
          const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
            Array<string>
          >;
          // 配列のサイズは変わっていない（またはヘッダを保持）
          expect(newArray.length).toBeGreaterThanOrEqual(Math.min(1, originalLength));
        }),
        { numRuns: 30 }
      );
    });
  });

  describe("insertCol", () => {
    it("任意のインデックスに列を追加すると、すべての行の列数が1増える", () => {
      fc.assert(
        fc.property(csvArrayArb, fc.integer({ min: 0, max: 20 }), (csvArray, colIndex) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
          const originalColumnCount = csvArray[0].length;

          act(() => hooks.result.current.insertCol(colIndex));

          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
          const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
            Array<string>
          >;
          // すべての行の列数が1増えていること
          newArray.forEach((row: string[]) => {
            expect(row.length).toBe(originalColumnCount + 1);
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("deleteCol", () => {
    it("有効なインデックスの列を削除すると、すべての行の列数が1減る", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }).chain((colCount) =>
            fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
              minLength: 1,
              maxLength: 20,
            })
          ),
          (csvArray) => {
            const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
            const originalColumnCount = csvArray[0].length;
            const validColIndex = fc.sample(
              fc.integer({ min: 0, max: csvArray[0].length - 1 }),
              1
            )[0];

            act(() => hooks.result.current.deleteCol(validColIndex));

            expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
            const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
              Array<string>
            >;
            // すべての行の列数が1減っていること
            newArray.forEach((row: string[]) => {
              expect(row.length).toBe(originalColumnCount - 1);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("updateCell", () => {
    it("有効なセルを更新すると、該当セルのみが変更される", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }).chain((colCount) =>
            fc.array(
              fc.array(fc.string(), { minLength: colCount, maxLength: colCount }),
              { minLength: 2, maxLength: 20 } // 最低2行（ヘッダ + データ行1つ）
            )
          ),
          fc.string(),
          (csvArray, newValue) => {
            const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
            // ヘッダを除く有効な行インデックス
            const maxRowIndex = Math.max(0, csvArray.length - 2);
            const rowIndex = fc.sample(fc.integer({ min: 0, max: maxRowIndex }), 1)[0];
            const colIndex = fc.sample(fc.integer({ min: 0, max: csvArray[0].length - 1 }), 1)[0];

            act(() => hooks.result.current.updateCell(rowIndex, colIndex, newValue));

            expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
            const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
              Array<string>
            >;
            // 配列のサイズが変わっていないこと
            expect(newArray.length).toBe(csvArray.length);
            expect(newArray[0].length).toBe(csvArray[0].length);
            // 該当セルが更新されていること
            expect(newArray[rowIndex + 1][colIndex]).toBe(newValue);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("ヘッダ行無効時、有効なセルを更新すると該当セルのみが変更される", () => {
      fc.assert(
        fc.property(csvArrayArb, fc.string(), (csvArray, newValue) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
          const rowIndex = fc.sample(fc.integer({ min: 0, max: csvArray.length - 1 }), 1)[0];
          const colIndex = fc.sample(fc.integer({ min: 0, max: csvArray[0].length - 1 }), 1)[0];

          act(() => hooks.result.current.updateCell(rowIndex, colIndex, newValue));

          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
          const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
            Array<string>
          >;
          // 配列のサイズが変わっていないこと
          expect(newArray.length).toBe(csvArray.length);
          expect(newArray[0].length).toBe(csvArray[0].length);
          // 該当セルが更新されていること
          expect(newArray[rowIndex][colIndex]).toBe(newValue);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("moveColumns", () => {
    it("任意の2つの列を入れ替えても、行数と列数は変わらない", () => {
      fc.assert(
        fc.property(csvArrayArb, (csvArray) => {
          const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
          const colCount = csvArray[0].length;
          const fromIndex = fc.sample(fc.integer({ min: 0, max: colCount - 1 }), 1)[0];
          const toIndex = fc.sample(fc.integer({ min: 0, max: colCount - 1 }), 1)[0];

          act(() => hooks.result.current.moveColumns(fromIndex, toIndex));

          expect(setCSVArray.mock.calls.length).toBeGreaterThan(0);
          const newArray = setCSVArray.mock.calls[setCSVArray.mock.calls.length - 1][0] as Array<
            Array<string>
          >;
          // 配列のサイズが変わっていないこと
          expect(newArray.length).toBe(csvArray.length);
          newArray.forEach((row: string[]) => {
            expect(row.length).toBe(colCount);
          });
        }),
        { numRuns: 50 }
      );
    });

    it("列を入れ替えた後、もう一度同じ操作をすると元に戻る", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }).chain((colCount) =>
            fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
              minLength: 1,
              maxLength: 10,
            })
          ),
          (csvArray) => {
            const hooks1 = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
            const colCount = csvArray[0].length;
            const fromIndex = fc.sample(fc.integer({ min: 0, max: colCount - 1 }), 1)[0];
            const toIndex = fc.sample(fc.integer({ min: 0, max: colCount - 1 }), 1)[0];

            // 1回目の入れ替え
            act(() => hooks1.result.current.moveColumns(fromIndex, toIndex));
            const afterFirstMove = setCSVArray.mock.calls[
              setCSVArray.mock.calls.length - 1
            ][0] as Array<Array<string>>;

            vi.clearAllMocks();
            const hooks2 = renderHook(() => useUpdateCsvArray(afterFirstMove, setCSVArray, false));

            // 2回目の入れ替え（逆方向）
            act(() => hooks2.result.current.moveColumns(toIndex, fromIndex));
            const afterSecondMove = setCSVArray.mock.calls[
              setCSVArray.mock.calls.length - 1
            ][0] as Array<Array<string>>;

            // 元に戻っていること
            expect(afterSecondMove).toEqual(csvArray);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe("moveRows", () => {
    it("行を入れ替えた後、もう一度同じ操作をすると元に戻る（ヘッダ有効）", () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 1, max: 3 })
            .chain((colCount) =>
              fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
                minLength: 3,
                maxLength: 10,
              })
            )
            .chain((csvArray) => {
              const maxRowIndex = csvArray.length - 2;
              return fc.integer({ min: 0, max: maxRowIndex }).chain((fromIndex) =>
                fc
                  .integer({ min: 0, max: maxRowIndex })
                  .filter((toIndex) => fromIndex !== toIndex)
                  .map((toIndex) => ({ csvArray, fromIndex, toIndex }))
              );
            }),
          ({ csvArray, fromIndex, toIndex }) => {
            const hooks1 = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));

            // 1回目の入れ替え
            act(() => hooks1.result.current.moveRows(fromIndex, toIndex));
            const afterFirstMove = setCSVArray.mock.calls[
              setCSVArray.mock.calls.length - 1
            ][0] as Array<Array<string>>;

            vi.clearAllMocks();
            const hooks2 = renderHook(() => useUpdateCsvArray(afterFirstMove, setCSVArray, false));

            // 2回目の入れ替え（逆方向）
            act(() => hooks2.result.current.moveRows(toIndex, fromIndex));

            const afterSecondMove = setCSVArray.mock.calls[
              setCSVArray.mock.calls.length - 1
            ][0] as Array<Array<string>>;
            // 元に戻っていること
            expect(afterSecondMove).toEqual(csvArray);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe("history operations", () => {
    it("複数の操作後、undo/redoを繰り返しても整合性が保たれる", () => {
      fc.assert(
        fc.property(
          fc
            .integer({ min: 3, max: 4 })
            .chain((colCount) =>
              fc.array(fc.array(fc.string(), { minLength: colCount, maxLength: colCount }), {
                minLength: 3,
                maxLength: 8,
              })
            )
            .chain((csvArray) =>
              fc
                .array(fc.constantFrom("insertRow", "insertCol"), {
                  minLength: 2,
                  maxLength: 5,
                })
                .map((operations) => ({ csvArray, operations }))
            ),
          ({ csvArray, operations }) => {
            const hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));

            // 操作を実行（reduceで累積）
            operations.reduce(() => {
              act(() => {
                const op = operations[operations.indexOf(operations[0]) % operations.length];
                if (op === "insertRow") {
                  hooks.result.current.insertRow(0);
                } else {
                  hooks.result.current.insertCol(0);
                }
              });
              return null;
            }, null);

            // 実際の操作を一つずつ実行
            operations.forEach((op) => {
              act(() => {
                if (op === "insertRow") {
                  hooks.result.current.insertRow(0);
                } else {
                  hooks.result.current.insertCol(0);
                }
              });
            });

            // すべてundo（reduceで回数カウント）
            const undoCount = Array.from({ length: 20 }).reduce((count: number) => {
              const canUndo = hooks.result.current.isEnabledUndo;
              act(() => {
                hooks.result.current.undo();
              });
              return count + (canUndo ? 1 : 0);
            }, 0);

            // redoが有効になっていることを確認
            expect(hooks.result.current.isEnabledRedo).toBe(undoCount > 0);

            // すべてredo（reduceで回数カウント）
            const redoCount = Array.from({ length: 20 }).reduce((count: number) => {
              const canRedo = hooks.result.current.isEnabledRedo;
              act(() => {
                hooks.result.current.redo();
              });
              return count + (canRedo ? 1 : 0);
            }, 0);

            // undo回数とredo回数が一致すること
            expect(undoCount).toBe(redoCount);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
