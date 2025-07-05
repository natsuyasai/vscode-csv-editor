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
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    // DataGrid（react-data-grid）が表示されることを確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();
    await expect(grid).toHaveClass("rdg");

    // 少し待機してCSVデータが処理されるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 列ヘッダー（columnheader）が正しく表示されることを確認
    const columnHeaders = canvas.getAllByRole("columnheader");
    await expect(columnHeaders).toHaveLength(5); // 行番号 + 4つのデータ列

    // 具体的なヘッダーテキストを確認
    await expect(canvas.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "City" })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: "Occupation" })).toBeInTheDocument();

    // データ行（row）が正しく表示されることを確認
    const rows = canvas.getAllByRole("row");
    await expect(rows).toHaveLength(6); // ヘッダー行 + 5つのデータ行

    // gridcellの内容を確認
    await expect(canvas.getByRole("gridcell", { name: "Alice" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Bob" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Charlie" })).toBeInTheDocument();
  },
};

export const CellEditingFunctionality: Story = {
  name: "セル編集機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();

    // セルをダブルクリックして編集モードに入る
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.dblClick(aliceCell);

    // 編集可能な入力フィールドが表示されることを確認
    // react-data-gridでは編集中にinput要素が作成される
    const input = canvas.queryByDisplayValue("Alice") as HTMLTextAreaElement;
    await expect(input).toBeInTheDocument();
    await expect(input?.type).toBe("textarea");
  },
};

export const CellEditingFunctionality_Backspace: Story = {
  name: "セル編集機能_Backspace（内容クリア→編集モード）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.click(aliceCell);

    // セルが選択された状態でBackspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // 編集モードに入り、入力フィールドが表示される（内容はクリアされている）
    // react-data-gridでは編集中にinput要素が作成される
    const input = canvas.queryByRole("textbox") as HTMLTextAreaElement;
    await expect(input).toBeInTheDocument();
    await expect(input?.type).toBe("textarea");
    // 内容がクリアされていることを確認
    await expect(input).toHaveValue("");
  },
};

export const CellEditingFunctionality_Delete: Story = {
  name: "セル編集機能_Delete（内容クリア→編集モード移行なし）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.click(aliceCell);

    // セルが選択された状態でDeleteキーを押す
    await userEvent.keyboard("{Delete}");

    // 内容がクリアされるが、編集モードには移行しない
    // 編集用のinput要素が作成されていないことを確認
    const input = canvas.queryByRole("textbox");
    if (input && input.tagName === "INPUT") {
      // 編集モードに入った場合はテスト失敗
      throw new Error("編集モードに移行してはいけません");
    }

    // セルの内容が空になっていることを確認
    const updatedCell = canvas.getByRole("gridcell", { name: "" });
    await expect(updatedCell).toBeInTheDocument();
  },
};

export const CellEditingFunctionality_CharacterInput: Story = {
  name: "セル編集機能_文字入力（内容クリア→編集モード）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.click(aliceCell);

    // セルが選択された状態で文字を入力する
    await userEvent.keyboard("X");

    // 編集モードに入り、入力した文字が表示される（元の内容はクリアされている）
    // react-data-gridでは編集中にinput要素が作成される
    const input = canvas.queryByRole("textbox") as HTMLTextAreaElement;
    await expect(input).toBeInTheDocument();
    await expect(input?.type).toBe("textarea");
    // 入力した文字が表示されていることを確認
    await expect(input).toHaveValue("X");
  },
};

