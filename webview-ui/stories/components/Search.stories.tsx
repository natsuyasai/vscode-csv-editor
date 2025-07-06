import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, expect } from "@storybook/test";
import { Search } from "@/components/Search";

const meta = {
  title: "components/Search",
  component: Search,
  args: {
    isMatching: false,
    machedCount: 0,
    searchedSelectedItemIdx: 0,
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

export const Matching: Story = {
  args: {
    isMatching: true,
    machedCount: 3,
    searchedSelectedItemIdx: 1,
  },
  play: async ({ canvasElement }) => {
    const textbox = canvasElement.querySelector("vscode-textfield");
    const input = textbox?.shadowRoot?.querySelector("input");
    await expect(input).toBeVisible();
    await userEvent.type(input!, "test");
  },
};
