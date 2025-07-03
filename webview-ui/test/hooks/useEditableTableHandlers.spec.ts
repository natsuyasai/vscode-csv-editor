import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditableTableHandlers } from "@/hooks/useEditableTableHandlers";
import { useColumnAlignmentStore } from "@/stores/useColumnAlignmentStore";
import { useSelectedHeaderStore } from "@/stores/useSelectedHeaderStore";

// Zustandストアをモック
vi.mock("@/stores/useColumnAlignmentStore");
vi.mock("@/stores/useSelectedHeaderStore");

describe("useEditableTableHandlers", () => {
  const mockProps = {
    insertRow: vi.fn(),
    deleteRow: vi.fn(),
    insertCol: vi.fn(),
    deleteCol: vi.fn(),
    updateCol: vi.fn(),
    rows: [],
  };

  const mockSetColumnAlignment = vi.fn();
  const mockSetSelectedColumnKey = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // useColumnAlignmentStoreのモック
    vi.mocked(useColumnAlignmentStore).mockImplementation((selector) => {
      const store = {
        setColumnAlignment: mockSetColumnAlignment,
      };
      return selector(store as any);
    });

    // useSelectedHeaderStoreのモック
    vi.mocked(useSelectedHeaderStore).mockImplementation((selector) => {
      const store = {
        selectedColumnKey: "column1",
        setSelectedColumnKey: mockSetSelectedColumnKey,
      };
      return selector(store as any);
    });
  });

  describe("handleSelectRowContextMenu", () => {
    it("deleteRowアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectRowContextMenu("deleteRow", 5);
      });

      expect(mockProps.deleteRow).toHaveBeenCalledWith(5);
    });

    it("insertRowAboveアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectRowContextMenu("insertRowAbove", 3);
      });

      expect(mockProps.insertRow).toHaveBeenCalledWith(3);
    });

    it("insertRowBelowアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectRowContextMenu("insertRowBelow", 2);
      });

      expect(mockProps.insertRow).toHaveBeenCalledWith(3); // 2 + 1
    });

    it("不明なアクションの場合は何も実行されない", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectRowContextMenu("unknownAction", 1);
      });

      expect(mockProps.deleteRow).not.toHaveBeenCalled();
      expect(mockProps.insertRow).not.toHaveBeenCalled();
    });
  });

  describe("handleSelectHeaderContextMenu", () => {
    it("deleteHeaderCelアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectHeaderContextMenu("deleteHeaderCel", 4);
      });

      expect(mockProps.deleteCol).toHaveBeenCalledWith(4);
    });

    it("insertHeaderCelLeftアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectHeaderContextMenu("insertHeaderCelLeft", 2);
      });

      expect(mockProps.insertCol).toHaveBeenCalledWith(2);
    });

    it("insertHeaderCelRightアクションが正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleSelectHeaderContextMenu("insertHeaderCelRight", 1);
      });

      expect(mockProps.insertCol).toHaveBeenCalledWith(2); // 1 + 1
    });
  });

  describe("handleHeaderAlignmentChange", () => {
    it("選択されている列がある場合はアライメントが設定される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));
      const alignment = { vertical: "top" as const, horizontal: "center" as const };

      act(() => {
        result.current.handleHeaderAlignmentChange(alignment);
      });

      expect(mockSetColumnAlignment).toHaveBeenCalledWith("column1", alignment);
    });

    it("選択されている列がない場合はアライメントが設定されない", () => {
      // selectedColumnKeyをnullに設定
      vi.mocked(useSelectedHeaderStore).mockImplementation((selector) => {
        const store = {
          selectedColumnKey: null,
          setSelectedColumnKey: mockSetSelectedColumnKey,
        };
        return selector(store as any);
      });

      const { result } = renderHook(() => useEditableTableHandlers(mockProps));
      const alignment = { vertical: "top" as const, horizontal: "center" as const };

      act(() => {
        result.current.handleHeaderAlignmentChange(alignment);
      });

      expect(mockSetColumnAlignment).not.toHaveBeenCalled();
    });
  });

  describe("handleHeaderCellClick", () => {
    it("列キーが正しく設定される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleHeaderCellClick("column2");
      });

      expect(mockSetSelectedColumnKey).toHaveBeenCalledWith("column2");
    });

    it("nullが渡された場合は列選択がクリアされる", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleHeaderCellClick(null);
      });

      expect(mockSetSelectedColumnKey).toHaveBeenCalledWith(null);
    });
  });

  describe("handleHeaderClickOutside", () => {
    it("列選択がクリアされる", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleHeaderClickOutside();
      });

      expect(mockSetSelectedColumnKey).toHaveBeenCalledWith(null);
    });
  });

  describe("handleHeaderEdit", () => {
    it("列の更新が正しく実行される", () => {
      const { result } = renderHook(() => useEditableTableHandlers(mockProps));

      act(() => {
        result.current.handleHeaderEdit(2, "新しいヘッダー");
      });

      expect(mockProps.updateCol).toHaveBeenCalledWith(2, "新しいヘッダー");
    });
  });
});