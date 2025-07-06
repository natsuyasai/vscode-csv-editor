import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHistory } from "@/hooks/useHistory";

describe("useHistory", () => {
  let mockSetData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetData = vi.fn();
    vi.clearAllMocks();
  });

  it("初期状態では履歴が空でundo/redoが無効であること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    expect(result.current.isEnabledUndo).toBe(false);
    expect(result.current.isEnabledRedo).toBe(false);
  });

  it("データを変更した後にundoが有効になること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const currentData = [["A", "B"], ["1", "2"]];
    const newData = [["A", "B"], ["1", "2"], ["3", "4"]];

    act(() => {
      result.current.setDataAndPushHistory(newData, currentData);
    });

    expect(result.current.isEnabledUndo).toBe(true);
    expect(result.current.isEnabledRedo).toBe(false);
    expect(mockSetData).toHaveBeenCalledWith(newData);
  });

  it("undoが正しく動作すること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const initialData = [["A", "B"], ["1", "2"]];
    const newData = [["A", "B"], ["1", "2"], ["3", "4"]];

    // データを変更
    act(() => {
      result.current.setDataAndPushHistory(newData, initialData);
    });

    // undo実行
    act(() => {
      result.current.undo(newData);
    });

    expect(mockSetData).toHaveBeenCalledWith(initialData);
    expect(result.current.isEnabledUndo).toBe(false);
    expect(result.current.isEnabledRedo).toBe(true);
  });

  it("redoが正しく動作すること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const initialData = [["A", "B"], ["1", "2"]];
    const newData = [["A", "B"], ["1", "2"], ["3", "4"]];

    // データ変更 → undo → redo
    act(() => {
      result.current.setDataAndPushHistory(newData, initialData);
    });

    act(() => {
      result.current.undo(newData);
    });

    vi.clearAllMocks();

    act(() => {
      result.current.redo(initialData);
    });

    expect(mockSetData).toHaveBeenCalledWith(newData);
    expect(result.current.isEnabledUndo).toBe(true);
    expect(result.current.isEnabledRedo).toBe(false);
  });

  it("複数回のundo/redoが正しく動作すること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const initialData = [["A", "B"], ["1", "2"]];
    const data1 = [["A", "B"], ["1", "2"], ["3", "4"]];
    const data2 = [["A", "B"], ["1", "2"], ["3", "4"], ["5", "6"]];

    // 2回データ変更
    act(() => {
      result.current.setDataAndPushHistory(data1, initialData);
    });

    act(() => {
      result.current.setDataAndPushHistory(data2, data1);
    });

    expect(result.current.isEnabledUndo).toBe(true);

    // 1回目のundo
    act(() => {
      result.current.undo(data2);
    });

    expect(mockSetData).toHaveBeenCalledWith(data1);

    // 2回目のundo
    vi.clearAllMocks();
    act(() => {
      result.current.undo(data1);
    });

    expect(mockSetData).toHaveBeenCalledWith(initialData);
    expect(result.current.isEnabledUndo).toBe(false);
    expect(result.current.isEnabledRedo).toBe(true);
  });

  it("新しい変更が行われた後はredo履歴がクリアされること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const initialData = [["A", "B"], ["1", "2"]];
    const data1 = [["A", "B"], ["1", "2"], ["3", "4"]];
    const data2 = [["A", "B"], ["1", "2"], ["5", "6"]];

    // データ変更 → undo → 新しいデータ変更
    act(() => {
      result.current.setDataAndPushHistory(data1, initialData);
    });

    act(() => {
      result.current.undo(data1);
    });

    expect(result.current.isEnabledRedo).toBe(true);

    act(() => {
      result.current.setDataAndPushHistory(data2, initialData);
    });

    expect(result.current.isEnabledRedo).toBe(false);
  });

  it("履歴の上限が正しく動作すること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData, { maxHistorySize: 2 })
    );

    const initialData = [["initial"]];
    const data1 = [["1"]];
    const data2 = [["2"]];
    const data3 = [["3"]];

    // 上限を超える履歴を追加
    act(() => {
      result.current.setDataAndPushHistory(data1, initialData);
    });

    act(() => {
      result.current.setDataAndPushHistory(data2, data1);
    });

    act(() => {
      result.current.setDataAndPushHistory(data3, data2);
    });

    // 2回undo（上限2なので最初のinitialDataは削除されている）
    act(() => {
      result.current.undo(data3);
    });

    expect(mockSetData).toHaveBeenCalledWith(data2);

    vi.clearAllMocks();
    act(() => {
      result.current.undo(data2);
    });

    expect(mockSetData).toHaveBeenCalledWith(data1);

    // これ以上undoできない
    expect(result.current.isEnabledUndo).toBe(false);
  });

  it("clearHistoryが正しく動作すること", () => {
    const { result } = renderHook(() => 
      useHistory(mockSetData)
    );

    const initialData = [["A", "B"], ["1", "2"]];
    const newData = [["A", "B"], ["1", "2"], ["3", "4"]];

    act(() => {
      result.current.setDataAndPushHistory(newData, initialData);
    });

    act(() => {
      result.current.undo(newData);
    });

    expect(result.current.isEnabledUndo).toBe(false);
    expect(result.current.isEnabledRedo).toBe(true);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.isEnabledUndo).toBe(false);
    expect(result.current.isEnabledRedo).toBe(false);
  });
});