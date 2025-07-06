import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../../src/App";

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

// サンプルCSVデータ
const sampleCSVData = `Name,Age,City,Occupation
Alice,28,Tokyo,Engineer
Bob,35,Osaka,Designer
Charlie,42,Kyoto,Manager
Diana,31,Yokohama,Developer
Eve,29,Kobe,Analyst`;

const COL_MAX = 4;
const COL_MAX_WITH_HEADER = COL_MAX + 1; // 行番号を含む

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
