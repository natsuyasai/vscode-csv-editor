import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEventListener } from "@/hooks/useEventListener";

describe("useEventListener", () => {
  let mockHandler = vi.fn();
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockHandler = vi.fn();
    mockElement = document.createElement("div");
    document.body.appendChild(mockElement);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }
  });

  it("基本的なイベントリスナーが動作すること", () => {
    renderHook(() => useEventListener("click", mockHandler, mockElement));

    const event = new MouseEvent("click");
    mockElement.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("documentに対してイベントリスナーが動作すること", () => {
    renderHook(() => useEventListener("keydown", mockHandler, document));

    const event = new KeyboardEvent("keydown", { key: "a" });
    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("windowに対してイベントリスナーが動作すること", () => {
    renderHook(() => useEventListener("resize", mockHandler, window));

    const event = new Event("resize");
    window.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("要素がnullの場合は何もしないこと", () => {
    renderHook(() => useEventListener("click", mockHandler, null));

    // documentにイベントを発火してもハンドラーは呼ばれない
    const event = new MouseEvent("click");
    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("enabledがfalseの場合はイベントリスナーが無効になること", () => {
    renderHook(() => useEventListener("click", mockHandler, mockElement, { enabled: false }));

    const event = new MouseEvent("click");
    mockElement.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("optionsが渡された場合は正しく適用されること", () => {
    const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");

    renderHook(() =>
      useEventListener("click", mockHandler, mockElement, {
        enabled: true,
        capture: true,
        passive: true,
      })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function), {
      capture: true,
      passive: true,
    });
  });

  it("hookがアンマウントされたときにイベントリスナーが削除されること", () => {
    const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

    const { unmount } = renderHook(() => useEventListener("click", mockHandler, mockElement));

    // アンマウント前はイベントが処理される
    let event = new MouseEvent("click");
    mockElement.dispatchEvent(event);
    expect(mockHandler).toHaveBeenCalledWith(event);

    // アンマウント
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function), undefined);

    // アンマウント後はイベントが処理されない
    vi.clearAllMocks();
    event = new MouseEvent("click");
    mockElement.dispatchEvent(event);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("依存配列が変更されたときにイベントリスナーが再登録されること", () => {
    const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

    const { rerender } = renderHook(
      ({ handler }) => useEventListener("click", handler, mockElement),
      { initialProps: { handler: mockHandler } }
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    // ハンドラーを変更
    const newHandler = vi.fn();
    rerender({ handler: newHandler });

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2);

    // 新しいハンドラーが呼ばれること
    const event = new MouseEvent("click");
    mockElement.dispatchEvent(event);
    expect(newHandler).toHaveBeenCalledWith(event);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("複数のイベントタイプを同時に扱えること", () => {
    const clickHandler = vi.fn();
    const mousedownHandler = vi.fn();

    renderHook(() => {
      useEventListener("click", clickHandler, mockElement);
      useEventListener("mousedown", mousedownHandler, mockElement);
    });

    const clickEvent = new MouseEvent("click");
    const mousedownEvent = new MouseEvent("mousedown");

    mockElement.dispatchEvent(clickEvent);
    mockElement.dispatchEvent(mousedownEvent);

    expect(clickHandler).toHaveBeenCalledWith(clickEvent);
    expect(mousedownHandler).toHaveBeenCalledWith(mousedownEvent);
  });

  it("RefObjectが渡された場合に正しく動作すること", () => {
    const ref = { current: mockElement };

    renderHook(() => useEventListener("click", mockHandler, ref));

    const event = new MouseEvent("click");
    mockElement.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("RefObjectのcurrentがnullの場合は何もしないこと", () => {
    const ref = { current: null };

    renderHook(() => useEventListener("click", mockHandler, ref));

    const event = new MouseEvent("click");
    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });
});
