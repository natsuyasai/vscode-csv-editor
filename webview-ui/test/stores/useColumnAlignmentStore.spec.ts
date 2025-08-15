import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useColumnAlignmentStore } from "@/stores/useColumnAlignmentStore";
import { CellAlignment } from "@/types";

describe("useColumnAlignmentStore", () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useColumnAlignmentStore.getState().resetColumnAlignments();
  });

  describe("初期状態", () => {
    it("空のcolumnAlignmentsで初期化される", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      expect(result.current.columnAlignments).toEqual({});
    });

    it("getColumnAlignmentは未設定の列に対してデフォルト値を返す", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const alignment = result.current.getColumnAlignment("col0");
      expect(alignment).toEqual({
        vertical: "center",
        horizontal: "left",
      });
    });
  });

  describe("setColumnAlignment", () => {
    it("列の配置設定を正しく設定できる", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const newAlignment: CellAlignment = {
        vertical: "top",
        horizontal: "center",
      };

      act(() => {
        result.current.setColumnAlignment("col0", newAlignment);
      });

      expect(result.current.columnAlignments["col0"]).toEqual(newAlignment);
      expect(result.current.getColumnAlignment("col0")).toEqual(newAlignment);
    });

    it("複数の列に異なる配置設定を設定できる", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const alignment1: CellAlignment = { vertical: "top", horizontal: "left" };
      const alignment2: CellAlignment = { vertical: "bottom", horizontal: "right" };

      act(() => {
        result.current.setColumnAlignment("col0", alignment1);
        result.current.setColumnAlignment("col1", alignment2);
      });

      expect(result.current.getColumnAlignment("col0")).toEqual(alignment1);
      expect(result.current.getColumnAlignment("col1")).toEqual(alignment2);
    });

    it("既存の配置設定を上書きできる", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const initialAlignment: CellAlignment = { vertical: "top", horizontal: "left" };
      const updatedAlignment: CellAlignment = { vertical: "bottom", horizontal: "right" };

      act(() => {
        result.current.setColumnAlignment("col0", initialAlignment);
      });

      expect(result.current.getColumnAlignment("col0")).toEqual(initialAlignment);

      act(() => {
        result.current.setColumnAlignment("col0", updatedAlignment);
      });

      expect(result.current.getColumnAlignment("col0")).toEqual(updatedAlignment);
    });
  });

  describe("getColumnAlignment", () => {
    it("設定済みの列の配置を正しく取得できる", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const alignment: CellAlignment = { vertical: "bottom", horizontal: "center" };

      act(() => {
        result.current.setColumnAlignment("col0", alignment);
      });

      expect(result.current.getColumnAlignment("col0")).toEqual(alignment);
    });

    it("未設定の列に対してデフォルト値を返す", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      
      expect(result.current.getColumnAlignment("nonexistent")).toEqual({
        vertical: "center",
        horizontal: "left",
      });
    });
  });

  describe("resetColumnAlignments", () => {
    it("すべての配置設定をリセットできる", () => {
      const { result } = renderHook(() => useColumnAlignmentStore());
      const alignment: CellAlignment = { vertical: "top", horizontal: "right" };

      // まず設定を追加
      act(() => {
        result.current.setColumnAlignment("col0", alignment);
        result.current.setColumnAlignment("col1", alignment);
      });

      expect(Object.keys(result.current.columnAlignments)).toHaveLength(2);

      // リセット
      act(() => {
        result.current.resetColumnAlignments();
      });

      expect(result.current.columnAlignments).toEqual({});
      expect(result.current.getColumnAlignment("col0")).toEqual({
        vertical: "center",
        horizontal: "left",
      });
    });
  });

  describe("すべての配置パターン", () => {
    const verticalOptions = ["top", "center", "bottom"] as const;
    const horizontalOptions = ["left", "center", "right"] as const;

    verticalOptions.forEach((vertical) => {
      horizontalOptions.forEach((horizontal) => {
        it(`${vertical}-${horizontal}の配置設定が正しく動作する`, () => {
          const { result } = renderHook(() => useColumnAlignmentStore());
          const alignment: CellAlignment = { vertical, horizontal };

          act(() => {
            result.current.setColumnAlignment("col0", alignment);
          });

          expect(result.current.getColumnAlignment("col0")).toEqual(alignment);
        });
      });
    });
  });

  describe("状態の永続性", () => {
    it("異なるフックインスタンス間で状態が共有される", () => {
      const { result: result1 } = renderHook(() => useColumnAlignmentStore());
      const { result: result2 } = renderHook(() => useColumnAlignmentStore());
      
      const alignment: CellAlignment = { vertical: "bottom", horizontal: "right" };

      act(() => {
        result1.current.setColumnAlignment("col0", alignment);
      });

      // 別のフックインスタンスからも同じ値が取得できる
      expect(result2.current.getColumnAlignment("col0")).toEqual(alignment);
    });
  });
});