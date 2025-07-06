import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Header } from "@/components/Header";
import { useAlignmentModeStore } from "@/stores/useAlignmentModeStore";

// VSCode要素をモック
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeCheckbox: ({ children, label, ...props }: React.ComponentProps<"input"> & { label?: string }) => <input type="checkbox" aria-label={label} {...props}>{children}</input>,
  VscodeButton: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
  VscodeIcon: ({ name, ...props }: React.ComponentProps<"span"> & { name: string }) => <span data-icon={name} {...props}></span>,
  VscodeLabel: ({ children, ...props }: React.ComponentProps<"label">) => <label {...props}>{children}</label>,
  VscodeSingleSelect: ({ children, ...props }: React.ComponentProps<"select">) => <select {...props}>{children}</select>,
  VscodeOption: ({ children, ...props }: React.ComponentProps<"option">) => <option {...props}>{children}</option>,
}));

// Zustandストアのモック化を明示的に無効化
vi.unmock("@/stores/useAlignmentModeStore");

describe("Header Integration Test (Real Store)", () => {
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
    selectedColumnKey: "col0",
    currentAlignment: { vertical: "center", horizontal: "left" } as const,
    onAlignmentChange: vi.fn(),
  };

  beforeEach(() => {
    // ストアの状態をリセット
    const { setAlignmentModeEnabled } = useAlignmentModeStore.getState();
    setAlignmentModeEnabled(false);
    vi.clearAllMocks();
  });

  it("ヘッダーセル選択済みの状態で並び替えモードボタンをクリックするとCellAlignmentControlsが表示される", () => {
    // 初期状態: 並び替えモード無効、ヘッダーセル選択済み
    render(<Header {...mockProps} />);
    
    // CellAlignmentControlsは表示されていない
    expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
    expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
    
    // 並び替えモードボタンをクリック
    const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
    fireEvent.click(alignmentModeButton);
    
    // CellAlignmentControlsが表示される
    expect(screen.getByText("Vertical:")).toBeInTheDocument();
    expect(screen.getByText("Horizontal:")).toBeInTheDocument();
  });

  it("並び替えモード有効化→無効化でCellAlignmentControlsが表示→非表示になる", () => {
    render(<Header {...mockProps} />);
    
    const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
    
    // 初期状態: CellAlignmentControlsは表示されていない
    expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
    
    // 並び替えモードを有効化
    fireEvent.click(alignmentModeButton);
    expect(screen.getByText("Vertical:")).toBeInTheDocument();
    
    // 並び替えモードを無効化
    fireEvent.click(alignmentModeButton);
    expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
  });

  it("selectedColumnKeyがnullの場合、並び替えモード有効でもCellAlignmentControlsは表示されない", () => {
    render(<Header {...mockProps} selectedColumnKey={null} />);
    
    // 並び替えモードボタンをクリック
    const alignmentModeButton = screen.getByRole("button", { name: "toggle alignment mode" });
    fireEvent.click(alignmentModeButton);
    
    // CellAlignmentControlsは表示されない
    expect(screen.queryByText("Vertical:")).not.toBeInTheDocument();
    expect(screen.queryByText("Horizontal:")).not.toBeInTheDocument();
  });
});