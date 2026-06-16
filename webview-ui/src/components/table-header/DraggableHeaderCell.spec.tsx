import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { describe, expect, it, vi } from "vitest";
import { DraggableHeaderCell } from "./DraggableHeaderCell";

describe("DraggableHeaderCell", () => {
  const defaultProps = {
    columnIndex: 0,
    children: "Column Header",
    onColumnReorder: vi.fn(),
    isSelected: false,
  };

  const renderWithDnd = (props = defaultProps) => {
    return render(
      <DndProvider backend={HTML5Backend}>
        <DraggableHeaderCell {...props} />
      </DndProvider>
    );
  };

  it("子要素を正しくレンダリングする", () => {
    renderWithDnd();
    expect(screen.getByText("Column Header")).toBeInTheDocument();
  });

  it("選択状態でない場合、クリックするとonColumnSelectが呼ばれる", async () => {
    const user = userEvent.setup();
    const onColumnSelect = vi.fn();
    const props = {
      ...defaultProps,
      isSelected: false,
      onColumnSelect,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    // まずフォーカスを当てる
    await user.click(cell);
    // 次にクリックすると選択される
    await user.click(cell);

    expect(onColumnSelect).toHaveBeenCalledWith(0);
  });

  it("選択状態の場合、クリックするとonSortが呼ばれる（500ms後）", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const props = {
      ...defaultProps,
      isSelected: true,
      onSort,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    // フォーカスを当ててからクリック
    await user.click(cell);
    await user.click(cell);

    // 500ms待機
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(onSort).toHaveBeenCalled();
  });

  it("ダブルクリックするとonDoubleClickが呼ばれ、ソートは実行されない", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const onDoubleClick = vi.fn();
    const props = {
      ...defaultProps,
      isSelected: true,
      onSort,
      onDoubleClick,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    // フォーカスを当ててからダブルクリック
    await user.click(cell);
    await user.dblClick(cell);

    expect(onDoubleClick).toHaveBeenCalled();

    // 500ms待ってもソートは実行されないことを確認
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(onSort).not.toHaveBeenCalled();
  });

  it("Enter/Spaceキーを押すと、フォーカス&選択状態の場合のみonSortが呼ばれる", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const props = {
      ...defaultProps,
      isSelected: true,
      onSort,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    // フォーカスを当てる
    cell.focus();

    await user.keyboard("{Enter}");
    expect(onSort).toHaveBeenCalledTimes(1);

    await user.keyboard(" ");
    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it("選択状態でない場合、Enter/Spaceキーを押してもonSortは呼ばれない", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const props = {
      ...defaultProps,
      isSelected: false,
      onSort,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    cell.focus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onSort).not.toHaveBeenCalled();
  });

  it("フォーカス時にonFocusChangeが呼ばれる", async () => {
    const user = userEvent.setup();
    const onFocusChange = vi.fn();
    const props = {
      ...defaultProps,
      onFocusChange,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    await user.click(cell);

    expect(onFocusChange).toHaveBeenCalledWith(true);
  });

  it("ブラー時にonFocusChangeが呼ばれる", () => {
    const onFocusChange = vi.fn();
    const props = {
      ...defaultProps,
      onFocusChange,
    };

    renderWithDnd(props);
    const cell = screen.getByRole("button");

    cell.focus();
    cell.blur();

    expect(onFocusChange).toHaveBeenCalledWith(false);
  });

  it("role=button とtabIndex=0 が設定されている（アクセシビリティ）", () => {
    renderWithDnd();
    const cell = screen.getByRole("button");

    expect(cell).toHaveAttribute("tabIndex", "0");
  });
});
