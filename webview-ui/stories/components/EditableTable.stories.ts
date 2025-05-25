import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { EditableTable } from "@/components/EditableTable";

const meta = {
  title: "components/EditableTable",
  component: EditableTable,
  args: {
    csvArray: [
      ["A", "B", "C", "D", "E"],
      ["1", "11", "111", "1111", "1\n1\n1\n1\n1"],
      ["2", "22", "222", "2222", "22222"],
      ["", "", "", "", ""],
      ["3", "33", "333", "3333", "33333"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["4", "44", "444", "4444", "44444"],
      ["", "", "", "", ""],
    ],
    isIgnoreHeaderRow: false,
    rowSize: "normal",
    setCSVArray: fn(),
  },
} satisfies Meta<typeof EditableTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IgnoreHeader: Story = {
  args: {
    isIgnoreHeaderRow: true,
  },
};

export const RowSize_small: Story = {
  args: {
    rowSize: "small",
  },
};

export const RowSize_normal: Story = {
  args: {
    rowSize: "normal",
  },
};

export const RowSize_large: Story = {
  args: {
    rowSize: "large",
  },
};

export const RowSize_extra_large: Story = {
  args: {
    rowSize: "extra large",
  },
};

export const Empty: Story = {
  args: {
    csvArray: [],
    isIgnoreHeaderRow: false,
  },
};
