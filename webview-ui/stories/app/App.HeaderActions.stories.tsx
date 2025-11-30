import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid, COL_MAX_WITH_HEADER } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/HeaderActions",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のヘッダー操作機能",
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

async function triggerHeaderContextMenu(canvasElement: HTMLElement, targetValue: string) {
  const canvas = within(canvasElement);
  // ヘッダーセルを右クリックしてコンテキストメニューを表示
  const ageHeaderCell = await canvas.findByRole("columnheader", { name: /Age/ });
  await userEvent.click(ageHeaderCell);
  await userEvent.pointer({
    keys: "[MouseRight]",
    target: ageHeaderCell,
  });

  // VscodeContextMenuが表示されるまで待つ
  await waitFor(
    async () => {
      const contextMenu = document.body.querySelector("vscode-context-menu");
      await expect(contextMenu).toBeInTheDocument();
      return true;
    },
    { timeout: 2000 }
  );

  // メニューアイテムをクリック（Shadow DOMを通じてアクセス）
  const contextMenu = document.body.querySelector("vscode-context-menu");
  const menuItem = contextMenu?.shadowRoot?.querySelector(
    `vscode-context-menu-item[value="${targetValue}"]`
  );
  if (menuItem) {
    const link = menuItem.shadowRoot?.querySelector("a");
    if (link) {
      await userEvent.click(link as HTMLElement);
    } else {
      throw new Error(`Link not found in menu item "${targetValue}"`);
    }
  } else {
    throw new Error(`Menu item with value "${targetValue}" not found`);
  }
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
        const newHeader = newCanvas.getByRole("columnheader", { name: /new column/ });
        await expect(newHeader).toBeInTheDocument();

        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認

        await expect(headers[2].textContent).toContain("new column"); // 新しいヘッダーの内容を確認
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
        // 右側に新しいヘッダーが追加されていることを確認
        const newHeader = newCanvas.getByRole("columnheader", { name: /new column/ });
        await expect(newHeader).toBeInTheDocument();

        const headers = newCanvas.getAllByRole("columnheader");
        await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認
        await expect(headers[3].textContent).toContain("new column"); // 新しいヘッダーの内容を確認
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
        await expect(headers[2].textContent).toContain("City");
        return true;
      },
      { timeout: 2000 }
    );
  },
};
