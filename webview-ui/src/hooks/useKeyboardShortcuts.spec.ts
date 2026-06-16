import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts, KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let mockHandler = vi.fn();
  let mockHandler2 = vi.fn();

  beforeEach(() => {
    mockHandler = vi.fn();
    mockHandler2 = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("基本的なキーボードショートカットが動作すること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // Ctrl+Sイベントをシミュレート
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("複数のショートカットが登録できること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
      {
        key: "z",
        ctrl: true,
        handler: mockHandler2,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // Ctrl+Sイベント
    let event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);
    expect(mockHandler).toHaveBeenCalledWith(event);

    // Ctrl+Zイベント
    event = new KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
    });
    document.dispatchEvent(event);
    expect(mockHandler2).toHaveBeenCalledWith(event);
  });

  it("修飾キーの組み合わせが正しく動作すること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "d",
        ctrl: true,
        shift: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // Ctrl+Shift+Dイベント
    const event = new KeyboardEvent("keydown", {
      key: "d",
      ctrlKey: true,
      shiftKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("条件が満たされない場合はハンドラーが呼ばれないこと", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
        condition: () => false,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("条件が満たされる場合はハンドラーが呼ばれること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
        condition: () => true,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("enabledがfalseの場合はハンドラーが呼ばれないこと", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("preventDefaultが設定されている場合はデフォルト動作が無効になること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
        preventDefault: true,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("stopPropagationが設定されている場合はイベント伝播が停止されること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
        stopPropagation: true,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

    document.dispatchEvent(event);

    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("特定の要素にバインドできること", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);

    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts, element }));

    // 特定の要素からイベントを発火
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    element.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);

    // documentからのイベントは反応しない
    vi.clearAllMocks();
    document.dispatchEvent(event);
    expect(mockHandler).not.toHaveBeenCalled();

    document.body.removeChild(element);
  });

  it("hookがアンマウントされたときにイベントリスナーが削除されること", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // アンマウント前はイベントが処理される
    let event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);
    expect(mockHandler).toHaveBeenCalledWith(event);

    // アンマウント
    unmount();
    vi.clearAllMocks();

    // アンマウント後はイベントが処理されない
    event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("大文字小文字を区別しないこと", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "S",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // 小文字のsで発火
    const event = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it("マッチしないショートカットでは何も実行されないこと", () => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: "s",
        ctrl: true,
        handler: mockHandler,
      },
    ];

    renderHook(() => useKeyboardShortcuts({ shortcuts }));

    // 異なるキーでのイベント
    const event = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });
});
