import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid, ROW_MAX } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/RowActions",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor の行操作機能",
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
