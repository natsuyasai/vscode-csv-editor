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

  it("改行を含むセルをコピー＆ペーストできる", async () => {
    // 改行を含むデータを作成
    const dataWithNewlines = [
      { col0: "A1\nA2", col1: "B1", col2: "C1" },
      { col0: "A3", col1: "B2\nB3", col2: "C2" },
    ];

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    const mockReadText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
        readText: mockReadText,
      },
    });

    const setData: React.Dispatch<React.SetStateAction<typeof dataWithNewlines>> = vi.fn(
      (updater: React.SetStateAction<typeof dataWithNewlines>) => {
        if (typeof updater === "function") {
          return updater(dataWithNewlines);
        }
        return updater;
      }
    ) as React.Dispatch<React.SetStateAction<typeof dataWithNewlines>>;

    const { result } = renderHook(() => useCellSelection(dataWithNewlines, setData));

    // セルを選択してコピー（0,0）から（1,1）の範囲
    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleCellMouseEnter(1, 1);
    });

    // 4つのセルが選択されているはず（2x2の範囲）
    expect(result.current.selectedCells.size).toBe(4);

    await act(async () => {
      await result.current.handleCopy();
    });

    // エスケープされた形式でコピーされる
    // 0行目: "A1\nA2"（エスケープ）, B1（通常）
    // 1行目: A3（通常）, "B2\nB3"（エスケープ）
    const expectedText = `"A1\nA2"\tB1\nA3\t"B2\nB3"`;
    expect(mockWriteText).toHaveBeenCalledWith(expectedText);

    // コピーした内容をペーストする準備
    const copiedText = mockWriteText.mock.calls[0][0] as string;
    mockReadText.mockResolvedValue(copiedText);

    // 新しいデータセットでペーストをテスト
    const emptyData = [
      { col0: "", col1: "", col2: "" },
      { col0: "", col1: "", col2: "" },
    ];
    const emptySetData: React.Dispatch<React.SetStateAction<typeof emptyData>> = vi.fn(
      (updater: React.SetStateAction<typeof emptyData>) => {
        if (typeof updater === "function") {
          return updater(emptyData);
        }
        return updater;
      }
    ) as React.Dispatch<React.SetStateAction<typeof emptyData>>;

    const { result: pasteResult } = renderHook(() => useCellSelection(emptyData, emptySetData));

    act(() => {
      pasteResult.current.handleCellMouseDown(0, 0);
    });

    await act(async () => {
      await pasteResult.current.handlePaste();
    });

    // setDataが呼ばれ、正しいデータがペーストされる
    expect(emptySetData).toHaveBeenCalled();
    const mockFn = emptySetData as unknown as ReturnType<typeof vi.fn>;
    const updateFunction = mockFn.mock.calls[0][0] as (
      old: typeof emptyData
    ) => typeof emptyData;
    const updatedData = updateFunction(emptyData);

    expect(updatedData[0].col0).toBe("A1\nA2");
    expect(updatedData[0].col1).toBe("B1");
    expect(updatedData[1].col0).toBe("A3");
    expect(updatedData[1].col1).toBe("B2\nB3");
  });

  it("タブを含むセルをコピー＆ペーストできる", async () => {
    const dataWithTabs = [{ col0: "A\tB", col1: "C\tD" }];

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    const mockReadText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
        readText: mockReadText,
      },
    });

    const setData: React.Dispatch<React.SetStateAction<typeof dataWithTabs>> = vi.fn(
      (updater: React.SetStateAction<typeof dataWithTabs>) => {
        if (typeof updater === "function") {
          return updater(dataWithTabs);
        }
        return updater;
      }
    ) as React.Dispatch<React.SetStateAction<typeof dataWithTabs>>;

    const { result } = renderHook(() => useCellSelection(dataWithTabs, setData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleCellMouseEnter(0, 1);
    });

    await act(async () => {
      await result.current.handleCopy();
    });

    // エスケープされた形式でコピーされる
    expect(mockWriteText).toHaveBeenCalledWith('"A\tB"\t"C\tD"');
  });

  it("ダブルクォートを含むセルをコピー＆ペーストできる", async () => {
    const dataWithQuotes = [{ col0: 'A"B', col1: 'C"D"E' }];

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    const setData: React.Dispatch<React.SetStateAction<typeof dataWithQuotes>> = vi.fn(
      (updater: React.SetStateAction<typeof dataWithQuotes>) => {
        if (typeof updater === "function") {
          return updater(dataWithQuotes);
        }
        return updater;
      }
    ) as React.Dispatch<React.SetStateAction<typeof dataWithQuotes>>;

    const { result } = renderHook(() => useCellSelection(dataWithQuotes, setData));

    act(() => {
      result.current.handleCellMouseDown(0, 0);
    });

    act(() => {
      result.current.handleCellMouseEnter(0, 1);
    });

    await act(async () => {
      await result.current.handleCopy();
    });

    // ダブルクォートがエスケープされた形式でコピーされる
    expect(mockWriteText).toHaveBeenCalledWith('"A""B"\t"C""D""E"');
  });
});
