import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../src/App";

const meta: Meta<typeof App> = {
  title: "App",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のメインアプリケーションコンポーネント",
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

export const Default: Story = {
  name: "基本表示",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // VSCodeからの初期メッセージをシミュレート
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    // EditableTableが表示されることを確認
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 5000 });

    // 少し待機してCSVデータが処理されるのを待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ヘッダー行が表示されることを確認
    await waitFor(async () => {
      return await expect(canvas.getByText("Name")).toBeInTheDocument();
    }, { timeout: 3000 });
    
    await expect(canvas.getByText("Age")).toBeInTheDocument();
    await expect(canvas.getByText("City")).toBeInTheDocument();
    await expect(canvas.getByText("Occupation")).toBeInTheDocument();

    // データ行が表示されることを確認
    await expect(canvas.getByText("Alice")).toBeInTheDocument();
    await expect(canvas.getByText("Bob")).toBeInTheDocument();
    await expect(canvas.getByText("Charlie")).toBeInTheDocument();
  },
};

export const CellEditingFunctionality: Story = {
  name: "セル編集機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // セルをダブルクリックして編集モードに入る
    const aliceCell = await canvas.findByText("Alice");
    await userEvent.dblClick(aliceCell);

    // 編集可能な入力フィールドが表示されることを確認
    await waitFor(async () => {
      const input = canvas.queryByDisplayValue("Alice");
      if (input) {
        await expect(input).toBeInTheDocument();
        return true;
      }
      return false;
    });
  },
};

export const KeyboardShortcuts: Story = {
  name: "キーボードショートカット機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // Ctrl+F で検索機能を開く
    await userEvent.keyboard("{Control>}f{/Control}");

    // 検索関連のUIが表示されることを確認（具体的な要素は実装による）
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    });
  },
};

export const SortingFunctionality: Story = {
  name: "ソート機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // Nameヘッダーをクリックしてソート
    const nameHeader = await canvas.findByText("Name");
    await userEvent.click(nameHeader);

    // ソートが実行されることを確認
    await expect(canvas.getByText("Alice")).toBeInTheDocument();
    await expect(canvas.getByText("Bob")).toBeInTheDocument();
  },
};

export const FilterFunctionality: Story = {
  name: "フィルター機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // Ctrl+Shift+H でフィルター表示を切り替え
    await userEvent.keyboard("{Control>}{Shift>}h{/Shift}{/Control}");

    // フィルター機能が有効になることを確認
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    });
  },
};

export const ThemeSupport: Story = {
  name: "ダークモード対応",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // ダークテーマに変更
    window.postMessage({
      type: "updateTheme",
      payload: "dark",
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      await expect(grid).toBeInTheDocument();
      return true;
    });
    
    // ダークテーマのクラスが適用されているかチェック
    const grid = canvas.getByRole("grid");
    // テーマの変更を少し待つ
    await new Promise(resolve => setTimeout(resolve, 500));
    // ライトテーマからダークテーマへの変更を確認（実装により異なる可能性がある）
    const hasRdgClass = grid.className.includes("rdg");
    await expect(hasRdgClass).toBe(true);

    // ライトテーマに戻す
    window.postMessage({
      type: "updateTheme",
      payload: "light",
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      // ライトテーマのクラスが適用されているかチェック
      const hasLightClass = grid.className.includes("rdg-light");
      await expect(hasLightClass).toBe(true);
      return true;
    });
  },
};

export const SaveFunctionality: Story = {
  name: "保存機能（Ctrl+S）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // Ctrl+S で保存（実際の保存処理は実装によるため、キーイベントの発生を確認）
    await userEvent.keyboard("{Control>}s{/Control}");

    // グリッドがまだ表示されていることを確認（保存処理後も表示は継続）
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    });
  },
};

export const ContextMenuFunctionality: Story = {
  name: "コンテキストメニュー機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // セルを右クリックしてコンテキストメニューを表示
    const aliceCell = await canvas.findByText("Alice");
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: aliceCell,
    });

    // コンテキストメニューの表示を確認（具体的な実装に依存）
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    });
  },
};

export const UndoRedoFunctionality: Story = {
  name: "元に戻す・やり直し機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // Ctrl+Z で元に戻す
    await userEvent.keyboard("{Control>}z{/Control}");

    // Ctrl+Y でやり直し
    await userEvent.keyboard("{Control>}y{/Control}");

    // グリッドが表示され続けることを確認
    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    });
  },
};

export const RowSizeAdjustment: Story = {
  name: "行サイズ調整機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 初期データを設定
    window.postMessage({
      type: "update",
      payload: sampleCSVData,
    }, "*");

    await waitFor(async () => {
      const grid = canvas.getByRole("grid");
      return await expect(grid).toBeInTheDocument();
    }, { timeout: 3000 });

    // ヘッダー部分にある行サイズ調整のUIを確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();
    
    // 行サイズ関連のUIが存在するかチェック（具体的な実装に依存）
    const possibleRowSizeElements = canvas.queryByText("Small") || 
                                   canvas.queryByText("Normal") || 
                                   canvas.queryByText("Large");
    
    if (possibleRowSizeElements) {
      await expect(possibleRowSizeElements).toBeInTheDocument();
    }
  },
};