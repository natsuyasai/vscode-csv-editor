import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid, COL_MAX } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/SearchFilter",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor の検索・フィルター機能",
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

export const KeyboardShortcuts: Story = {
  name: "検索機能",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    // Ctrl+F で検索機能を開く
    await userEvent.keyboard("{Control>}f{/Control}");

    // 検索UIが表示されることを確認
    // 検索ボタンが表示されることを確認
    const newCanvas = within(document.body);
    const searchArea = newCanvas.getAllByRole("search");
    await expect(searchArea).toHaveLength(1);
    await expect(searchArea[0]).toBeInTheDocument();

    // 検索ボックスに検索ワードを入力
    const searchInput = newCanvas.getByRole("searchbox");
    await expect(searchInput).toBeInTheDocument();

    // 検索ワード "Alice" を入力
    await userEvent.type(searchInput, "Alice");
    await expect(searchInput).toHaveValue("Alice");

    // エンターキーを押下して検索を実行
    await userEvent.keyboard("{Enter}");

    // 検索処理が完了するまで待機
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 一致するセル（Alice）のbackgroundColorが指定色になることを検証
    const aliceCell = newCanvas.getByRole("gridcell", { name: "Alice" });
    await expect(aliceCell).toBeInTheDocument();

    // セルのスタイルを確認（ハイライト色が適用されていることを確認）
    const cellStyle = window.getComputedStyle(aliceCell);
    const backgroundColor = cellStyle.backgroundColor;

    // 検索対象のハイライト色「#ffff0067」が適用されていることを確認
    // #ffff0067 は rgba(255, 255, 0, 0.404) に相当
    await expect(backgroundColor).toBe("rgba(255, 255, 0, 0.404)");
  },
};

export const FilterFunctionality: Story = {
  name: "フィルター機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // Ctrl+Shift+H でフィルター表示を切り替え
    await userEvent.keyboard("{Control>}{Shift>}h{/Shift}{/Control}");

    // フィルター機能が有効になることを確認
    const filterToggle = canvas.getByRole("button", { name: /toggle filters/i });
    await expect(filterToggle).toBeInTheDocument();

    const newCanvas = within(document.body);
    const filterInputs = newCanvas.getAllByPlaceholderText("filter...");
    await expect(filterInputs).toHaveLength(COL_MAX);
    await userEvent.type(filterInputs[0], "a");

    await waitFor(
      async () => {
        const rows = newCanvas.getAllByRole("row");
        if (rows.length === 4) {
          await expect(rows).toHaveLength(4); // ヘッダー行 + フィルター後の行数
          return true;
        }
        return false;
      },
      { timeout: 2000 }
    );

    await expect(newCanvas.getByRole("gridcell", { name: "Alice" })).toBeInTheDocument();
    await expect(newCanvas.getByRole("gridcell", { name: "Charlie" })).toBeInTheDocument();
    await expect(newCanvas.getByRole("gridcell", { name: "Diana" })).toBeInTheDocument();
  },
};
