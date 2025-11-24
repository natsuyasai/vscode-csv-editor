import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { FilterInput } from "@/components/EditableTable/FilterInput";

const meta: Meta<typeof FilterInput> = {
  title: "EditableTable/FilterInput",
  component: FilterInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "列のフィルタリングを行うための入力フィールド。ユーザーが入力したテキストに基づいて列の値をフィルタリングします。",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// コンポーネントラッパー（状態管理のため）
const FilterInputWrapper = () => {
  const [filterValue, setFilterValue] = useState<string>("");

  const column = {
    getFilterValue: () => filterValue,
    setFilterValue: (value: string) => setFilterValue(value),
  };

  return (
    <div style={{ width: "200px" }}>
      <FilterInput column={column} />
      <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
        Current filter: {filterValue || "(empty)"}
      </div>
    </div>
  );
};

/**
 * デフォルトのフィルター入力フィールド
 */
export const Default: Story = {
  render: () => <FilterInputWrapper />,
};

// コンポーネントラッパー（初期値あり）
const FilterInputWithValueWrapper = () => {
  const [filterValue, setFilterValue] = useState<string>("initial value");

  const column = {
    getFilterValue: () => filterValue,
    setFilterValue: (value: string) => setFilterValue(value),
  };

  return (
    <div style={{ width: "200px" }}>
      <FilterInput column={column} />
      <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
        Current filter: {filterValue}
      </div>
    </div>
  );
};

/**
 * フィルター値が初期値として設定されている場合
 */
export const WithInitialValue: Story = {
  render: () => <FilterInputWithValueWrapper />,
};

/**
 * テキスト入力のインタラクションテスト
 */
export const TextInput: Story = {
  render: () => <FilterInputWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 入力フィールドを取得
    const input = canvas.getByPlaceholderText("フィルター...");
    await expect(input).toBeInTheDocument();

    // テキストを入力
    await userEvent.type(input, "test");

    // 入力値が反映されていることを確認
    await expect(input).toHaveValue("test");
  },
};

/**
 * クリアのインタラクションテスト
 */
export const ClearInput: Story = {
  render: () => <FilterInputWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = canvas.getByPlaceholderText("フィルター...");

    // テキストを入力
    await userEvent.type(input, "test value");
    await expect(input).toHaveValue("test value");

    // クリア
    await userEvent.clear(input);
    await expect(input).toHaveValue("");
  },
};

/**
 * 日本語入力のテスト
 */
export const JapaneseInput: Story = {
  render: () => <FilterInputWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = canvas.getByPlaceholderText("フィルター...");

    // 日本語を入力
    await userEvent.type(input, "テスト");
    await expect(input).toHaveValue("テスト");
  },
};
