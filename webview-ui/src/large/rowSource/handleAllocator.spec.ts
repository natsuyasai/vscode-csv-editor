import { createHandleAllocator, createVscodeHandleStorage } from "./handleAllocator";

describe("createHandleAllocator", () => {
  it("-1, -2, ... と負のハンドルを順に採番する", () => {
    const allocator = createHandleAllocator();
    expect([allocator.next(), allocator.next(), allocator.next()]).toEqual([-1, -2, -3]);
  });

  it("保存先の続きから採番し、採番するたびに次の値を保存する（webview を作り直しても重ならない）", () => {
    let saved: number | undefined = -5;
    const storage = { load: () => saved, save: (next: number) => (saved = next) };
    const allocator = createHandleAllocator(storage);
    expect(allocator.next()).toBe(-5);
    expect(saved).toBe(-6);
    // 作り直した webview は保存された続きから使う
    expect(createHandleAllocator(storage).next()).toBe(-6);
  });

  it("保存された値が負の整数でなければ -1 から採番する", () => {
    for (const value of [undefined, 0, 3, -1.5, Number.NaN]) {
      const allocator = createHandleAllocator({ load: () => value, save: () => undefined });
      expect(allocator.next()).toBe(-1);
    }
  });
});

describe("createVscodeHandleStorage", () => {
  it("webview の状態の他のキーを残したまま次のハンドルを保存し、読み出す", () => {
    let state: unknown = { other: "keep" };
    const api = {
      getState: () => state,
      setState: (next: unknown) => {
        state = next;
        return next;
      },
    };
    const storage = createVscodeHandleStorage(api);
    expect(storage.load()).toBeUndefined();
    storage.save(-3);
    expect(state).toEqual({ other: "keep", largeNextHandle: -3 });
    expect(storage.load()).toBe(-3);
  });

  it("状態が無い・オブジェクトでないときも保存できる", () => {
    let state: unknown = "broken";
    const storage = createVscodeHandleStorage({
      getState: () => state,
      setState: (next: unknown) => (state = next),
    });
    expect(storage.load()).toBeUndefined();
    storage.save(-1);
    expect(state).toEqual({ largeNextHandle: -1 });
  });
});
