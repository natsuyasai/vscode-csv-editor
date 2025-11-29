import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { expect, userEvent, within } from "storybook/test";
import { RowIndexCell } from "@/components/EditableTable/RowIndexCell";
import type { RowIndexCellProps } from "@/components/EditableTable/types";

const meta: Meta<typeof RowIndexCell> = {
  title: "EditableTable/RowIndexCell",
  component: RowIndexCell,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "行番号を表示するセル。行の選択、ドラッグ&ドロップによる行の並び替え、コンテキストメニューの表示をサポートします。",
      },
    },
  },
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div style={{ width: "60px", height: "40px" }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// モックのpropsを作成
const createMockProps = (overrides?: Partial<RowIndexCellProps>): RowIndexCellProps => ({
  isSelected: false,
  onSelect: () => console.log("Row selected"),
  rowIndex: 0,
  getValue: (() => "1") as never,
  row: {} as never,
  column: {} as never,
  table: {} as never,
  cell: {} as never,
  renderValue: () => "1" as never,
  ...overrides,
});

/**
 * デフォルトの行番号セル
 */
export const Default: Story = {
  args: createMockProps(),
};

/**
 * 選択された状態の行番号セル
 */
export const Selected: Story = {
  args: createMockProps({
    isSelected: true,
    getValue: (() => "5") as never,
  }),
};

/**
 * 異なる行番号
 */
export const DifferentRowNumbers: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map((num) => (
        <div key={num} style={{ width: "60px", height: "40px" }}>
          <RowIndexCell
            {...createMockProps({ getValue: (() => String(num)) as never, rowIndex: num - 1 })}
          />
        </div>
      ))}
    </div>
  ),
};

/**
 * クリックインタラクションのテスト
 */
export const ClickInteraction: Story = {
  args: createMockProps(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 行番号セルを取得
    const cell = canvas.getByText("1");
    await expect(cell).toBeInTheDocument();

    // クリック
    await userEvent.click(cell);
  },
};

/**
 * キーボード操作のテスト
 */
export const KeyboardInteraction: Story = {
  args: createMockProps(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByText("1");
    cell.focus();

    // Enterキー
    await userEvent.keyboard("{Enter}");

    // フォーカスを再設定
    cell.focus();

    // Spaceキー
    await userEvent.keyboard(" ");
  },
};

// 選択状態の切り替えコンポーネント
const SelectionToggleWrapper = () => {
  const [isSelected, setIsSelected] = React.useState(false);

  return (
    <RowIndexCell
      {...createMockProps({
        isSelected,
        onSelect: () => setIsSelected(!isSelected),
      })}
    />
  );
};

/**
 * 選択状態の切り替え
 */
export const SelectionToggle: Story = {
  render: () => <SelectionToggleWrapper />,
};
