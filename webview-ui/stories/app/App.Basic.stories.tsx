import type { Meta, StoryObj } from "@storybook/react";
import { expect, within, waitFor } from "@storybook/test";
import App from "../../src/App";

const meta: Meta<typeof App> = {
  title: "App/Basic",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor の基本表示機能",
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

const COL_MAX = 4;
const COL_MAX_WITH_HEADER = COL_MAX + 1; // 行番号を含む
const ROW_MAX = 5;

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

export const Default: Story = {
  name: "基本表示",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();

    await waitReadyForGrid(canvasElement);

    // 列ヘッダー（columnheader）が正しく表示されることを確認
    const columnHeaders = canvas.getAllByRole("columnheader");
    await expect(columnHeaders).toHaveLength(COL_MAX_WITH_HEADER); // 行番号 + 4つのデータ列

    // 具体的なヘッダーテキストを確認
    await expect(canvas.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "City" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "Occupation" })).toBeInTheDocument();

    // データ行（row）が正しく表示されることを確認
    const rows = canvas.getAllByRole("row");
    await expect(rows).toHaveLength(1 + ROW_MAX); // ヘッダー行 + 5つのデータ行

    // gridcellの内容を確認
    await expect(canvas.getByRole("gridcell", { name: "Alice" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Bob" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Charlie" })).toBeInTheDocument();
  },
};
