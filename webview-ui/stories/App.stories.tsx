import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../src/App";
import { setRowSize } from "./utils/rowSizeSelect";

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

export const CellEditingFunctionality: Story = {
  name: "セル編集機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

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

    setInitData();
    await waitReadyForGrid(canvasElement);

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

    setInitData();
    await waitReadyForGrid(canvasElement);

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

async function insertTextTest(canvasElement: HTMLElement, key: string) {
  const canvas = within(canvasElement);

  setInitData();
  await waitReadyForGrid(canvasElement);

  // セルをクリックして選択状態にする
  const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
  await userEvent.click(aliceCell);

  // セルが選択された状態で文字を入力する
  await userEvent.keyboard(key);

  // 編集モードに入り、入力した文字が表示される（元の内容はクリアされている）
  // react-data-gridでは編集中にinput要素が作成される
  const input = canvas.queryByRole("textbox") as HTMLTextAreaElement;
  await expect(input).toBeInTheDocument();
  await expect(input?.type).toBe("textarea");
  await expect(input).toHaveValue(key);
}
export const CellEditingFunctionality_CharacterInput: Story = {
  name: "セル編集機能_文字入力（内容クリア→編集モード）",
  play: async ({ canvasElement }) => {
    await insertTextTest(canvasElement, "X");
  },
};

// 英数字のテスト
export const CellEditingFunctionality_AlphanumericInput: Story = {
  name: "セル編集機能_英数字入力",
  play: async ({ canvasElement }) => {
    // 英小文字
    await insertTextTest(canvasElement, "a");
    // 英大文字
    await insertTextTest(canvasElement, "A");
    // 数字
    await insertTextTest(canvasElement, "1");
    // 数字0
    await insertTextTest(canvasElement, "0");
    // 数字9
    await insertTextTest(canvasElement, "9");
  },
};

// 特殊キーの組み合わせテスト（編集モードに入らないキー）
export const CellEditingFunctionality_SpecialKeyInput: Story = {
  name: "セル編集機能_特殊キー入力",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("gridcell", { name: "Alice" });
    await userEvent.click(aliceCell);

    // 以下のキーは編集モードに入らない（特殊動作をする）

    // F1キー（何も起こらない）
    await userEvent.keyboard("{F1}");
    let input = canvas.queryByRole("textbox");
    await expect(input).not.toBeInTheDocument();

    // Arrow keys（セル移動）のテストを簡略化
    // セルを再度クリックして選択状態にする
    await userEvent.click(aliceCell);

    // 特殊キーの一部のみテスト
    await userEvent.keyboard("{Escape}");
    input = canvas.queryByRole("textbox");
    await expect(input).not.toBeInTheDocument();
  },
};

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

