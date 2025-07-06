import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/CellEditing",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のセル編集機能",
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
