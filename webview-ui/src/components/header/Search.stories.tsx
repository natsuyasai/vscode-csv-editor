import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, expect, within } from "storybook/test";
import { Search } from "@/components/header/Search";

const meta = {
  title: "components/header/Search",
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

export const StatusTextOverride: Story = {
  name: "状態表示を差し替えられる",
  args: {
    isMatching: false,
    canNavigate: true,
    statusText: "見つかりません",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("見つかりません")).toBeVisible();
    const textbox = canvasElement.querySelector("vscode-textfield");
    const input = textbox?.shadowRoot?.querySelector("input");
    await userEvent.type(input!, "abc");
    // 一致件数が無くても canNavigate なら前へ/次へを押せる
    await userEvent.click(canvas.getByRole("button", { name: "Next search result" }));
    await expect(args.onNext).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: "Previous search result" }));
    await expect(args.onPrevious).toHaveBeenCalledTimes(1);
  },
};
