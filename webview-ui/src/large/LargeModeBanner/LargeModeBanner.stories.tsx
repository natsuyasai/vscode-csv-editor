import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { LargeModeBanner } from "@/large/LargeModeBanner/LargeModeBanner";

const RESTRICTIONS = ["列の挿入・削除", "行・列のドラッグ&ドロップによる並び替え", "オートフィル"];

const meta: Meta<typeof LargeModeBanner> = {
  title: "Large/LargeModeBanner",
  component: LargeModeBanner,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    restrictions: RESTRICTIONS,
    encoding: "UTF-8",
    indexingRatio: null,
  },
};

export default meta;
type Story = StoryObj<typeof LargeModeBanner>;

export const Default: Story = {
  name: "デフォルト",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("大容量モード（一部機能制限中）")).toBeVisible();
    await expect(canvas.getByText("文字コード: UTF-8")).toBeVisible();
    await expect(canvas.queryByRole("progressbar")).not.toBeInTheDocument();
  },
};

export const Indexing: Story = {
  name: "インデックス作成中",
  args: { indexingRatio: 0.45 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const progress = canvas.getByRole("progressbar", { name: "行インデックスを作成中" });
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute("value", "45");
    await expect(canvas.getByText("行インデックスを作成中 45%")).toBeVisible();
  },
};

export const RestrictionsOpen: Story = {
  name: "制限一覧を開いた状態",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "制限している機能" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const list = canvas.getByRole("list", { name: "制限している機能" });
    await expect(list).toBeVisible();
    for (const name of RESTRICTIONS) {
      await expect(within(list).getByText(name)).toBeVisible();
    }

    // 閉じてからもう一度開いた状態にしてカタログに残す
    await userEvent.click(toggle);
    await expect(canvas.queryByRole("list")).not.toBeInTheDocument();
    await userEvent.click(toggle);
    await expect(canvas.getByRole("list", { name: "制限している機能" })).toBeVisible();
  },
};

export const WithActions: Story = {
  name: "操作スロット（ソートのキャンセル等を2-3で置く）",
  args: {
    actions: (
      <button type="button" onClick={() => undefined}>
        キャンセル
      </button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "キャンセル" })).toBeVisible();
  },
};

export const LightTheme: Story = {
  name: "ライトテーマ",
  args: { indexingRatio: 0.3 },
  decorators: [
    (Story) => (
      <div data-theme="light">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("progressbar")).toBeVisible();
  },
};

export const DarkTheme: Story = {
  name: "ダークテーマ",
  args: { indexingRatio: 0.3 },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e" }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("大容量モード（一部機能制限中）")).toBeVisible();
    await expect(canvas.getByRole("progressbar")).toBeVisible();
  },
};
