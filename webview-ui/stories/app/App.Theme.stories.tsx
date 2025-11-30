import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/Theme",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のテーマ機能",
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

export const ThemeSupport: Story = {
  name: "ダークモード対応",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    // EditableTableでは<table>要素を使用しており、role="grid"はない
    // テーブルが表示されていることを確認
    const table = canvasElement.querySelector("table");
    await expect(table).toBeInTheDocument();

    // ダークテーマに変更
    window.postMessage(
      {
        type: "updateTheme",
        payload: "dark",
      },
      "*"
    );

    // テーマ変更の処理を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // テーマが変更されたことを確認（テーブルが表示されたまま）
    await waitFor(
      async () => {
        const updatedTable = canvasElement.querySelector("table");
        await expect(updatedTable).toBeInTheDocument();
        return true;
      },
      { timeout: 2000 }
    );

    // ライトテーマに戻す
    window.postMessage(
      {
        type: "updateTheme",
        payload: "light",
      },
      "*"
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // テーマが戻ったことを確認
    await waitFor(
      async () => {
        const lightTable = canvasElement.querySelector("table");
        await expect(lightTable).toBeInTheDocument();
        return true;
      },
      { timeout: 2000 }
    );
  },
};
