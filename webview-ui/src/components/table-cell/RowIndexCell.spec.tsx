import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { describe, expect, it, vi } from "vitest";
import { RowIndexCellProps } from "@/components/editable-table/types";
import { RowIndexCell } from "@/components/table-cell/RowIndexCell";

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

    const cell = screen.getByText("1");
    await user.click(cell);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onSelect when Enter key is pressed", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const props = createMockProps({ onSelect: mockOnSelect });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
    cell.focus();
    await user.keyboard("{Enter}");

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onSelect when Space key is pressed", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    const props = createMockProps({ onSelect: mockOnSelect });

    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
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

    const cell = screen.getByText("1");
    await user.pointer({ keys: "[MouseRight]", target: cell });

    expect(mockOnContextMenu).toHaveBeenCalledTimes(1);
    expect(mockOnContextMenu).toHaveBeenCalledWith(expect.any(Object), 2);
  });

  it("should render with selected prop", () => {
    const props = createMockProps({ isSelected: true });
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
    // スタイルは実装の詳細なので、要素の存在のみ確認
    expect(cell).toBeInTheDocument();
  });

  it("should render with non-selected prop", () => {
    const props = createMockProps({ isSelected: false });
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
    expect(cell).toBeInTheDocument();
  });

  it("should render as button", () => {
    const props = createMockProps();
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
    expect(cell).toBeInTheDocument();
  });

  it("should not be keyboard accessible", () => {
    const props = createMockProps();
    render(<RowIndexCellWithDnd {...props} />);

    const cell = screen.getByText("1");
    expect(cell).toHaveAttribute("tabIndex", "-1");
  });
});

describe("RowIndexCell ドラッグ&ドロップの有効/無効", () => {
  const renderTwoCells = (isDragDisabled: boolean | undefined) => {
    const onRowReorder = vi.fn();
    render(
      <DndProvider backend={HTML5Backend}>
        <RowIndexCell
          {...createMockProps({
            rowIndex: 0,
            getValue: (() => "first") as never,
            onRowReorder,
            isDragDisabled,
          })}
        />
        <RowIndexCell
          {...createMockProps({
            rowIndex: 1,
            getValue: (() => "second") as never,
            onRowReorder,
            isDragDisabled,
          })}
        />
      </DndProvider>
    );
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "all",
      dropEffect: "move",
      types: [],
    };
    const source = screen.getByText("first");
    const target = screen.getByText("second");
    // dragstart が受理されない(preventDefaultされる)場合、ブラウザは以降のdrag系イベントを発火しない
    const isDragStarted = fireEvent.dragStart(source, { dataTransfer });
    if (isDragStarted) {
      fireEvent.dragEnter(target, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });
      fireEvent.dragEnd(source, { dataTransfer });
    }
    return { onRowReorder, isDragStarted };
  };

  it("通常時はドロップで onRowReorder が呼ばれる", () => {
    const { onRowReorder, isDragStarted } = renderTwoCells(false);
    expect(isDragStarted).toBe(true);
    expect(onRowReorder).toHaveBeenCalledWith(0, 1);
  });

  it("isDragDisabled のときはドラッグが開始されず onRowReorder も呼ばれない", () => {
    const { onRowReorder, isDragStarted } = renderTwoCells(true);
    expect(isDragStarted).toBe(false);
    expect(onRowReorder).not.toHaveBeenCalled();
  });
});
