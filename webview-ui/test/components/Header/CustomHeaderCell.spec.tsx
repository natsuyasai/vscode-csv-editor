import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomHeaderCell, CustomHeaderCellProps } from "@/components/Header/CustomHeaderCell";
import { CalculatedColumn } from "react-data-grid";

// VscodeIconのモック
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeIcon: ({ name }: { name: string }) => <span data-testid={`vscode-icon-${name}`}>×</span>,
}));

const mockColumn: CalculatedColumn<Record<string, string>, unknown> = {
  idx: 0,
  key: "test-column",
  name: "テストカラム",
  width: 120,
  minWidth: 50,
  maxWidth: undefined,
  resizable: true,
  sortable: true,
  frozen: false,
  renderCell: () => null,
  renderHeaderCell: () => null,
  headerCellClass: undefined,
  cellClass: undefined,
  parent: undefined,
  level: 0,
  colSpan: undefined,
  editable: true,
  draggable: true,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndProvider backend={HTML5Backend}>
    <div style={{ display: "grid", width: "200px", height: "60px" }}>{children}</div>
  </DndProvider>
);

describe("CustomHeaderCell", () => {
  const defaultProps = {
    column: mockColumn,
    sortDirection: "ASC",
    priority: undefined,
    isIgnoreHeaderRow: false,
    sortColumnsForWaitingDoubleClick: [],
    onHeaderCellContextMenu: vi.fn(),
    onHeaderEdit: vi.fn(),
    onKeyDown: vi.fn(),
    onCanSortColumnsChange: vi.fn(),
    onDoubleClick: vi.fn(),
    tabIndex: 0,
    showFilters: false,
    filterValue: "",
    onFilterChange: vi.fn(),
    onFilterClear: vi.fn(),
    isFilterActive: false,
  } satisfies CustomHeaderCellProps;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しくレンダリングされること", () => {
    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("テストカラム")).toBeInTheDocument();
  });

  it("フィルターが表示されているときにFilterCellが表示されること", () => {
    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} showFilters={true} />
      </TestWrapper>
    );

    const filterInput = screen.getByPlaceholderText("filter...");
    expect(filterInput).toBeInTheDocument();
  });

  it("フィルター入力フィールドからのkeydownイベントが除外されること", () => {
    const mockOnKeyDown = vi.fn();

    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} showFilters={true} onKeyDown={mockOnKeyDown} />
      </TestWrapper>
    );

    const filterInput = screen.getByPlaceholderText("filter...");

    // フィルター入力フィールドでキーダウンイベントを発火
    fireEvent.keyDown(filterInput, { key: "a" });

    // CustomHeaderCellのonKeyDownが呼ばれないことを確認
    expect(mockOnKeyDown).not.toHaveBeenCalled();
  });

  it("フィルター以外のエリアからのkeydownイベントは正常に処理されること", () => {
    const mockOnKeyDown = vi.fn();

    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} showFilters={true} onKeyDown={mockOnKeyDown} />
      </TestWrapper>
    );

    const headerText = screen.getByText("テストカラム");

    // ヘッダーテキストエリアでキーダウンイベントを発火
    fireEvent.keyDown(headerText, { key: "F2" });

    // CustomHeaderCellのonKeyDownが呼ばれることを確認
    expect(mockOnKeyDown).toHaveBeenCalled();
  });

  it("フィルタークリアボタンからのkeydownイベントが除外されること", () => {
    const mockOnKeyDown = vi.fn();

    render(
      <TestWrapper>
        <CustomHeaderCell
          {...defaultProps}
          showFilters={true}
          filterValue="test"
          isFilterActive={true}
          onKeyDown={mockOnKeyDown}
        />
      </TestWrapper>
    );

    const clearButton = screen.getByTitle("Clear Filter");

    // クリアボタンでキーダウンイベントを発火
    fireEvent.keyDown(clearButton, { key: "Enter" });

    // CustomHeaderCellのonKeyDownが呼ばれないことを確認
    expect(mockOnKeyDown).not.toHaveBeenCalled();
  });

  it("data-filter-cell属性を持つ要素からのイベントが除外されること", () => {
    const mockOnKeyDown = vi.fn();

    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} showFilters={true} onKeyDown={mockOnKeyDown} />
      </TestWrapper>
    );

    // data-filter-cell属性を持つ要素を取得
    const filterCell = document.querySelector('[data-filter-cell="true"]');
    expect(filterCell).toBeInTheDocument();

    if (filterCell) {
      // フィルターセル全体でキーダウンイベントを発火
      fireEvent.keyDown(filterCell, { key: "a" });

      // CustomHeaderCellのonKeyDownが呼ばれないことを確認
      expect(mockOnKeyDown).not.toHaveBeenCalled();
    }
  });

  it("編集モードに入るキー操作が正常に動作すること", () => {
    const mockOnHeaderEdit = vi.fn();

    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} onHeaderEdit={mockOnHeaderEdit} />
      </TestWrapper>
    );

    const headerText = screen.getByText("テストカラム");

    // F2キーで編集モードに入る
    fireEvent.keyDown(headerText, { key: "F2" });

    // テキストエリアが表示されることを確認
    const textarea = screen.getByDisplayValue("テストカラム");
    expect(textarea).toBeInTheDocument();
  });

  it("ソート情報が正しく表示されること", () => {
    render(
      <TestWrapper>
        <CustomHeaderCell {...defaultProps} sortDirection="ASC" priority={1} />
      </TestWrapper>
    );

    expect(screen.getByText("テストカラム")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // priority
  });
});
