import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { setInitData } from "@/test-utils/appStoryUtils";
import App from "./App";

const meta: Meta<typeof App> = {
  title: "App/DragAndDrop",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "EditableTableのドラッグ&ドロップとコンテキストメニュー機能のテスト",
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

export const DraggableElements: Story = {
  name: "ドラッグ可能要素の確認",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 行番号セル（ドラッグ可能）が存在することを確認
    const tbody = canvasElement.querySelector("tbody");
    await expect(tbody).toBeTruthy();

    // 列ヘッダー（ドラッグ可能）が存在することを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);
  },
};

export const RowColumnButtons: Story = {
  name: "行/列の追加削除ボタン",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 行と列の追加/削除ボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map((btn) => btn.textContent?.trim());

    const hasRowAddButton = buttonTexts.some((text) => text?.includes("行を追加"));
    const hasRowDeleteButton = buttonTexts.some((text) => text?.includes("行を削除"));
    const hasColumnAddButton = buttonTexts.some((text) => text?.includes("列を追加"));
    const hasColumnDeleteButton = buttonTexts.some((text) => text?.includes("列を削除"));

    await expect(hasRowAddButton).toBeTruthy();
    await expect(hasRowDeleteButton).toBeTruthy();
    await expect(hasColumnAddButton).toBeTruthy();
    await expect(hasColumnDeleteButton).toBeTruthy();
  },
};
