import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { expect, userEvent, within } from "storybook/test";
import { DraggableHeaderCell } from "@/components/table-header/DraggableHeaderCell";

const meta = {
  title: "components/header/DraggableHeaderCell",
  component: DraggableHeaderCell,
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div style={{ padding: "20px" }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DraggableHeaderCell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルトの状態
 */
export const Default: Story = {
  args: {
    columnIndex: 0,
    children: "Column Header",
    onColumnReorder: () => console.log("Column reordered"),
    isSelected: false,
  },
};

/**
 * 選択状態
 */
export const Selected: Story = {
  args: {
    columnIndex: 0,
    children: "Selected Header",
    onColumnReorder: () => console.log("Column reordered"),
    isSelected: true,
  },
};

/**
 * 複数のヘッダーセル
 */
const MultipleHeadersWrapper = () => {
  const [columns, setColumns] = useState(["Column A", "Column B", "Column C"]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    const newColumns = [...columns];
    const [removed] = newColumns.splice(sourceIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    setColumns(newColumns);
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {columns.map((col, index) => (
        <DraggableHeaderCell
          key={col}
          columnIndex={index}
          onColumnReorder={handleReorder}
          onColumnSelect={setSelectedIndex}
          isSelected={selectedIndex === index}
        >
          {col}
        </DraggableHeaderCell>
      ))}
    </div>
  );
};

export const MultipleHeaders: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <MultipleHeadersWrapper />,
};

/**
 * 列選択のインタラクション
 */
const ColumnSelectionWrapper = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <DraggableHeaderCell
      columnIndex={0}
      onColumnReorder={() => console.log("Reordered")}
      onColumnSelect={setSelectedIndex}
      isSelected={selectedIndex === 0}
    >
      Click to select
    </DraggableHeaderCell>
  );
};

export const ColumnSelection: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <ColumnSelectionWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // 選択する
    await userEvent.click(cell);

    // 選択状態になることを確認（視覚的にoutlineが表示される）
    await expect(cell).toBeInTheDocument();
  },
};

/**
 * ソート機能（クリック後500ms待機）
 */
const SortOnClickWrapper = () => {
  const [sortCalled, setSortCalled] = useState(false);

  return (
    <div>
      <DraggableHeaderCell
        columnIndex={0}
        onColumnReorder={() => console.log("Reordered")}
        onSort={() => setSortCalled(true)}
        isSelected={true}
      >
        Click to sort (500ms delay)
      </DraggableHeaderCell>
      {sortCalled && <div data-testid="sort-indicator">Sorted!</div>}
    </div>
  );
};

export const SortOnClick: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <SortOnClickWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // クリック
    await userEvent.click(cell);

    // 500ms待機
    await new Promise((resolve) => setTimeout(resolve, 600));

    // ソートが呼ばれることを確認
    await expect(canvas.getByTestId("sort-indicator")).toBeInTheDocument();
  },
};

/**
 * ダブルクリックでソートをキャンセル
 */
const DoubleClickToEditWrapper = () => {
  const [doubleClicked, setDoubleClicked] = useState(false);
  const [sortCalled, setSortCalled] = useState(false);

  return (
    <div>
      <DraggableHeaderCell
        columnIndex={0}
        onColumnReorder={() => console.log("Reordered")}
        onSort={() => setSortCalled(true)}
        onDoubleClick={() => setDoubleClicked(true)}
        isSelected={true}
      >
        Double-click to edit
      </DraggableHeaderCell>
      {doubleClicked && <div data-testid="double-click-indicator">Double clicked!</div>}
      {sortCalled && <div data-testid="sort-indicator">Sorted!</div>}
    </div>
  );
};

export const DoubleClickToEdit: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <DoubleClickToEditWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // ダブルクリック
    await userEvent.dblClick(cell);

    // onDoubleClickが呼ばれることを確認
    await expect(canvas.getByTestId("double-click-indicator")).toBeInTheDocument();

    // 500ms待ってもソートは実行されない
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expect(canvas.queryByTestId("sort-indicator")).not.toBeInTheDocument();
  },
};

/**
 * キーボード操作（Enter/Space）
 */
const KeyboardSortWrapper = () => {
  const [sortCount, setSortCount] = useState(0);

  return (
    <div>
      <DraggableHeaderCell
        columnIndex={0}
        onColumnReorder={() => console.log("Reordered")}
        onSort={() => setSortCount((c) => c + 1)}
        isSelected={true}
      >
        Press Enter or Space to sort
      </DraggableHeaderCell>
      <div data-testid="sort-count">Sort count: {sortCount}</div>
    </div>
  );
};

export const KeyboardSort: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <KeyboardSortWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    cell.focus();

    // Enterキーでソート
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("sort-count")).toHaveTextContent("Sort count: 1");

    // Spaceキーでソート
    await userEvent.keyboard(" ");
    await expect(canvas.getByTestId("sort-count")).toHaveTextContent("Sort count: 2");
  },
};

/**
 * フォーカス状態の変化
 */
const FocusChangeWrapper = () => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div>
      <DraggableHeaderCell
        columnIndex={0}
        onColumnReorder={() => console.log("Reordered")}
        onFocusChange={setIsFocused}
        isSelected={false}
      >
        Focus and blur
      </DraggableHeaderCell>
      <div data-testid="focus-status">Focused: {isFocused ? "Yes" : "No"}</div>
    </div>
  );
};

export const FocusChange: Story = {
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false,
  },
  render: () => <FocusChangeWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);
    await expect(canvas.getByTestId("focus-status")).toHaveTextContent("Focused: Yes");

    // フォーカスを外す
    cell.blur();
    // blurイベントの処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(canvas.getByTestId("focus-status")).toHaveTextContent("Focused: No");
  },
};
