import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { useCellSelection } from "@/hooks/useCellSelection";

/**
 * ソート・フィルターで表示順がデータ順と異なる場合の挙動 (issue #79)
 * 選択は表示位置、読み書きはデータ位置で行う。
 */
describe("useCellSelection (表示位置とデータ位置が異なる場合)", () => {
  const data = [
    { col0: "A0", col1: "B0" },
    { col0: "A1", col1: "B1" },
    { col0: "A2", col1: "B2" },
    { col0: "A3", col1: "B3" },
  ];
  // 表示順: データ位置 [3, 1, 2] の3行（データ0行目はフィルターで非表示）
  const viewToData = [3, 1, 2];
  const toDataIndex = (view: number) => viewToData[view];
  const setData = vi.fn() as React.Dispatch<React.SetStateAction<typeof data>>;
  const writeText = vi.fn();
  const readText = vi.fn();
  let updateCells: Mock<(cells: Array<{ rowIdx: number; colIdx: number; value: string }>) => void>;

  beforeEach(() => {
    updateCells =
      vi.fn<(cells: Array<{ rowIdx: number; colIdx: number; value: string }>) => void>();
    writeText.mockReset().mockResolvedValue(undefined);
    readText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText, readText },
    });
  });

  const selectRange = (
    result: { current: ReturnType<typeof useCellSelection> },
    from: [number, number],
    to: [number, number]
  ) => {
    act(() => result.current.handleCellMouseDown(...from));
    act(() => result.current.handleCellMouseEnter(...to));
    act(() => result.current.handleCellMouseUp());
  };

  it("範囲選択の範囲計算は表示位置で行われる", () => {
    const { result } = renderHook(() => useCellSelection(data, setData, updateCells, toDataIndex));
    selectRange(result, [0, 0], [2, 1]);
    expect(result.current.selectedCells.size).toBe(6);
    expect(result.current.selectedCells.has("1-1")).toBe(true);
  });

  it("コピーは表示位置の範囲に対応するデータを表示順でコピーする", async () => {
    const { result } = renderHook(() => useCellSelection(data, setData, updateCells, toDataIndex));
    selectRange(result, [0, 0], [2, 0]);
    await act(async () => {
      await result.current.handleCopy();
    });
    expect(writeText).toHaveBeenCalledWith("A3\nA1\nA2");
  });

  it("ペーストは表示位置を起点にデータ位置へ変換して書き込む", async () => {
    readText.mockResolvedValue("x\ny");
    const { result } = renderHook(() => useCellSelection(data, setData, updateCells, toDataIndex));
    act(() => result.current.handleCellMouseDown(1, 1));
    await act(async () => {
      await result.current.handlePaste();
    });
    expect(updateCells).toHaveBeenCalledWith([
      { rowIdx: 1, colIdx: 1, value: "x" },
      { rowIdx: 2, colIdx: 1, value: "y" },
    ]);
  });

  it("ペーストが表示行数を超える分は書き込まれない", async () => {
    readText.mockResolvedValue("x\ny\nz");
    const { result } = renderHook(() => useCellSelection(data, setData, updateCells, toDataIndex));
    act(() => result.current.handleCellMouseDown(2, 0));
    await act(async () => {
      await result.current.handlePaste();
    });
    expect(updateCells).toHaveBeenCalledWith([{ rowIdx: 2, colIdx: 0, value: "x" }]);
  });

  it("一括編集は選択した表示位置のデータ位置へ書き込む", () => {
    vi.spyOn(window, "prompt").mockReturnValue("Z");
    const { result } = renderHook(() => useCellSelection(data, setData, updateCells, toDataIndex));
    selectRange(result, [0, 0], [1, 0]);
    act(() => result.current.handleBulkEdit());
    expect(updateCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { rowIdx: 3, colIdx: 0, value: "Z" },
        { rowIdx: 1, colIdx: 0, value: "Z" },
      ])
    );
    expect(updateCells.mock.calls[0][0]).toHaveLength(2);
  });
});
