import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, expect } from "@storybook/test";

import { Search } from "@/components/Search";
import { useState } from "react";
import { RowSizeType } from "@/types";

const meta = {
  title: "components/Search",
  component: Search,
  args: {
    onSearch: fn(),
    onNext: fn(),
    onPrevious: fn(),
    onClose: fn(),
  },
  render: function Render(args) {
    return <Search {...args}></Search>;
  },
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
