import { describe, expect, it, vi } from "vitest";
import {
  createKeyboardShortcutHandler,
  createGlobalShortcuts,
  createDataCellShortcuts,
  createHeaderCellShortcuts,
} from "@/utilities/keyboardShortcuts";

describe("keyboardShortcuts", () => {
  describe("createKeyboardShortcutHandler", () => {
    it("単一のキーボードショートカットが正しく動作する", () => {
      const handler = vi.fn();
      const shortcuts = [
        {
          key: "Z",
          ctrl: true,
          handler,
        },
      ];

      const keyboardHandler = createKeyboardShortcutHandler(shortcuts);
      const mockEvent = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
      });

      vi.spyOn(mockEvent, "stopPropagation");
      keyboardHandler(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(mockEvent);
    });

    it("修飾キーが一致しない場合は実行されない", () => {
      const handler = vi.fn();
      const shortcuts = [
        {
          key: "Z",
          ctrl: true,
          shift: false,
          handler,
        },
      ];

      const keyboardHandler = createKeyboardShortcutHandler(shortcuts);
      const mockEvent = new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        shiftKey: true, // 期待される値と異なる
      });

      keyboardHandler(mockEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it("複数のショートカットから適切なものが選択される", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const shortcuts = [
        {
          key: "Z",
          ctrl: true,
          handler: handler1,
        },
        {
          key: "Y",
          ctrl: true,
          handler: handler2,
        },
      ];

      const keyboardHandler = createKeyboardShortcutHandler(shortcuts);
      const mockEvent = new KeyboardEvent("keydown", {
        key: "y",
        ctrlKey: true,
      });

      keyboardHandler(mockEvent);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe("createGlobalShortcuts", () => {
    it("グローバルショートカットが正しく生成される", () => {
      const handlers = {
        undo: vi.fn(),
        redo: vi.fn(),
        toggleSearch: vi.fn(),
        toggleFilters: vi.fn(),
      };

      const shortcuts = createGlobalShortcuts(handlers);

      expect(shortcuts).toHaveLength(4);
      expect(shortcuts[0]).toEqual({
        key: "Z",
        ctrl: true,
        handler: handlers.undo,
      });
      expect(shortcuts[1]).toEqual({
        key: "Y",
        ctrl: true,
        handler: handlers.redo,
      });
    });
  });

  describe("createDataCellShortcuts", () => {
    it("データセルショートカットが正しく動作する", () => {
      const handlers = {
        deleteRow: vi.fn(),
        insertRowAbove: vi.fn(),
        insertRowBelow: vi.fn(),
      };

      const shortcuts = createDataCellShortcuts(handlers);
      const rowIdx = 5;

      // Delete行のテスト
      const deleteEvent = new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: true,
        shiftKey: true,
      });
      vi.spyOn(deleteEvent, "stopPropagation");

      const result = shortcuts.handleKeyDown(rowIdx, deleteEvent);

      expect(result).toBe(true);
      expect(deleteEvent.stopPropagation).toHaveBeenCalled();
      expect(handlers.deleteRow).toHaveBeenCalledWith(rowIdx);
    });

    it("該当しないキーの場合はfalseを返す", () => {
      const handlers = {
        deleteRow: vi.fn(),
        insertRowAbove: vi.fn(),
        insertRowBelow: vi.fn(),
      };

      const shortcuts = createDataCellShortcuts(handlers);
      const mockEvent = new KeyboardEvent("keydown", {
        key: "A",
        ctrlKey: true,
      });

      const result = shortcuts.handleKeyDown(0, mockEvent);

      expect(result).toBe(false);
      expect(handlers.deleteRow).not.toHaveBeenCalled();
    });
  });

  describe("createHeaderCellShortcuts", () => {
    it("ヘッダーセルショートカットが正しく動作する", () => {
      const handlers = {
        deleteCol: vi.fn(),
        insertColLeft: vi.fn(),
        insertColRight: vi.fn(),
      };

      const shortcuts = createHeaderCellShortcuts(handlers);
      const colIdx = 3;

      // 左に列挿入のテスト
      const insertLeftEvent = new KeyboardEvent("keydown", {
        key: "L",
        ctrlKey: true,
        shiftKey: true,
      });
      vi.spyOn(insertLeftEvent, "stopPropagation");

      const result = shortcuts.handleKeyDown(colIdx, insertLeftEvent);

      expect(result).toBe(true);
      expect(insertLeftEvent.stopPropagation).toHaveBeenCalled();
      expect(handlers.insertColLeft).toHaveBeenCalledWith(colIdx);
    });

    it("該当しないキーの場合はfalseを返す", () => {
      const handlers = {
        deleteCol: vi.fn(),
        insertColLeft: vi.fn(),
        insertColRight: vi.fn(),
      };

      const shortcuts = createHeaderCellShortcuts(handlers);
      const mockEvent = new KeyboardEvent("keydown", {
        key: "A",
        ctrlKey: true,
      });

      const result = shortcuts.handleKeyDown(0, mockEvent);

      expect(result).toBe(false);
      expect(handlers.deleteCol).not.toHaveBeenCalled();
    });
  });
});