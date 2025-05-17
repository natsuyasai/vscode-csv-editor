import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { Header } from "@/components/Header";

const meta = {
  title: "components/Header",
  component: Header,
  args: {
    isIgnoreHeaderRow: false,
    onUpdateIgnoreHeaderRow: fn(),
    onClickApply: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isIgnoreHeaderRow: false,
  },
};
