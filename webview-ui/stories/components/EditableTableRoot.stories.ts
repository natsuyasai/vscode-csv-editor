import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { EditableTableRoot } from "@/components/EditableTableRoot";

const meta = {
  title: "components/EditableTableRoot",
  component: EditableTableRoot,
  args: {
    csvArray: [
      ["A", "B", "C", "D", "E"],
      ["1", "11", "111", "1111", "11111"],
      ["2", "22", "222", "2222", "22222"],
      ["", "", "", "", ""],
      ["3", "33", "333", "3333", "33333"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["4", "44", "444", "4444", "44444"],
      ["", "", "", "", ""],
    ],
    isIgnoreHeaderRow: false,
    setCSVArray: fn(),
  },
} satisfies Meta<typeof EditableTableRoot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IgnoreHeader: Story = {
  args: {
    isIgnoreHeaderRow: true,
  },
};
export const Empty: Story = {
  args: {
    csvArray: [],
    isIgnoreHeaderRow: false,
  },
};
