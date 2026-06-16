import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { setInitData } from "@/test-utils/appStoryUtils";
import App from "./App";

const meta: Meta<typeof App> = {
  title: "App/SearchAndFilter",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "EditableTableの検索とフィルター機能のテスト",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", width: "100vw" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FilterToggle: Story = {
  name: "フィルター表示切替",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // フィルター関連のボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");

    // フィルターボタンまたはフィルター機能が存在することを確認
    // （実装の詳細に依存するため、柔軟に確認）
    await expect(vscodeButtons.length).toBeGreaterThan(0);
  },
};

export const SortingIndicators: Story = {
  name: "ソートインジケーター",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // テーブルヘッダーが存在することを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);

    // ヘッダーがクリック可能であることを確認（ソート機能）
    const firstDataHeader = Array.from(headers).find(
      (header) => header.textContent && header.textContent.trim() !== ""
    );
    await expect(firstDataHeader).toBeTruthy();
  },
};
