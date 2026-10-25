import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** Ctrl または Cmd(Meta) のどちらかが押されていれば一致とする（Windows/Linux: Ctrl, macOS: Cmd） */
  mod?: boolean;
  /** true の場合、input / textarea / select / contenteditable からのイベントでは実行せず標準動作を残す */
  ignoreWhenEditing?: boolean;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  condition?: () => boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  element?: HTMLElement | null;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  element = null,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) {
      return;
    }

    const targetElement = element || document;

    const handleKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      for (const shortcut of shortcuts) {
        if (isMatchingShortcut(event, shortcut)) {
          if (shortcut.ignoreWhenEditing && isEditableEventTarget(event)) {
            continue;
          }
          // 条件チェック
          if (shortcut.condition && !shortcut.condition()) {
            continue;
          }

          // イベント制御
          if (shortcut.preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }

          // ハンドラー実行
          shortcut.handler(event);
          break; // 最初にマッチしたショートカットのみ実行
        }
      }
    };

    targetElement.addEventListener("keydown", handleKeyDown);

    return () => {
      targetElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, element, enabled]);
}

function isMatchingShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // キーの比較（大文字小文字を区別しない）
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();

  // 修飾キーの比較
  const modMatches = shortcut.mod
    ? event.ctrlKey || event.metaKey
    : Boolean(event.ctrlKey) === Boolean(shortcut.ctrl) &&
      Boolean(event.metaKey) === Boolean(shortcut.meta);
  const shiftMatches = Boolean(event.shiftKey) === Boolean(shortcut.shift);
  const altMatches = Boolean(event.altKey) === Boolean(shortcut.alt);

  return keyMatches && modMatches && shiftMatches && altMatches;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableElement(element: Element): boolean {
  if (EDITABLE_TAGS.has(element.tagName)) {
    return true;
  }
  // VSCode Elements の入力系カスタム要素（Shadow DOM 内の input がホスト要素に再ターゲットされる）
  if (element.tagName.toLowerCase().startsWith("vscode-text")) {
    return true;
  }
  const editable = element.closest("[contenteditable]")?.getAttribute("contenteditable");
  return editable !== null && editable !== undefined && editable.toLowerCase() !== "false";
}

function isEditableEventTarget(event: KeyboardEvent): boolean {
  const origin = event.composedPath()[0] ?? event.target;
  return origin instanceof Element && isEditableElement(origin);
}
