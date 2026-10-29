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

describe("useKeyboardShortcuts: mod / 入力要素の扱い (issue #84)", () => {
  const fire = (target: EventTarget, init: KeyboardEventInit) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("mod指定のショートカットはCtrlでもCmd(Meta)でも動作する", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ shortcuts: [{ key: "z", mod: true, handler }] }));
    fire(document, { key: "z", ctrlKey: true });
    fire(document, { key: "z", metaKey: true });
    fire(document, { key: "z" });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("mod指定でShift有無を区別できる(Ctrl+Shift+Zとctrl+Zを別扱い)", () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [
          { key: "z", mod: true, handler: undo },
          { key: "z", mod: true, shift: true, handler: redo },
        ],
      })
    );
    fire(document, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
  });

  it.each([
    ["input", () => document.createElement("input")],
    ["textarea", () => document.createElement("textarea")],
    ["select", () => document.createElement("select")],
    [
      "contenteditable",
      () => {
        const div = document.createElement("div");
        div.setAttribute("contenteditable", "true");
        return div;
      },
    ],
    ["vscode-textfield", () => document.createElement("vscode-textfield")],
  ])("ignoreWhenEditing指定のショートカットは%sにフォーカス中は実行されず標準動作が残る", (_n, create) => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: "c", mod: true, ignoreWhenEditing: true, preventDefault: true, handler }],
      })
    );
    const el = create();
    document.body.appendChild(el);
    const event = fire(el, { key: "c", ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignoreWhenEditing指定でも入力要素以外では実行される", () => {
    const handler = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: [{ key: "c", mod: true, ignoreWhenEditing: true, handler }],
      })
    );
    const div = document.createElement("div");
    document.body.appendChild(div);
    fire(div, { key: "c", ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignoreWhenEditing未指定のショートカットは入力要素でも実行される(保存・検索用)", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ shortcuts: [{ key: "s", mod: true, handler }] }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fire(input, { key: "s", metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
