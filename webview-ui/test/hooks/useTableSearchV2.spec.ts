import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTableSearchV2 } from "@/hooks/useTableSearchV2";
import { ROW_IDX_KEY, ROW_ID_KEY } from "@/types";

describe("useTableSearchV2", () => {
  let mockData: Array<Record<string, unknown>>;
  let mockTableContainerRef: React.RefObject<HTMLDivElement>;
  let mockScrollTo: ReturnType<typeof vi.fn>;
  const rowHeight = 40;

  beforeEach(() => {
    mockData = [
      { [ROW_IDX_KEY]: "1", [ROW_ID_KEY]: "id1", col0: "Apple", col1: "Red", col2: "Fruit" },
      { [ROW_IDX_KEY]: "2", [ROW_ID_KEY]: "id2", col0: "Banana", col1: "Yellow", col2: "Fruit" },
      { [ROW_IDX_KEY]: "3", [ROW_ID_KEY]: "id3", col0: "Carrot", col1: "Orange", col2: "Vegetable" },
    ];

    mockScrollTo = vi.fn();
    mockTableContainerRef = {
      current: {
        scrollTo: mockScrollTo,
      } as unknown as HTMLDivElement,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態では検索が閉じられている", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    expect(result.current.searchOpen).toBe(false);
    expect(result.current.matchedItemPositions).toEqual([]);
    expect(result.current.searchedSelectedItemIdx).toBe(0);
  });

  it("openSearchで検索を開く", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    act(() => {
      result.current.openSearch();
    });

    expect(result.current.searchOpen).toBe(true);
  });

  it("handleSearchで検索結果を取得", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    act(() => {
      result.current.handleSearch("fruit");
    });

    // "Fruit" が2回マッチ（行0と行1）
    expect(result.current.matchedItemPositions.length).toBe(2);
    expect(result.current.matchedItemPositions[0]).toEqual({ rowIdx: 0, colIdx: 2 });
    expect(result.current.matchedItemPositions[1]).toEqual({ rowIdx: 1, colIdx: 2 });
    expect(result.current.searchedSelectedItemIdx).toBe(0);

    // 最初のマッチ位置にスクロール
    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("handleSearchで大文字小文字を区別しない", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    act(() => {
      result.current.handleSearch("APPLE");
    });

    expect(result.current.matchedItemPositions.length).toBe(1);
    expect(result.current.matchedItemPositions[0]).toEqual({ rowIdx: 0, colIdx: 0 });
  });

  it("handleSearchで空文字列を検索しても何もしない", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    act(() => {
      result.current.handleSearch("");
    });

    expect(result.current.matchedItemPositions).toEqual([]);
  });

  it("handleSearchでマッチがない場合は何もしない", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    act(() => {
      result.current.handleSearch("NotFound");
    });

    expect(result.current.matchedItemPositions).toEqual([]);
  });

  it("handleNextSearchで次の検索結果に移動", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // 検索実行
    act(() => {
      result.current.handleSearch("fruit");
    });

    // 次の検索結果に移動
    act(() => {
      result.current.handleNextSearch();
    });

    expect(result.current.searchedSelectedItemIdx).toBe(1);
    expect(mockScrollTo).toHaveBeenLastCalledWith({
      top: 40, // rowIdx: 1 * rowHeight: 40
      behavior: "smooth",
    });
  });

  it("handleNextSearchで最後の検索結果から最初に戻る", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // 検索実行
    act(() => {
      result.current.handleSearch("fruit");
    });

    // 2回目の検索結果に移動
    act(() => {
      result.current.handleNextSearch();
    });

    // さらに次へ（最初に戻る）
    act(() => {
      result.current.handleNextSearch();
    });

    expect(result.current.searchedSelectedItemIdx).toBe(0);
    expect(mockScrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("handlePreviousSearchで前の検索結果に移動", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // 検索実行
    act(() => {
      result.current.handleSearch("fruit");
    });

    // 次の検索結果に移動
    act(() => {
      result.current.handleNextSearch();
    });

    // 前の検索結果に戻る
    act(() => {
      result.current.handlePreviousSearch();
    });

    expect(result.current.searchedSelectedItemIdx).toBe(0);
    expect(mockScrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("handlePreviousSearchで最初の検索結果から最後に戻る", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // 検索実行
    act(() => {
      result.current.handleSearch("fruit");
    });

    // 前へ（最後に戻る）
    act(() => {
      result.current.handlePreviousSearch();
    });

    expect(result.current.searchedSelectedItemIdx).toBe(1);
    expect(mockScrollTo).toHaveBeenLastCalledWith({
      top: 40,
      behavior: "smooth",
    });
  });

  it("handleCloseSearchで検索状態をリセット", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // 検索を開いて実行
    act(() => {
      result.current.openSearch();
    });
    act(() => {
      result.current.handleSearch("fruit");
    });

    // 検索を閉じる
    act(() => {
      result.current.handleCloseSearch();
    });

    expect(result.current.searchOpen).toBe(false);
    expect(result.current.matchedItemPositions).toEqual([]);
    expect(result.current.searchedSelectedItemIdx).toBe(0);
  });

  it("ROW_IDX_KEYとROW_ID_KEYは検索対象外", () => {
    const { result } = renderHook(() =>
      useTableSearchV2(mockData, rowHeight, mockTableContainerRef)
    );

    // ROW_IDX_KEYの値を検索
    act(() => {
      result.current.handleSearch("1");
    });

    // "Yellow" にマッチするが、ROW_IDX_KEYにはマッチしない
    expect(result.current.matchedItemPositions.length).toBe(0);

    // ROW_ID_KEYの値を検索
    act(() => {
      result.current.handleSearch("id1");
    });

    expect(result.current.matchedItemPositions.length).toBe(0);
  });
});
