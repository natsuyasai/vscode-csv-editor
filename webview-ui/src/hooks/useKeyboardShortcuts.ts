import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
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
  const ctrlMatches = Boolean(event.ctrlKey) === Boolean(shortcut.ctrl);
  const shiftMatches = Boolean(event.shiftKey) === Boolean(shortcut.shift);
  const altMatches = Boolean(event.altKey) === Boolean(shortcut.alt);
  const metaMatches = Boolean(event.metaKey) === Boolean(shortcut.meta);

  return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
}
