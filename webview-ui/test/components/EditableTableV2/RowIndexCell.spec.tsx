import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { describe, expect, it, vi } from "vitest";
import { RowIndexCell } from "@/components/EditableTableV2/RowIndexCell";
import type { RowIndexCellProps } from "@/components/EditableTableV2/types";

// モックのpropsを作成するヘルパー関数
const createMockProps = (overrides?: Partial<RowIndexCellProps>): RowIndexCellProps => ({
  isSelected: false,
  onSelect: vi.fn(),
  rowIndex: 0,
  getValue: (() => "1") as never,
  row: {} as never,
  column: {} as never,
  table: {} as never,
  cell: {} as never,
  renderValue: () => "1" as never,
  ...overrides,
});

// DndProviderでラップするヘルパーコンポーネント
const RowIndexCellWithDnd = (props: RowIndexCellProps) => (
  <DndProvider backend={HTML5Backend}>
    <RowIndexCell {...props} />
  </DndProvider>
);

describe("RowIndexCell", () => {
  it("should render row index value", () => {
    const props = createMockProps({ getValue: (() => "5") as never });
    render(<RowIndexCellWithDnd {...props} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should call onSelect when clicked", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const props = createMockProps({ onSelect: mockOnSelect });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    await user.click(cell);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onSelect when Enter key is pressed", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const props = createMockProps({ onSelect: mockOnSelect });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard("{Enter}");

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onSelect when Space key is pressed", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const props = createMockProps({ onSelect: mockOnSelect });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard(" ");

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onContextMenu when right-clicked", async () => {
    const user = userEvent.setup();
    const mockOnContextMenu = vi.fn();
    const props = createMockProps({
      onContextMenu: mockOnContextMenu,
      rowIndex: 2,
    });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    await user.pointer({ keys: "[MouseRight]", target: cell });

    expect(mockOnContextMenu).toHaveBeenCalledTimes(1);
    expect(mockOnContextMenu).toHaveBeenCalledWith(expect.any(Object), 2);
  });

  it("should render with selected prop", () => {
    const props = createMockProps({ isSelected: true });
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    // スタイルは実装の詳細なので、要素の存在のみ確認
    expect(cell).toBeInTheDocument();
  });

  it("should render with non-selected prop", () => {
    const props = createMockProps({ isSelected: false });
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    expect(cell).toBeInTheDocument();
  });

  it("should render as button", () => {
    const props = createMockProps();
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    expect(cell).toBeInTheDocument();
  });

  it("should be keyboard accessible", () => {
    const props = createMockProps();
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByRole("button");
    expect(cell).toHaveAttribute("tabIndex", "0");
  });
});
