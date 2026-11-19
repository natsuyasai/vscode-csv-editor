import { act, renderHook } from "@testing-library/react";
import { create, createStore } from "zustand";
import { useAlignmentModeStore } from "@/stores/useAlignmentModeStore";

/**
 * zustand 本体と `__mocks__/zustand.ts`（setup.ts で vi.mock("zustand")）の振る舞いを確かめる。
 * zustand 更新後もモックが各テスト後にストアを初期状態へ戻せることを検知するため、
 * テスト間で手動のリセットは行わない（テストの実行順に依存させている）。
 */

interface CounterState {
  count: number;
  increment: () => void;
}

// カリー化した create<T>()(...) の分岐
const useCurriedCounter = create<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// React に依存しない createStore の分岐
const vanillaCounter = createStore<CounterState>()((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

describe("zustand モックのテスト後リセット", () => {
  it("1つ目のテストでストアの状態を変更する", () => {
    useAlignmentModeStore.getState().setAlignmentModeEnabled(true);
    useCurriedCounter.getState().increment();
    vanillaCounter.getState().increment();
    vanillaCounter.getState().increment();

    expect(useAlignmentModeStore.getState().isAlignmentModeEnabled).toBe(true);
    expect(useCurriedCounter.getState().count).toBe(1);
    expect(vanillaCounter.getState().count).toBe(2);
  });

  it("2つ目のテストでは手動でリセットしなくても初期状態に戻っている", () => {
    expect(useAlignmentModeStore.getState().isAlignmentModeEnabled).toBe(false);
    expect(useCurriedCounter.getState().count).toBe(0);
    expect(vanillaCounter.getState().count).toBe(0);
  });

  it("リセット後もアクションは使える", () => {
    useCurriedCounter.getState().increment();
    expect(useCurriedCounter.getState().count).toBe(1);
  });
});

describe("zustand のフックによる購読", () => {
  it("セレクターで購読したコンポーネントは状態の変更で再描画される", () => {
    const { result } = renderHook(() =>
      useAlignmentModeStore((state) => state.isAlignmentModeEnabled)
    );
    expect(result.current).toBe(false);

    act(() => {
      useAlignmentModeStore.getState().setAlignmentModeEnabled(true);
    });

    expect(result.current).toBe(true);
  });

  it("createStore のストアは subscribe で変更を通知する", () => {
    const counts: number[] = [];
    const unsubscribe = vanillaCounter.subscribe((state) => counts.push(state.count));

    vanillaCounter.getState().increment();
    unsubscribe();
    vanillaCounter.getState().increment();

    expect(counts).toEqual([1]);
  });
});