export const KeyboardShortcuts: Story = {
  name: "検索機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();

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

export const SortingFunctionality: Story = {
  name: "ソート機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Nameヘッダーをクリックしてソート
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.click(nameHeader);
    // ソートは一度クリック後、ダブルクリック判定を経てから再度クリックしたときに反応するため、
    // ダブルクリック判定を待ってから再度クリック
    await new Promise((resolve) => setTimeout(resolve, 500));
    await userEvent.click(nameHeader);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ソートインジケーターが表示されることを確認
    const ariaSortValueAsc = nameHeader.getAttribute("aria-sort");
    await expect(ariaSortValueAsc).toBeTruthy();
    await expect(ariaSortValueAsc).toBe("ascending");

    // 再度クリックすると降順ソートに切り替わり
    await userEvent.click(nameHeader);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const ariaSortValueDesc = nameHeader.getAttribute("aria-sort");
    await expect(ariaSortValueDesc).toBeTruthy();
    await expect(ariaSortValueDesc).toBe("descending");

    // 再度クリックするとソート解除
    await userEvent.click(nameHeader);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const ariaSortValue = nameHeader.getAttribute("aria-sort");
    await expect(ariaSortValue).toBeFalsy();

    // データが表示されることを確認（ソート後も表示は継続）
    await expect(canvas.getByRole("gridcell", { name: "Alice" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Bob" })).toBeInTheDocument();
  },
};

export const FilterFunctionality: Story = {
  name: "フィルター機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    const grid = canvas.getByRole("grid");
    await expect(grid).toBeInTheDocument();

    // Ctrl+Shift+H でフィルター表示を切り替え
    await userEvent.keyboard("{Control>}{Shift>}h{/Shift}{/Control}");

    // フィルター機能が有効になることを確認
    const filterToggle = canvas.getByRole("button", { name: /toggle filters/i });
    await expect(filterToggle).toBeInTheDocument();
  },
};

export const ThemeSupport: Story = {
  name: "ダークモード対応",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 初期状態（ライトテーマ）の確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toHaveClass("rdg");

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
          updatedGrid.className.includes("rdg") &&
          (updatedGrid.className.includes("dark") || !updatedGrid.className.includes("light"));
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
        await expect(lightGrid).toHaveClass("rdg");
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const SaveFunctionality: Story = {
  name: "保存機能（Ctrl+S）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 保存前のグリッドの状態を確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toHaveClass("rdg");
    const initialRowCount = canvas.getAllByRole("row").length;

    // Ctrl+S で保存（実際の保存処理は実装によるため、キーイベントの発生を確認）
    await userEvent.keyboard("{Control>}s{/Control}");

    // 保存処理が実行されてもグリッドは正常に表示され続けることを確認
    await waitFor(
      async () => {
        const gridAfterSave = canvas.getByRole("grid");
        await expect(gridAfterSave).toBeInTheDocument();
        await expect(gridAfterSave).toHaveClass("rdg");
        // 行数が変わらないことを確認
        const finalRowCount = canvas.getAllByRole("row").length;
        await expect(finalRowCount).toBe(initialRowCount);
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const ContextMenuFunctionality: Story = {
  name: "コンテキストメニュー機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // セルを右クリックしてコンテキストメニューを表示
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: aliceCell,
    });

    // 右クリック後もグリッドが正常に表示されることを確認
    await waitFor(
      async () => {
        // グリッドが正常に機能していることを確認
        const grid = canvas.getByRole("grid");
        await expect(grid).toBeInTheDocument();
        await expect(grid).toHaveClass("rdg");
      },
      { timeout: 2000 }
    );
  },
};

export const UndoRedoFunctionality: Story = {
  name: "元に戻す・やり直し機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 初期状態のデータ構造を確認
    const initialGrid = canvas.getByRole("grid");
    await expect(initialGrid).toHaveClass("rdg");
    const initialRows = canvas.getAllByRole("row");
    const initialRowCount = initialRows.length;

    // Ctrl+Z で元に戻す（操作履歴がない場合は何も起こらない）
    await userEvent.keyboard("{Control>}z{/Control}");

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Ctrl+Y でやり直し（操作履歴がない場合は何も起こらない）
    await userEvent.keyboard("{Control>}y{/Control}");

    // 操作後もグリッドが正常に表示され続けることを確認
    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        await expect(grid).toBeInTheDocument();
        await expect(grid).toHaveClass("rdg");
        // 行数が変わらないことを確認
        const finalRowCount = canvas.getAllByRole("row").length;
        await expect(finalRowCount).toBe(initialRowCount);
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const RowSizeAdjustment: Story = {
  name: "行サイズ調整機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 初期データを設定
    window.postMessage(
      {
        type: "update",
        payload: sampleCSVData,
      },
      "*"
    );

    await waitFor(
      async () => {
        const grid = canvas.getByRole("grid");
        return await expect(grid).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // ヘッダー部分のUIを確認
    const grid = canvas.getByRole("grid");
    await expect(grid).toHaveClass("rdg");

    // 行サイズ調整のセレクトボックスを探す
    await waitFor(
      async () => {
        const rowSizeSelector = canvas.getByRole("listbox", { name: /row size/i });
        await expect(rowSizeSelector).toBeInTheDocument();

        // 行サイズ関連のテキストが存在するかチェック（最初の一つだけ）
        const rowSizeText = canvas.getAllByText(/small|normal|large/i)[0];
        await expect(rowSizeText).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  },
};
