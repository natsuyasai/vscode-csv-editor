import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, expect } from "@storybook/test";

import { Header } from "@/components/Header";
import { useState } from "react";
import { RowSizeType } from "@/types";

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

export const OpenSlectRow: Story = {
  play: async ({ canvas }) => {
    const listbox = canvas.getByRole("listbox");
    const listItem = listbox.shadowRoot?.querySelector("div[class*='select-face']");
    expect(listItem).toBeVisible();
    await userEvent.click(listItem!);
    const option = listbox.shadowRoot?.querySelector("div[class*=' dropdown ']");
    expect(option).toBeVisible();
  },
};
