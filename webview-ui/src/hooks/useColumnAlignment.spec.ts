import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useColumnAlignment } from "@/hooks/useColumnAlignment";
import type { CellAlignment } from "@/types";

describe("useColumnAlignment", () => {
  it("初期状態では列の配置が空", () => {
    const { result } = renderHook(() => useColumnAlignment(null));

    expect(result.current.columnAlignments).toEqual({});
  });

  it("getCurrentAlignmentでデフォルト配置を返す（列未選択）", () => {
    const { result } = renderHook(() => useColumnAlignment(null));

    const alignment = result.current.getCurrentAlignment();
    expect(alignment).toEqual({ vertical: "center", horizontal: "left" });
  });

  it("getCurrentAlignmentでデフォルト配置を返す（配置未設定）", () => {
    const { result } = renderHook(() => useColumnAlignment(0));

    const alignment = result.current.getCurrentAlignment();
    expect(alignment).toEqual({ vertical: "center", horizontal: "left" });
  });

  it("handleAlignmentChangeで列の配置を変更", () => {
    const { result } = renderHook(({ columnIndex }) => useColumnAlignment(columnIndex), {
      initialProps: { columnIndex: 0 },
    });

    const newAlignment: CellAlignment = { vertical: "top", horizontal: "center" };

    act(() => {
      result.current.handleAlignmentChange(newAlignment);
    });

    expect(result.current.columnAlignments[0]).toEqual(newAlignment);
    expect(result.current.getCurrentAlignment()).toEqual(newAlignment);
  });

  it("handleAlignmentChangeで列未選択時は何もしない", () => {
    const { result } = renderHook(() => useColumnAlignment(null));

    const newAlignment: CellAlignment = { vertical: "top", horizontal: "center" };

    act(() => {
      result.current.handleAlignmentChange(newAlignment);
    });

    expect(result.current.columnAlignments).toEqual({});
  });

  it("複数の列に異なる配置を設定", () => {
    const { result, rerender } = renderHook(({ columnIndex }) => useColumnAlignment(columnIndex), {
      initialProps: { columnIndex: 0 },
    });

    // 列0に配置を設定
    const alignment0: CellAlignment = { vertical: "top", horizontal: "left" };
    act(() => {
      result.current.handleAlignmentChange(alignment0);
    });

    // 列1に配置を設定
    rerender({ columnIndex: 1 });
    const alignment1: CellAlignment = { vertical: "bottom", horizontal: "right" };
    act(() => {
      result.current.handleAlignmentChange(alignment1);
    });

    // 両方の配置が保持されていることを確認
    expect(result.current.columnAlignments[0]).toEqual(alignment0);
    expect(result.current.columnAlignments[1]).toEqual(alignment1);
  });

  it("getColumnAlignmentで指定列の配置を取得", () => {
    const { result } = renderHook(({ columnIndex }) => useColumnAlignment(columnIndex), {
      initialProps: { columnIndex: 0 },
    });

    const alignment: CellAlignment = { vertical: "top", horizontal: "center" };

    act(() => {
      result.current.handleAlignmentChange(alignment);
    });

    expect(result.current.getColumnAlignment(0)).toEqual(alignment);
    expect(result.current.getColumnAlignment(1)).toBeUndefined();
  });

  it("選択列を変更してもgetCurrentAlignmentは正しい配置を返す", () => {
    const { result, rerender } = renderHook(({ columnIndex }) => useColumnAlignment(columnIndex), {
      initialProps: { columnIndex: 0 },
    });

    const alignment0: CellAlignment = { vertical: "top", horizontal: "left" };
    act(() => {
      result.current.handleAlignmentChange(alignment0);
    });

    // 列1に切り替え
    rerender({ columnIndex: 1 });
    const alignment1: CellAlignment = { vertical: "bottom", horizontal: "right" };
    act(() => {
      result.current.handleAlignmentChange(alignment1);
    });

    // 列0に戻る
    rerender({ columnIndex: 0 });
    expect(result.current.getCurrentAlignment()).toEqual(alignment0);

    // 列1に戻る
    rerender({ columnIndex: 1 });
    expect(result.current.getCurrentAlignment()).toEqual(alignment1);
  });

  it("配置の更新が既存の配置を上書き", () => {
    const { result } = renderHook(({ columnIndex }) => useColumnAlignment(columnIndex), {
      initialProps: { columnIndex: 0 },
    });

    const alignment1: CellAlignment = { vertical: "top", horizontal: "left" };
    act(() => {
      result.current.handleAlignmentChange(alignment1);
    });

    const alignment2: CellAlignment = { vertical: "bottom", horizontal: "right" };
    act(() => {
      result.current.handleAlignmentChange(alignment2);
    });

    expect(result.current.getCurrentAlignment()).toEqual(alignment2);
    expect(result.current.columnAlignments[0]).toEqual(alignment2);
  });
});
