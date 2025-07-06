import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, waitFor } from "@storybook/test";
import App from "../../src/App";

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

// サンプルCSVデータ
const sampleCSVData = `Name,Age,City,Occupation
Alice,28,Tokyo,Engineer
Bob,35,Osaka,Designer
Charlie,42,Kyoto,Manager
Diana,31,Yokohama,Developer
Eve,29,Kobe,Analyst`;

function setInitData() {
  // 初期データを設定
  window.postMessage(
    {
      type: "update",
      payload: sampleCSVData,
    },
    "*"
  );
}

function waitReadyForGrid(target: HTMLElement, timeout = 3000) {
  return waitFor(
    async () => {
      const canvas = within(target);
      const gridcells = canvas.getAllByRole("gridcell");
      return await expect(gridcells.length > 0).toBeTruthy();
    },
    { timeout }
  );
}

export const ThemeSupport: Story = {
  name: "ダークモード対応",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // 初期状態（ライトテーマ）の確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toHaveClass("rdg-light");

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

    await waitFor(
      async () => {
        const updatedGrid = canvas.getByRole("grid");
        // react-data-gridとEditableTableの実装に基づいたクラス確認
        await expect(updatedGrid).toHaveClass("rdg");
        // ダークテーマクラスの存在確認（実装に依存）
        const hasThemeClass =
          updatedGrid.className.includes("rdg-dark") ||
          !updatedGrid.className.includes("rdg-light");
        await expect(hasThemeClass).toBe(true);
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

    await waitFor(
      async () => {
        const lightGrid = canvas.getByRole("grid");
        await expect(lightGrid).toHaveClass("rdg-light");
        return true;
      },
      { timeout: 2000 }
    );
  },
};
