import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { getRowId } from "@/utilities/rowIdentity";

/**
 * 行IDは行の追加・読み込み時にだけ振り、編集・ソート・Undoでは変わらない (issue #90)
 */
describe("useUpdateCsvArray 行ID", () => {
  const createCsv = () => [
    ["h0", "h1"],
    ["a", "b"],
    ["c", "d"],
    ["e", "f"],
  ];

  const setup = (isIgnoreHeaderRow = false) => {
    const initial = createCsv();
    let current = initial;
    const setCSVArray = vi.fn((next: string[][]) => {
      current = next;
    });
    const hook = renderHook(() => useUpdateCsvArray(current, setCSVArray, isIgnoreHeaderRow));
    return {
      initial,
      get current() {
        return current;
      },
      hook,
    };
  };
  const ids = (csv: string[][]) => csv.map((row) => getRowId(row));

  it("セル編集しても全行の行IDが変わらない", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.updateCell(1, 0, "X"));
    expect(ctx.current[2][0]).toBe("X");
    expect(ids(ctx.current)).toEqual(before);
  });

  it("複数セル編集しても全行の行IDが変わらない", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() =>
      ctx.hook.result.current.updateCells([
        { rowIdx: 0, colIdx: 0, value: "X" },
        { rowIdx: 2, colIdx: 1, value: "Y" },
      ])
    );
    expect(ids(ctx.current)).toEqual(before);
  });

  it("行を追加したときだけ新しい行IDが振られ、既存行の行IDは変わらない", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.insertRow(0));
    const after = ids(ctx.current);
    expect(after).toHaveLength(before.length + 1);
    expect([after[0], ...after.slice(2)]).toEqual(before);
    expect(before).not.toContain(after[1]);
  });

  it("行を削除しても残りの行の行IDは変わらない", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.deleteRow(0));
    expect(ids(ctx.current)).toEqual(before.filter((_, i) => i !== 1));
  });

  it("行を移動しても行IDは行に付いて移動する", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.moveRows(0, 2));
    expect(ids(ctx.current)).toEqual([before[0], before[2], before[3], before[1]]);
  });

  it("列の追加・削除・移動でも行IDは変わらない", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.insertCol(1));
    expect(ids(ctx.current)).toEqual(before);
    act(() => ctx.hook.result.current.moveColumns(0, 2));
    expect(ids(ctx.current)).toEqual(before);
    act(() => ctx.hook.result.current.deleteCol(0));
    expect(ids(ctx.current)).toEqual(before);
    act(() => ctx.hook.result.current.updateCol(0, "H"));
    expect(ids(ctx.current)).toEqual(before);
  });

  it("Undo/Redoで元の行IDに戻る", () => {
    const ctx = setup();
    const before = ids(ctx.initial);
    act(() => ctx.hook.result.current.updateCell(0, 0, "X"));
    act(() => ctx.hook.result.current.undo());
    expect(ids(ctx.current)).toEqual(before);
    act(() => ctx.hook.result.current.redo());
    expect(ids(ctx.current)).toEqual(before);
  });
});
