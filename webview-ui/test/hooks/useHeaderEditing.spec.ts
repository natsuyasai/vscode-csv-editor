import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useHeaderEditing } from "@/hooks/useHeaderEditing";

describe("useHeaderEditing", () => {
  it("初期状態では編集していない", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    expect(result.current.editingHeaderIndex).toBeNull();
    expect(result.current.editingHeaderValue).toBe("");
    expect(result.current.isEditing(0)).toBe(false);
  });

  it("startEditingで編集を開始", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.startEditing(1, "Header 1");
    });

    expect(result.current.editingHeaderIndex).toBe(1);
    expect(result.current.editingHeaderValue).toBe("Header 1");
    expect(result.current.isEditing(1)).toBe(true);
    expect(result.current.isEditing(0)).toBe(false);
  });

  it("changeEditingValueで編集値を変更", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.startEditing(1, "Header 1");
    });

    act(() => {
      result.current.changeEditingValue("Updated Header");
    });

    expect(result.current.editingHeaderValue).toBe("Updated Header");
  });

  it("finishEditingで編集を終了し、値を更新", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.startEditing(1, "Header 1");
    });

    act(() => {
      result.current.changeEditingValue("Updated Header");
    });

    act(() => {
      result.current.finishEditing();
    });

    expect(mockUpdateCol).toHaveBeenCalledWith(1, "Updated Header");
    expect(result.current.editingHeaderIndex).toBeNull();
    expect(result.current.editingHeaderValue).toBe("");
    expect(result.current.isEditing(1)).toBe(false);
  });

  it("cancelEditingで編集をキャンセル", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.startEditing(1, "Header 1");
    });

    act(() => {
      result.current.changeEditingValue("Updated Header");
    });

    act(() => {
      result.current.cancelEditing();
    });

    expect(mockUpdateCol).not.toHaveBeenCalled();
    expect(result.current.editingHeaderIndex).toBeNull();
    expect(result.current.editingHeaderValue).toBe("");
  });

  it("編集中でない場合にfinishEditingを呼んでも何もしない", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.finishEditing();
    });

    expect(mockUpdateCol).not.toHaveBeenCalled();
  });

  it("isEditingで正しい判定を返す", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    expect(result.current.isEditing(null)).toBe(false);

    act(() => {
      result.current.startEditing(2, "Header 2");
    });

    expect(result.current.isEditing(2)).toBe(true);
    expect(result.current.isEditing(1)).toBe(false);
    expect(result.current.isEditing(null)).toBe(false);
  });

  it("複数回の編集を正しく処理", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    // 1回目の編集
    act(() => {
      result.current.startEditing(1, "Header 1");
    });
    act(() => {
      result.current.changeEditingValue("Updated 1");
    });
    act(() => {
      result.current.finishEditing();
    });

    // 2回目の編集
    act(() => {
      result.current.startEditing(2, "Header 2");
    });
    act(() => {
      result.current.changeEditingValue("Updated 2");
    });
    act(() => {
      result.current.finishEditing();
    });

    expect(mockUpdateCol).toHaveBeenCalledTimes(2);
    expect(mockUpdateCol).toHaveBeenNthCalledWith(1, 1, "Updated 1");
    expect(mockUpdateCol).toHaveBeenNthCalledWith(2, 2, "Updated 2");
  });

  it("空文字列で編集を終了できる", () => {
    const mockUpdateCol = vi.fn();
    const { result } = renderHook(() => useHeaderEditing(mockUpdateCol));

    act(() => {
      result.current.startEditing(1, "Header 1");
    });

    act(() => {
      result.current.changeEditingValue("");
    });

    act(() => {
      result.current.finishEditing();
    });

    expect(mockUpdateCol).toHaveBeenCalledWith(1, "");
  });
});
