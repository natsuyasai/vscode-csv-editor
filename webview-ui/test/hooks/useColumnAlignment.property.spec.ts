import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { useColumnAlignment } from "@/hooks/useColumnAlignment";
import { CellAlignment } from "@/types";

describe("useColumnAlignment - Property-Based Tests", () => {
  // CellAlignmentのジェネレータ
  const alignmentArb = fc.record({
    vertical: fc.constantFrom("top", "center", "bottom"),
    horizontal: fc.constantFrom("left", "center", "right"),
  }) as fc.Arbitrary<CellAlignment>;

  it("列が選択されていない場合、配置変更が適用されない", () => {
    fc.assert(
      fc.property(alignmentArb, (alignment) => {
        const { result } = renderHook(() => useColumnAlignment(null));

        const initialAlignments = { ...result.current.columnAlignments };

        act(() => {
          result.current.handleAlignmentChange(alignment);
        });

        // 列が選択されていないので、配置は変更されない
        expect(result.current.columnAlignments).toEqual(initialAlignments);
      }),
      { numRuns: 30 }
    );
  });

  it("列が選択されている場合、配置変更が適用される", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), alignmentArb, (columnIndex, alignment) => {
        const { result } = renderHook(() => useColumnAlignment(columnIndex));

        act(() => {
          result.current.handleAlignmentChange(alignment);
        });

        // 配置が設定されている
        expect(result.current.columnAlignments[columnIndex]).toEqual(alignment);
      }),
      { numRuns: 50 }
    );
  });

  it("getCurrentAlignmentは、選択列の配置を返す", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), alignmentArb, (columnIndex, alignment) => {
        const { result } = renderHook(() => useColumnAlignment(columnIndex));

        // 初期状態ではデフォルト配置
        expect(result.current.getCurrentAlignment()).toEqual({
          vertical: "center",
          horizontal: "left",
        });

        act(() => {
          result.current.handleAlignmentChange(alignment);
        });

        // 設定後は指定した配置
        expect(result.current.getCurrentAlignment()).toEqual(alignment);
      }),
      { numRuns: 50 }
    );
  });

  it("getColumnAlignmentは、指定列の配置を返す", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        alignmentArb,
        (columnIndex, queryIndex, alignment) => {
          const { result } = renderHook(() => useColumnAlignment(columnIndex));

          act(() => {
            result.current.handleAlignmentChange(alignment);
          });

          if (columnIndex === queryIndex) {
            // 同じ列の場合、設定した配置が返される
            expect(result.current.getColumnAlignment(queryIndex)).toEqual(alignment);
          } else {
            // 異なる列の場合、undefinedが返される
            expect(result.current.getColumnAlignment(queryIndex)).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("複数の列に異なる配置を設定できる", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            columnIndex: fc.integer({ min: 0, max: 10 }),
            alignment: alignmentArb,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (alignments) => {
          // 最初の列を選択して開始
          const { result, rerender } = renderHook(
            ({ selectedColumn }) => useColumnAlignment(selectedColumn),
            {
              initialProps: { selectedColumn: alignments[0].columnIndex },
            }
          );

          // 列ごとに最後の配置を記録（同じ列に複数回設定された場合、最後の値が優先される）
          const finalAlignments = new Map<number, CellAlignment>();
          alignments.forEach(({ columnIndex, alignment }) => {
            finalAlignments.set(columnIndex, alignment);
          });

          alignments.forEach(({ columnIndex, alignment }) => {
            // 列を選択
            rerender({ selectedColumn: columnIndex });

            // 配置を設定
            act(() => {
              result.current.handleAlignmentChange(alignment);
            });
          });

          // 最後に設定された配置が正しく設定されている
          finalAlignments.forEach((alignment, columnIndex) => {
            expect(result.current.getColumnAlignment(columnIndex)).toEqual(alignment);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it("同じ列に対して配置を複数回変更すると、最後の設定が適用される", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.array(alignmentArb, { minLength: 2, maxLength: 5 }),
        (columnIndex, alignments) => {
          const { result } = renderHook(() => useColumnAlignment(columnIndex));

          alignments.forEach((alignment) => {
            act(() => {
              result.current.handleAlignmentChange(alignment);
            });
          });

          // 最後の配置が適用されている
          const lastAlignment = alignments[alignments.length - 1];
          expect(result.current.getCurrentAlignment()).toEqual(lastAlignment);
          expect(result.current.getColumnAlignment(columnIndex)).toEqual(lastAlignment);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("選択列がnullの場合、getCurrentAlignmentはデフォルト配置を返す", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { result } = renderHook(() => useColumnAlignment(null));

        // 選択列がnullの場合、デフォルト配置が返される
        expect(result.current.getCurrentAlignment()).toEqual({
          vertical: "center",
          horizontal: "left",
        });
      }),
      { numRuns: 20 }
    );
  });

  it("配置が設定されていない列のgetColumnAlignmentはundefinedを返す", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (selectedCol, queryCol) => {
          const { result } = renderHook(() => useColumnAlignment(selectedCol));

          // 配置を設定していない列はundefined
          expect(result.current.getColumnAlignment(queryCol)).toBeUndefined();
        }
      ),
      { numRuns: 30 }
    );
  });

  it("列インデックスが変更されても、以前の配置設定は保持される", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 0, max: 10 })
          .chain((col1) =>
            fc
              .integer({ min: 0, max: 10 })
              .filter((col2) => col1 !== col2)
              .chain((col2) =>
                alignmentArb.chain((alignment1) => alignmentArb.map((alignment2) => ({ col1, col2, alignment1, alignment2 })))
              )
          ),
        ({ col1, col2, alignment1, alignment2 }) => {
          const { result, rerender } = renderHook(
            ({ selectedColumn }) => useColumnAlignment(selectedColumn),
            {
              initialProps: { selectedColumn: col1 },
            }
          );

          // col1に配置を設定
          act(() => {
            result.current.handleAlignmentChange(alignment1);
          });

          // col2に切り替え
          rerender({ selectedColumn: col2 });

          // col2に配置を設定
          act(() => {
            result.current.handleAlignmentChange(alignment2);
          });

          // 両方の配置が保持されている
          expect(result.current.getColumnAlignment(col1)).toEqual(alignment1);
          expect(result.current.getColumnAlignment(col2)).toEqual(alignment2);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("垂直・水平配置の全組み合わせが正しく設定できる", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 20 }), alignmentArb, (columnIndex, alignment) => {
        const { result } = renderHook(() => useColumnAlignment(columnIndex));

        act(() => {
          result.current.handleAlignmentChange(alignment);
        });

        const setAlignment = result.current.getColumnAlignment(columnIndex);
        expect(setAlignment).toBeDefined();
        expect(setAlignment?.vertical).toBe(alignment.vertical);
        expect(setAlignment?.horizontal).toBe(alignment.horizontal);
      }),
      { numRuns: 50 }
    );
  });
});