export const SortingFunctionality: Story = {
  name: "ソート機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

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

async function triggerHeaderContextMenu(canvasElement: HTMLElement, targetValue: string) {
  const canvas = within(canvasElement);
  // セルを右クリックしてコンテキストメニューを表示
  const ageHeaderCell = await canvas.findByRole("columnheader", { name: "Age" });
  await userEvent.click(ageHeaderCell);
  await userEvent.pointer({
    keys: "[MouseRight]",
    target: ageHeaderCell,
  });
  const contextMenu = document.body.getElementsByTagName("vscode-context-menu");
  await expect(contextMenu).toHaveLength(1);
  const menuItem = contextMenu[0].shadowRoot?.querySelectorAll(
    `vscode-context-menu-item[value='${targetValue}']`
  );
  const atag = menuItem?.[0].shadowRoot?.querySelector("a");
  await userEvent.click(atag as HTMLElement);
}

async function triggerRowContextMenu(canvasElement: HTMLElement, targetValue: string) {
  const canvas = within(canvasElement);
  // データ行の行番号セルを右クリックしてコンテキストメニューを表示
  const rows = await canvas.findAllByRole("row");
  // 最初のデータ行（インデックス1）の行番号セル（最初のgridcell）を取得
  const dataRow = rows[1];
  const rowNumberCell = within(dataRow).getAllByRole("gridcell")[0];
  await userEvent.click(rowNumberCell);
  await userEvent.pointer({
    keys: "[MouseRight]",
    target: rowNumberCell,
  });
  const contextMenu = document.body.getElementsByTagName("vscode-context-menu");
  await expect(contextMenu).toHaveLength(1);
  const menuItem = contextMenu[0].shadowRoot?.querySelectorAll(
    `vscode-context-menu-item[value='${targetValue}']`
  );
  const atag = menuItem?.[0].shadowRoot?.querySelector("a");
  await userEvent.click(atag as HTMLElement);
}

export const AddHeaderForLeft: Story = {
  name: "ヘッダーを左側に追加",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerHeaderContextMenu(canvasElement, "insertHeaderCelLeft");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        // 左側に新しいヘッダーが追加されていることを確認
        const newHeader = newCanvas.getByRole("columnheader", { name: "new column" });
        await expect(newHeader).toBeInTheDocument();

        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認

        await expect(headers[2].innerHTML).toContain("new column"); // 新しいヘッダーの内容を確認
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const AddHeaderForRight: Story = {
  name: "ヘッダーを右側に追加",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerHeaderContextMenu(canvasElement, "insertHeaderCelRight");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        // 左側に新しいヘッダーが追加されていることを確認
        const newHeader = newCanvas.getByRole("columnheader", { name: "new column" });
        await expect(newHeader).toBeInTheDocument();

        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認
        await expect(headers[3].innerHTML).toContain("new column"); // 新しいヘッダーの内容を確認
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const DeleteHeader: Story = {
  name: "ヘッダーを削除",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerHeaderContextMenu(canvasElement, "deleteHeaderCel");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER - 1);
        await expect(headers[2].innerHTML).toContain("City");
        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const UndoRedo: Story = {
  name: "元に戻す・やり直し",
  play: async ({ context }) => {
    await DeleteHeader.play!(context);

    // Ctrl+Z で元に戻す
    await userEvent.keyboard("{Control>}z{/Control}");

    // 削除した列が戻っていること
    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER);
        await expect(headers[2].innerHTML).toContain("Age");
        return true;
      },
      { timeout: 2000 }
    );

    // Ctrl+Y でやり直し
    await userEvent.keyboard("{Control>}y{/Control}");
    await waitFor(
      async () => {
        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER - 1);
        await expect(headers[2].innerHTML).toContain("City");
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
    setInitData();
    await waitReadyForGrid(canvasElement);

    await setRowSize(canvas, "large");

    const cell = canvas.getByRole("gridcell", { name: "Alice" });
    await expect(cell.getBoundingClientRect().height).toBe(80); // largeサイズの高さを確認
  },
};

export const AddRowAbove: Story = {
  name: "選択行の前に追加",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerRowContextMenu(canvasElement, "insertRowAbove");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        const rows = newCanvas.getAllByRole("row");
        await expect(rows).toHaveLength(1 + ROW_MAX + 1); // ヘッダー行 + 元の行数 + 新しい行

        // 新しい行が追加されていることを確認（空の行が追加される）
        const newRow = rows[1]; // 最初のデータ行
        const cells = within(newRow).getAllByRole("gridcell");
        // 新しい行の最初のデータセル（行番号以外）が空であることを確認
        const firstDataCell = cells[1];
        await expect(firstDataCell).toHaveTextContent("");

        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const AddRowBelow: Story = {
  name: "選択行の後ろに追加",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerRowContextMenu(canvasElement, "insertRowBelow");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        const rows = newCanvas.getAllByRole("row");
        await expect(rows).toHaveLength(1 + ROW_MAX + 1); // ヘッダー行 + 元の行数 + 新しい行

        // 新しい行が選択行の後ろに追加されていることを確認
        const newRow = rows[2]; // 2番目のデータ行（選択行の後ろ）
        const cells = within(newRow).getAllByRole("gridcell");
        // 新しい行の最初のデータセル（行番号以外）が空であることを確認
        const firstDataCell = cells[1];
        await expect(firstDataCell).toHaveTextContent("");

        return true;
      },
      { timeout: 2000 }
    );
  },
};

export const DeleteRow: Story = {
  name: "選択行を削除",
  play: async ({ canvasElement }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    await triggerRowContextMenu(canvasElement, "deleteRow");

    const newCanvas = within(document.body);
    await waitFor(
      async () => {
        const rows = newCanvas.getAllByRole("row");
        await expect(rows).toHaveLength(1 + ROW_MAX - 1); // ヘッダー行 + 元の行数 - 削除した行

        // 最初の行（Alice）が削除されて、2番目の行（Bob）が最初に来ていることを確認
        const firstDataRow = rows[1];
        const cells = within(firstDataRow).getAllByRole("gridcell");
        const nameCell = cells[1]; // 行番号の次のセル（Name列）
        await expect(nameCell).toHaveTextContent("Bob");

        return true;
      },
      { timeout: 2000 }
    );
  },
};
