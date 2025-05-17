import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { Header, RowSizeType } from "@/components/Header";
import { useState } from "react";

const meta = {
  title: "components/Header",
  component: Header,
  args: {
    isIgnoreHeaderRow: false,
    onUpdateIgnoreHeaderRow: fn(),
    rowSize: "normal",
    onUpdateRowSize: fn(),
    onClickApply: fn(),
  },
  render: function Render(args) {
    const [rowSize, setRowSize] = useState<RowSizeType>("normal");
    return <Header {...args} rowSize={rowSize} onUpdateRowSize={setRowSize}></Header>;
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isIgnoreHeaderRow: false,
  },
};
