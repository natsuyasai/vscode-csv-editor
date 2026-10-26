import { renderHook, act } from "@testing-library/react";
import { InMemoryRowSource } from "./InMemoryRowSource";
import { useRowSource } from "./useRowSource";

describe("useRowSource", () => {
  it("ソースが変化すると再レンダリングされ、新しい値を読める", () => {
    const source = new InMemoryRowSource(["a"], [["1"], ["2"]]);
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      useRowSource(source);
      return source.rowCount;
    });
    const before = renders;
    expect(result.current).toBe(2);
    act(() => source.applyOps([{ type: "deleteRows", handles: [0] }]));
    expect(renders).toBeGreaterThan(before);
    expect(result.current).toBe(1);
  });

  it("アンマウント後は購読を解除する", () => {
    const source = new InMemoryRowSource(["a"], [["1"]]);
    const unsubscribe = vi.fn();
    vi.spyOn(source, "subscribe").mockImplementation(() => unsubscribe);
    const { unmount } = renderHook(() => useRowSource(source));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("変化がなければバージョンは同じ値を返す", () => {
    const source = new InMemoryRowSource(["a"], [["1"]]);
    const { result, rerender } = renderHook(() => useRowSource(source));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
