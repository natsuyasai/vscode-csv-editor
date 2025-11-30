import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import App from "../../src/App";
import { setInitData } from "../app/utils";

const meta: Meta<typeof App> = {
  title: "App/Basic",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "EditableTableを使用したVSCode CSV Editor の基本表示機能",
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

export const Default: Story = {
  name: "基本表示",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // テーブルが存在することを確認
    const tables = canvasElement.querySelectorAll("table");
    await expect(tables.length).toBeGreaterThan(0);

    // ヘッダーが表示されることを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);

    // データ行が表示されることを確認
    const rows = canvasElement.querySelectorAll("tbody tr");
    await expect(rows.length).toBeGreaterThan(0);
  },
};

export const WithData: Story = {
  name: "データあり表示",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Name列のデータを確認
    const nameCell = canvasElement.textContent;
    await expect(nameCell).toContain("Alice");
    await expect(nameCell).toContain("Bob");
    await expect(nameCell).toContain("Charlie");
  },
};
