import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAutoFill } from "@/hooks/useAutoFill";

/**
 * ソート・フィルターで表示順がデータ順と異なる場合のオートフィル (issue #79)
 */
describe("useAutoFill (表示位置とデータ位置が異なる場合)", () => {
  const data = [
    { col0: "0", col1: "x0" },
    { col0: "1", col1: "x1" },
    { col0: "2", col1: "x2" },
    { col0: "3", col1: "x3" },
  ];
  // 表示順: データ位置 [3, 1, 2]
  const viewToData = [3, 1, 2];
  const toDataIndex = (view: number) => viewToData[view];

  const fill = (
    updateCells: ReturnType<typeof vi.fn>,
    from: [number, number],
    to: [number, number]
  ) => {
    const { result } = renderHook(() => useAutoFill(data, updateCells, toDataIndex));
    act(() => result.current.handleFillStart(...from));
    act(() => result.current.handleFillMove(...to));
    act(() => result.current.handleFillEnd());
  };

  it("開始セルの値は表示位置からデータ位置へ変換して取得し、書き込み先もデータ位置になる", () => {
    const updateCells = vi.fn();
    // 表示0行目(データ3行目, 値"3")から表示2行目まで縦フィル → 連番 4, 5
    fill(updateCells, [0, 0], [2, 0]);
    expect(updateCells).toHaveBeenCalledWith([
      { rowIdx: 1, colIdx: 0, value: "4" },
      { rowIdx: 2, colIdx: 0, value: "5" },
    ]);
  });

  it("文字列は表示位置の範囲に対応するデータ位置へコピーされる", () => {
    const updateCells = vi.fn();
    fill(updateCells, [1, 1], [2, 1]);
    expect(updateCells).toHaveBeenCalledWith([{ rowIdx: 2, colIdx: 1, value: "x1" }]);
  });

  it("表示位置の範囲判定(isInFillRange)は表示位置で行う", () => {
    const { result } = renderHook(() => useAutoFill(data, vi.fn(), toDataIndex));
    act(() => result.current.handleFillStart(0, 0));
    act(() => result.current.handleFillMove(1, 0));
    expect(result.current.isInFillRange(1, 0)).toBe(true);
    expect(result.current.isInFillRange(2, 0)).toBe(false);
  });
});
