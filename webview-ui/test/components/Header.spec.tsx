import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Header } from "@/components/Header";
import { useAlignmentModeStore } from "@/stores/useAlignmentModeStore";

// useAlignmentModeStoreをモック
vi.mock("@/stores/useAlignmentModeStore");

// VSCode要素をモック
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeCheckbox: ({ children, label, ...props }: React.ComponentProps<"input"> & { label?: string }) => <input type="checkbox" aria-label={label} {...props}>{children}</input>,
  VscodeButton: ({ children, secondary, ...props }: React.ComponentProps<"button"> & { secondary?: boolean }) => {
    const { secondary: _, ...buttonProps } = { secondary, ...props };
    return <button {...buttonProps} {...(secondary ? { secondary: "true" } : {})}>{children}</button>;
  },
  VscodeIcon: ({ name, ...props }: React.ComponentProps<"span"> & { name: string }) => <span data-icon={name} {...props}></span>,
  VscodeLabel: ({ children, ...props }: React.ComponentProps<"label">) => <label {...props}>{children}</label>,
  VscodeSingleSelect: ({ children, ...props }: React.ComponentProps<"select">) => <select {...props}>{children}</select>,
  VscodeOption: ({ children, ...props }: React.ComponentProps<"option">) => <option {...props}>{children}</option>,
}));

describe("Header", () => {
  const mockProps = {
    isIgnoreHeaderRow: false,
    onUpdateIgnoreHeaderRow: vi.fn(),
    rowSize: "normal" as const,
    onUpdateRowSize: vi.fn(),
    onSearch: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    isEnabledUndo: true,
    isEnabledRedo: true,
    onClickApply: vi.fn(),
    showFilters: false,
    onToggleFilters: vi.fn(),
    onClearFilters: vi.fn(),
    hasActiveFilters: false,
    selectedColumnKey: null,
    currentAlignment: { vertical: "center", horizontal: "left" } as const,
    onAlignmentChange: vi.fn(),
  };

  const mockUseAlignmentModeStore = {
    isAlignmentModeEnabled: false,
    setAlignmentModeEnabled: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // セレクター関数に対応したモック設定
    const mockStore = useAlignmentModeStore as unknown as { mockImplementation: (fn: (selector?: (state: typeof mockUseAlignmentModeStore) => unknown) => unknown) => void };
    mockStore.mockImplementation((selector) => {
      const store = mockUseAlignmentModeStore;
      return selector ? selector(store) : store;
    });
  });

  describe("並び替えモード切り替えボタン", () => {
    it("並び替えモード切り替えボタンが表示される", () => {
      render(<Header {...mockProps} />);
      
      const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
      expect(alignmentModeButton).toBeInTheDocument();
    });

    it("並び替えモードが無効の場合、ボタンはsecondaryスタイルになる", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = false;
      
      render(<Header {...mockProps} />);
      
      const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
      // secondaryプロパティが設定されている場合、DOM上では"true"という文字列値になる
      expect(alignmentModeButton).toHaveAttribute("secondary", "true");
    });

    it("並び替えモードが有効の場合、ボタンはprimaryスタイルになる", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} />);
      
      const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
      expect(alignmentModeButton).not.toHaveAttribute("secondary");
    });

    it("ボタンをクリックするとsetAlignmentModeEnabledが呼ばれる", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = false;
      
      render(<Header {...mockProps} />);
      
      const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
      fireEvent.click(alignmentModeButton);
      
      expect(mockUseAlignmentModeStore.setAlignmentModeEnabled).toHaveBeenCalledWith(true);
    });

    it("ボタンをクリックすると現在の状態の逆の値でsetAlignmentModeEnabledが呼ばれる", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} />);
      
      const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
      fireEvent.click(alignmentModeButton);
      
      expect(mockUseAlignmentModeStore.setAlignmentModeEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe("CellAlignmentControls の表示条件", () => {
    it("並び替えモードが無効の場合、CellAlignmentControlsは表示されない", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = false;
      
      render(<Header {...mockProps} selectedColumnKey="col0" />);
      
      expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
      expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
    });

    it("並び替えモードが有効でもselectedColumnKeyがnullの場合、CellAlignmentControlsは表示されない", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} selectedColumnKey={null} />);
      
      expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
      expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
    });

    it("並び替えモードが有効かつselectedColumnKeyがある場合、CellAlignmentControlsが表示される", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} selectedColumnKey="col0" />);
      
      expect(screen.getByText("Vertical:")).toBeInTheDocument();
      expect(screen.getByText("Horizontal:")).toBeInTheDocument();
    });

    it("onAlignmentChangeがundefinedの場合、CellAlignmentControlsは表示されない", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} selectedColumnKey="col0" onAlignmentChange={undefined} />);
      
      expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
      expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
    });

    it("currentAlignmentがundefinedの場合、CellAlignmentControlsは表示されない", () => {
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      render(<Header {...mockProps} selectedColumnKey="col0" currentAlignment={undefined} />);
      
      expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
      expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
    });

    it("ヘッダーセル選択後に並び替えモードを有効にするとCellAlignmentControlsが表示される", () => {
      // 初期状態: 並び替えモード無効、ヘッダーセル選択済み
      mockUseAlignmentModeStore.isAlignmentModeEnabled = false;
      
      const { rerender } = render(<Header {...mockProps} selectedColumnKey="col0" />);
      
      // CellAlignmentControlsは表示されていない
      expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
      expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
      
      // 並び替えモードを有効にする
      mockUseAlignmentModeStore.isAlignmentModeEnabled = true;
      
      // 再レンダリング
      rerender(<Header {...mockProps} selectedColumnKey="col0" />);
      
      // CellAlignmentControlsが表示される
      expect(screen.getByText("Vertical:")).toBeInTheDocument();
      expect(screen.getByText("Horizontal:")).toBeInTheDocument();
    });
  });

  describe("その他のボタンの動作", () => {
    it("検索ボタンをクリックするとonSearchが呼ばれる", () => {
      render(<Header {...mockProps} />);
      
      const searchButton = screen.getByRole("button", { name: "search" });
      fireEvent.click(searchButton);
      
      expect(mockProps.onSearch).toHaveBeenCalledOnce();
    });

    it("保存ボタンをクリックするとonClickApplyが呼ばれる", () => {
      render(<Header {...mockProps} />);
      
      const saveButton = screen.getByRole("button", { name: "save" });
      fireEvent.click(saveButton);
      
      expect(mockProps.onClickApply).toHaveBeenCalledOnce();
    });
  });
});