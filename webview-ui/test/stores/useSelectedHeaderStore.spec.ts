import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSelectedHeaderStore } from "@/stores/useSelectedHeaderStore";

describe("useSelectedHeaderStore", () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useSelectedHeaderStore.getState().setSelectedColumnKey(null);
  });

  describe("初期状態", () => {
    it("nullで初期化される", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      expect(result.current.selectedColumnKey).toBeNull();
    });
  });

  describe("setSelectedColumnKey", () => {
    it("列キーを正しく設定できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });

      expect(result.current.selectedColumnKey).toBe("col0");
    });

    it("異なる列キーに変更できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      // 最初の列を選択
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });
      expect(result.current.selectedColumnKey).toBe("col0");

      // 別の列に変更
      act(() => {
        result.current.setSelectedColumnKey("col1");
      });
      expect(result.current.selectedColumnKey).toBe("col1");
    });

    it("nullに戻すことができる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      // まず列を選択
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });
      expect(result.current.selectedColumnKey).toBe("col0");

      // nullに戻す
      act(() => {
        result.current.setSelectedColumnKey(null);
      });
      expect(result.current.selectedColumnKey).toBeNull();
    });

    it("同じ列キーを再設定できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });
      expect(result.current.selectedColumnKey).toBe("col0");

      // 同じ値を再設定
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });
      expect(result.current.selectedColumnKey).toBe("col0");
    });
  });

  describe("複数の列キーパターン", () => {
    const columnKeys = ["col0", "col1", "col2", "col10", "column_name", "header-1"];

    columnKeys.forEach((columnKey) => {
      it(`列キー '${columnKey}' を正しく設定できる`, () => {
        const { result } = renderHook(() => useSelectedHeaderStore());
        
        act(() => {
          result.current.setSelectedColumnKey(columnKey);
        });

        expect(result.current.selectedColumnKey).toBe(columnKey);
      });
    });
  });

  describe("状態の永続性", () => {
    it("異なるフックインスタンス間で状態が共有される", () => {
      const { result: result1 } = renderHook(() => useSelectedHeaderStore());
      const { result: result2 } = renderHook(() => useSelectedHeaderStore());
      
      // 最初のインスタンスで値を設定
      act(() => {
        result1.current.setSelectedColumnKey("col0");
      });

      // 別のインスタンスでも同じ値が取得できる
      expect(result2.current.selectedColumnKey).toBe("col0");
    });

    it("一方のインスタンスで変更すると他のインスタンスにも反映される", () => {
      const { result: result1 } = renderHook(() => useSelectedHeaderStore());
      const { result: result2 } = renderHook(() => useSelectedHeaderStore());
      
      // result1で設定
      act(() => {
        result1.current.setSelectedColumnKey("col0");
      });
      expect(result1.current.selectedColumnKey).toBe("col0");
      expect(result2.current.selectedColumnKey).toBe("col0");

      // result2で変更
      act(() => {
        result2.current.setSelectedColumnKey("col1");
      });
      expect(result1.current.selectedColumnKey).toBe("col1");
      expect(result2.current.selectedColumnKey).toBe("col1");
    });
  });

  describe("エッジケース", () => {
    it("空文字列を設定できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      act(() => {
        result.current.setSelectedColumnKey("");
      });

      expect(result.current.selectedColumnKey).toBe("");
    });

    it("非常に長い文字列を設定できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      const longColumnKey = "col".repeat(1000);
      
      act(() => {
        result.current.setSelectedColumnKey(longColumnKey);
      });

      expect(result.current.selectedColumnKey).toBe(longColumnKey);
    });

    it("特殊文字を含む列キーを設定できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      const specialColumnKey = "col-0_test.name[0]";
      
      act(() => {
        result.current.setSelectedColumnKey(specialColumnKey);
      });

      expect(result.current.selectedColumnKey).toBe(specialColumnKey);
    });
  });

  describe("選択状態の切り替えパターン", () => {
    it("複数の列を順次選択できる", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      const columns = ["col0", "col1", "col2"];
      
      columns.forEach((columnKey) => {
        act(() => {
          result.current.setSelectedColumnKey(columnKey);
        });
        expect(result.current.selectedColumnKey).toBe(columnKey);
      });
    });

    it("選択→解除→再選択のパターンが正しく動作する", () => {
      const { result } = renderHook(() => useSelectedHeaderStore());
      
      // 選択
      act(() => {
        result.current.setSelectedColumnKey("col0");
      });
      expect(result.current.selectedColumnKey).toBe("col0");

      // 解除
      act(() => {
        result.current.setSelectedColumnKey(null);
      });
      expect(result.current.selectedColumnKey).toBeNull();

      // 再選択
      act(() => {
        result.current.setSelectedColumnKey("col1");
      });
      expect(result.current.selectedColumnKey).toBe("col1");
    });
  });
});