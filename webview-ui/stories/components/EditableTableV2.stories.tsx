import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, expect } from "storybook/test";
import { EditableTableV2 } from "@/components/EditableTableV2";

const meta = {
  title: "components/EditableTableV2",
  component: EditableTableV2,
  args: {
    csvArray: [
      ["A", "B", "CCCCCCCCCCCCCCCCC", "D", "E"],
      ["1", "11", "111", "1111", "1\n1\n1\n1\n1"],
      ["2", "22", "222", "2222", "22222"],
      ["", "", "", "", ""],
      ["3", "33", "333", "3333", "33333"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["4", "44", "444", "4444", "44444"],
      ["", "", "", "", ""],
    ],
    theme: "light",
    setCSVArray: fn(),
    onApply: fn(),
  },
} satisfies Meta<typeof EditableTableV2>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeInTheDocument();
  },
};

export const Light: Story = {
  args: {
    theme: "light",
  },
};

export const Dark: Story = {
  args: {
    theme: "dark",
  },
};

export const EmptyData: Story = {
  args: {
    csvArray: [["Column 1", "Column 2", "Column 3"]],
  },
};

export const LargeDataset: Story = {
  args: {
    csvArray: [
      ["ID", "Name", "Email", "Department", "Salary", "StartDate", "Status"],
      ...Array.from({ length: 100 }, (_, i) => [
        String(i + 1),
        `Employee ${i + 1}`,
        `employee${i + 1}@company.com`,
        ["Engineering", "Marketing", "Sales", "HR"][i % 4],
        String(50000 + i * 1000),
        `2023-0${(i % 12) + 1}-01`,
        ["Active", "Inactive"][i % 2],
      ]),
    ],
  },
};

export const JapaneseData: Story = {
  args: {
    csvArray: [
      ["名前", "年齢", "都市", "国"],
      ["田中太郎", "30", "東京", "日本"],
      ["佐藤花子", "25", "大阪", "日本"],
      ["鈴木一郎", "35", "名古屋", "日本"],
      ["高橋美子", "28", "福岡", "日本"],
      ["渡辺健太", "32", "札幌", "日本"],
    ],
  },
};

export const Empty: Story = {
  args: {
    csvArray: [],
  },
};
