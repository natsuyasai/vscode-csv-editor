import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCellSelection } from "@/hooks/useCellSelection";

describe("useCellSelection", () => {
  let mockData: Array<Record<string, unknown>>;
  let mockSetData: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;

  beforeEach(() => {
    mockData = [
      { col0: "A1", col1: "B1", col2: "C1" },
      { col0: "A2", col1: "B2", col2: "C2" },
      { col0: "A3", col1: "B3", col2: "C3" },
    ];
    mockSetData = vi.fn(
      (updater: React.SetStateAction<Array<Record<string, unknown>>>) => {
        if (typeof updater === "function") {
          mockData = updater(mockData);
        } else {
          mockData = updater;
        }
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では選択セルが空", () => {
    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    expect(result.current.selectedCells.size).toBe(0);
  });

  it("handleCellMouseDownで単一セルを選択", () => {
    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    expect(result.current.selectedCells.size).toBe(1);
    expect(result.current.selectedCells.has("0-0")).toBe(true);
  });

  it("handleCellMouseEnterで範囲選択", () => {
    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleCellMouseEnter(1, 1);
    });

    // 2x2の範囲が選択される
    expect(result.current.selectedCells.size).toBe(4);
    expect(result.current.selectedCells.has("0-0")).toBe(true);
    expect(result.current.selectedCells.has("0-1")).toBe(true);
    expect(result.current.selectedCells.has("1-0")).toBe(true);
    expect(result.current.selectedCells.has("1-1")).toBe(true);
  });

  it("handleCellMouseUpで選択を終了", () => {
    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleCellMouseUp();
    });

    // 選択は維持されるが、isSelectingがfalseになる（内部状態）
    expect(result.current.selectedCells.size).toBe(1);
  });

  it("handleBulkEditで選択セルを一括編集（キャンセル時）", () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleBulkEdit();
    });

    // キャンセルされたのでsetDataは呼ばれない
    expect(mockSetData).not.toHaveBeenCalled();
  });

  it("handleBulkEditで選択セルを一括編集（値入力時）", () => {
    vi.spyOn(window, "prompt").mockReturnValue("NewValue");

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
      result.current.handleCellMouseEnter(1, 1);
    });

    act(() => {
      result.current.handleBulkEdit();
    });

    // setDataが呼ばれる
    expect(mockSetData).toHaveBeenCalled();

    // 選択がクリアされる
    expect(result.current.selectedCells.size).toBe(0);
  });

  it("handleCopyで選択セルをクリップボードにコピー", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    // マウスダウンで選択開始
    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    // マウスエンターで範囲選択
    act(() => {
      result.current.handleCellMouseEnter(1, 1);
    });

    await act(async () => {
      await result.current.handleCopy();
    });

    // クリップボードにTSV形式でコピーされる
    expect(mockWriteText).toHaveBeenCalledWith("A1\tB1\nA2\tB2");
  });

  it("handlePasteでクリップボードからペースト", async () => {
    const mockReadText = vi.fn().mockResolvedValue("X1\tY1\nX2\tY2");
    Object.assign(navigator, {
      clipboard: {
        readText: mockReadText,
      },
    });

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    await act(async () => {
      await result.current.handlePaste();
    });

    // setDataが呼ばれる
    expect(mockSetData).toHaveBeenCalled();

    // 選択がクリアされる
    expect(result.current.selectedCells.size).toBe(0);
  });

  it("選択セルがない場合、handleCopyは何もしない", async () => {
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mockWriteText).not.toHaveBeenCalled();
  });

  it("選択セルがない場合、handlePasteは何もしない", async () => {
    const mockReadText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        readText: mockReadText,
      },
    });

    const { result } = renderHook(() => useCellSelection(mockData, mockSetData));

    await act(async () => {
      await result.current.handlePaste();
    });

    expect(mockReadText).not.toHaveBeenCalled();
  });
});
