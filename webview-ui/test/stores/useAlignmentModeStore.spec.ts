import { describe, it, expect, beforeEach } from "vitest";
import { useAlignmentModeStore } from "@/stores/useAlignmentModeStore";

// ストアの初期化用のヘルパー
const resetStore = () => {
  const { setAlignmentModeEnabled } = useAlignmentModeStore.getState();
  setAlignmentModeEnabled(false);
};

describe("useAlignmentModeStore", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("初期状態", () => {
    it("isAlignmentModeEnabledはfalseである", () => {
      const { isAlignmentModeEnabled } = useAlignmentModeStore.getState();
      expect(isAlignmentModeEnabled).toBe(false);
    });
  });

  describe("setAlignmentModeEnabled", () => {
    it("isAlignmentModeEnabledをtrueに設定できる", () => {
      const { setAlignmentModeEnabled } = useAlignmentModeStore.getState();
      
      setAlignmentModeEnabled(true);
      
      const { isAlignmentModeEnabled } = useAlignmentModeStore.getState();
      expect(isAlignmentModeEnabled).toBe(true);
    });

    it("isAlignmentModeEnabledをfalseに設定できる", () => {
      const { setAlignmentModeEnabled } = useAlignmentModeStore.getState();
      
      // 最初にtrueに設定
      setAlignmentModeEnabled(true);
      expect(useAlignmentModeStore.getState().isAlignmentModeEnabled).toBe(true);
      
      // falseに戻す
      setAlignmentModeEnabled(false);
      
      const { isAlignmentModeEnabled } = useAlignmentModeStore.getState();
      expect(isAlignmentModeEnabled).toBe(false);
    });

    it("同じ値を設定しても状態が正しく保持される", () => {
      const { setAlignmentModeEnabled } = useAlignmentModeStore.getState();
      
      setAlignmentModeEnabled(true);
      setAlignmentModeEnabled(true); // 同じ値を再設定
      
      const { isAlignmentModeEnabled } = useAlignmentModeStore.getState();
      expect(isAlignmentModeEnabled).toBe(true);
    });
  });

  describe("状態の切り替え", () => {
    it("false -> true -> false の切り替えが正しく動作する", () => {
      const store = useAlignmentModeStore.getState();
      
      // 初期状態: false
      expect(store.isAlignmentModeEnabled).toBe(false);
      
      // true に切り替え
      store.setAlignmentModeEnabled(true);
      expect(useAlignmentModeStore.getState().isAlignmentModeEnabled).toBe(true);
      
      // false に切り替え
      store.setAlignmentModeEnabled(false);
      expect(useAlignmentModeStore.getState().isAlignmentModeEnabled).toBe(false);
    });
  });
});