import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/HeaderEditing",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のヘッダーセル編集機能",
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

export const HeaderEditingFunctionality: Story = {
  name: "ヘッダーセル編集機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをダブルクリックして編集モードに入る
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.dblClick(nameHeader);

    // 編集可能なtextarea要素が表示されることを確認
    await waitFor(
      async () => {
        const textarea = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
        await expect(textarea).toBeInTheDocument();
        await expect(textarea?.tagName).toBe("TEXTAREA");
        return true;
      },
      { timeout: 1000 }
    );
  },
};

export const HeaderEditingFunctionality_Backspace: Story = {
  name: "ヘッダーセル編集機能_Backspace（内容クリア→編集モード）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.click(nameHeader);

    // ヘッダーセルが選択された状態でBackspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // 編集モードに入り、textarea要素が表示される（内容はクリアされている）
    await waitFor(
      async () => {
        const textarea = canvas.queryByRole("textbox") as HTMLTextAreaElement;
        await expect(textarea).toBeInTheDocument();
        await expect(textarea?.tagName).toBe("TEXTAREA");
        // 内容がクリアされていることを確認
        await expect(textarea).toHaveValue("");
        return true;
      },
      { timeout: 1000 }
    );
  },
};

export const HeaderEditingFunctionality_Delete: Story = {
  name: "ヘッダーセル編集機能_Delete（内容クリア→編集モード移行なし）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.click(nameHeader);

    // ヘッダーセルが選択された状態でDeleteキーを押す
    await userEvent.keyboard("{Delete}");

    // 少し待機してDOM更新を待つ
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 内容がクリアされるが、編集モードには移行しない
    // 編集用のtextarea要素が作成されていないことを確認
    const textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();

    // ヘッダーセルの内容が空になっていることを確認
    await waitFor(
      async () => {
        const updatedHeaders = canvas.queryAllByRole("columnheader", { name: "" });
        await expect(updatedHeaders).toHaveLength(2); // インデックス行＋削除した列
        return true;
      },
      { timeout: 1000 }
    );
  },
};

async function insertHeaderTextTest(canvasElement: HTMLElement, key: string) {
  const canvas = within(canvasElement);

  setInitData();
  await waitReadyForGrid(canvasElement);

  // ヘッダーセルをクリックして選択状態にする
  const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
  await userEvent.click(nameHeader);

  // ヘッダーセルが選択された状態で文字を入力する
  await userEvent.keyboard(key);

  // 編集モードに入り、入力した文字が表示される（元の内容はクリアされている）
  await waitFor(
    async () => {
      const textarea = canvas.queryByRole("textbox") as HTMLTextAreaElement;
      await expect(textarea).toBeInTheDocument();
      await expect(textarea?.tagName).toBe("TEXTAREA");
      await expect(textarea).toHaveValue(key);
      return true;
    },
    { timeout: 1000 }
  );
}

export const HeaderEditingFunctionality_CharacterInput: Story = {
  name: "ヘッダーセル編集機能_文字入力（内容クリア→編集モード）",
  play: async ({ canvasElement }) => {
    await insertHeaderTextTest(canvasElement, "X");
  },
};

// F2キーとその他のキーのテスト
export const HeaderEditingFunctionality_F2Key: Story = {
  name: "ヘッダーセル編集機能_F2キー（編集モード）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.click(nameHeader);

    // F2キーで編集モードに入る
    await userEvent.keyboard("{F2}");

    // 編集モードに入り、元の内容が保持されたtextarea要素が表示される
    await waitFor(
      async () => {
        const textarea = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
        await expect(textarea).toBeInTheDocument();
        await expect(textarea?.tagName).toBe("TEXTAREA");
        await expect(textarea).toHaveValue("Name");
        return true;
      },
      { timeout: 1000 }
    );
  },
};

// 特殊キーの組み合わせテスト（編集モードに入らないキー）
export const HeaderEditingFunctionality_SpecialKeyInput: Story = {
  name: "ヘッダーセル編集機能_特殊キー入力",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.click(nameHeader);

    // 以下のキーは編集モードに入らない（特殊動作をする）

    // F1キー（何も起こらない）
    await userEvent.keyboard("{F1}");
    await new Promise((resolve) => setTimeout(resolve, 100));
    let textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();

    // ヘッダーセルを再度クリックして選択状態にする
    await userEvent.click(nameHeader);

    // Escapeキー（編集モードに入らない）
    await userEvent.keyboard("{Escape}");
    await new Promise((resolve) => setTimeout(resolve, 100));
    textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();
  },
};

export const HeaderEditingFunctionality_SaveChanges: Story = {
  name: "ヘッダーセル編集機能_変更保存",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをダブルクリックして編集モードに入る
    const nameHeader = await canvas.findByRole("columnheader", { name: "Name" });
    await userEvent.dblClick(nameHeader);

    // 編集可能なtextarea要素が表示されることを確認
    const textarea = await waitFor(
      async () => {
        const element = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
        await expect(element).toBeInTheDocument();
        await expect(element?.tagName).toBe("TEXTAREA");
        return element;
      },
      { timeout: 1000 }
    );

    // 内容を変更する
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "新しい名前");

    // Enterキーで変更を確定
    await userEvent.keyboard("{Enter}");

    // 編集モードが終了し、新しい内容が反映されることを確認
    await waitFor(
      async () => {
        const updatedHeader = canvas.queryByRole("columnheader", { name: "新しい名前" });
        await expect(updatedHeader).toBeInTheDocument();
        return true;
      },
      { timeout: 2000 }
    );
  },
};
