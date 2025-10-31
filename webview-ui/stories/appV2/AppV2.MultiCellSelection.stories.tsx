import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import AppV2 from "../../src/AppV2";
import { setInitData } from "../app/utils";

const meta: Meta<typeof AppV2> = {
  title: "AppV2/MultiCellSelection",
  component: AppV2,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "EditableTableV2の複数セル選択機能のテスト",
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

export const MultipleSelection: Story = {
  name: "複数セル選択",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 複数セル選択のボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map(btn => btn.textContent?.trim());

    const hasBulkEditButton = buttonTexts.some(text => text?.includes("一括編集"));
    await expect(hasBulkEditButton).toBeTruthy();
  },
};

export const CopyPasteButtons: Story = {
  name: "コピー&ペーストボタン",
  play: async ({ canvasElement }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // コピーとペーストのボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map(btn => btn.textContent?.trim());

    const hasCopyButton = buttonTexts.some(text => text?.includes("コピー"));
    const hasPasteButton = buttonTexts.some(text => text?.includes("ペースト"));

    await expect(hasCopyButton).toBeTruthy();
    await expect(hasPasteButton).toBeTruthy();
  },
};
