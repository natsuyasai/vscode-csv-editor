import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useContextMenusV2 } from "@/hooks/useContextMenusV2";
import type { RowContextMenuActions, ColumnContextMenuActions } from "@/hooks/useContextMenusV2";

describe("useContextMenusV2", () => {
  let mockRowActions: RowContextMenuActions;
  let mockColumnActions: ColumnContextMenuActions;

  beforeEach(() => {
    mockRowActions = {
      deleteRow: vi.fn(),
      insertRow: vi.fn(),
    };
    mockColumnActions = {
      deleteCol: vi.fn(),
      insertCol: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("行コンテキストメニュー", () => {
    it("初期状態では行コンテキストメニューが閉じている", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      expect(result.current.isRowContextMenuOpen).toBe(false);
      expect(result.current.rowContextMenuProps).toBeNull();
    });

    it("openRowContextMenuで行コンテキストメニューを開く", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openRowContextMenu(1, 100, 200);
      });

      expect(result.current.isRowContextMenuOpen).toBe(true);
      expect(result.current.rowContextMenuProps).toEqual({
        itemIdx: 1,
        top: 100,
        left: 200,
      });
    });

    it("handleSelectRowContextMenuで行を削除", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openRowContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectRowContextMenu("deleteRow");
      });

      expect(mockRowActions.deleteRow).toHaveBeenCalledWith(2);
      expect(result.current.isRowContextMenuOpen).toBe(false);
      expect(result.current.rowContextMenuProps).toBeNull();
    });

    it("handleSelectRowContextMenuで行を上に挿入", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openRowContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectRowContextMenu("insertRowAbove");
      });

      expect(mockRowActions.insertRow).toHaveBeenCalledWith(2);
      expect(result.current.isRowContextMenuOpen).toBe(false);
    });

    it("handleSelectRowContextMenuで行を下に挿入", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openRowContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectRowContextMenu("insertRowBelow");
      });

      expect(mockRowActions.insertRow).toHaveBeenCalledWith(3);
      expect(result.current.isRowContextMenuOpen).toBe(false);
    });

    it("handleCloseRowContextMenuで行コンテキストメニューを閉じる", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openRowContextMenu(1, 100, 200);
      });

      act(() => {
        result.current.handleCloseRowContextMenu();
      });

      expect(result.current.isRowContextMenuOpen).toBe(false);
      expect(result.current.rowContextMenuProps).toBeNull();
    });

    it("rowContextMenuPropsがnullの場合は何もしない", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.handleSelectRowContextMenu("deleteRow");
      });

      expect(mockRowActions.deleteRow).not.toHaveBeenCalled();
    });
  });

  describe("列コンテキストメニュー", () => {
    it("初期状態では列コンテキストメニューが閉じている", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      expect(result.current.isColumnContextMenuOpen).toBe(false);
      expect(result.current.columnContextMenuProps).toBeNull();
    });

    it("openColumnContextMenuで列コンテキストメニューを開く", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openColumnContextMenu(1, 100, 200);
      });

      expect(result.current.isColumnContextMenuOpen).toBe(true);
      expect(result.current.columnContextMenuProps).toEqual({
        itemIdx: 1,
        top: 100,
        left: 200,
      });
    });

    it("handleSelectColumnContextMenuで列を削除", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openColumnContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectColumnContextMenu("deleteHeaderCel");
      });

      expect(mockColumnActions.deleteCol).toHaveBeenCalledWith(2);
      expect(result.current.isColumnContextMenuOpen).toBe(false);
      expect(result.current.columnContextMenuProps).toBeNull();
    });

    it("handleSelectColumnContextMenuで列を左に挿入", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openColumnContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectColumnContextMenu("insertHeaderCelLeft");
      });

      expect(mockColumnActions.insertCol).toHaveBeenCalledWith(2);
      expect(result.current.isColumnContextMenuOpen).toBe(false);
    });

    it("handleSelectColumnContextMenuで列を右に挿入", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openColumnContextMenu(2, 100, 200);
      });

      act(() => {
        result.current.handleSelectColumnContextMenu("insertHeaderCelRight");
      });

      expect(mockColumnActions.insertCol).toHaveBeenCalledWith(3);
      expect(result.current.isColumnContextMenuOpen).toBe(false);
    });

    it("handleCloseColumnContextMenuで列コンテキストメニューを閉じる", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.openColumnContextMenu(1, 100, 200);
      });

      act(() => {
        result.current.handleCloseColumnContextMenu();
      });

      expect(result.current.isColumnContextMenuOpen).toBe(false);
      expect(result.current.columnContextMenuProps).toBeNull();
    });

    it("columnContextMenuPropsがnullの場合は何もしない", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      act(() => {
        result.current.handleSelectColumnContextMenu("deleteHeaderCel");
      });

      expect(mockColumnActions.deleteCol).not.toHaveBeenCalled();
    });
  });

  describe("rowContextMenuRef と columnContextMenuRef", () => {
    it("rowContextMenuRefが初期化されている", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      expect(result.current.rowContextMenuRef).toBeDefined();
      expect(result.current.rowContextMenuRef.current).toBeNull();
    });

    it("columnContextMenuRefが初期化されている", () => {
      const { result } = renderHook(() => useContextMenusV2(mockRowActions, mockColumnActions));

      expect(result.current.columnContextMenuRef).toBeDefined();
      expect(result.current.columnContextMenuRef.current).toBeNull();
    });
  });
});
