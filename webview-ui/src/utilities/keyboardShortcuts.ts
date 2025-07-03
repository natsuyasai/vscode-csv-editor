import { KeyboardShortcut, KeyboardModifiers } from "@/types/components";

export const createKeyboardShortcutHandler = (shortcuts: KeyboardShortcut[]) => {
  return (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    const modifiers: KeyboardModifiers = {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
    };

    for (const shortcut of shortcuts) {
      const isKeyMatch = shortcut.key.toUpperCase() === key;
      const isCtrlMatch = (shortcut.ctrl ?? false) === modifiers.ctrl;
      const isShiftMatch = (shortcut.shift ?? false) === modifiers.shift;
      const isAltMatch = (shortcut.alt ?? false) === modifiers.alt;

      if (isKeyMatch && isCtrlMatch && isShiftMatch && isAltMatch) {
        e.stopPropagation();
        shortcut.handler(e);
        return;
      }
    }
  };
};

export const createGlobalShortcuts = (handlers: {
  undo: () => void;
  redo: () => void;
  toggleSearch: () => void;
  toggleFilters: () => void;
}): KeyboardShortcut[] => [
  {
    key: "Z",
    ctrl: true,
    handler: handlers.undo,
  },
  {
    key: "Y",
    ctrl: true,
    handler: handlers.redo,
  },
  {
    key: "F",
    ctrl: true,
    handler: handlers.toggleSearch,
  },
  {
    key: "H",
    ctrl: true,
    shift: true,
    handler: handlers.toggleFilters,
  },
];

export const createDataCellShortcuts = (handlers: {
  deleteRow: (rowIdx: number) => void;
  insertRowAbove: (rowIdx: number) => void;
  insertRowBelow: (rowIdx: number) => void;
}) => ({
  handleKeyDown: (rowIdx: number, e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    
    if (key === "D" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.deleteRow(rowIdx);
      return true;
    }
    if (key === "I" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.insertRowAbove(rowIdx);
      return true;
    }
    if (key === "B" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.insertRowBelow(rowIdx);
      return true;
    }
    return false;
  },
});

export const createHeaderCellShortcuts = (handlers: {
  deleteCol: (colIdx: number) => void;
  insertColLeft: (colIdx: number) => void;
  insertColRight: (colIdx: number) => void;
}) => ({
  handleKeyDown: (colIdx: number, e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    
    if (key === "D" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.deleteCol(colIdx);
      return true;
    }
    if (key === "L" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.insertColLeft(colIdx);
      return true;
    }
    if (key === "R" && e.ctrlKey && e.shiftKey) {
      e.stopPropagation();
      handlers.insertColRight(colIdx);
      return true;
    }
    return false;
  },
});