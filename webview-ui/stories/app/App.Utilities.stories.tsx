import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import App from "../../src/App";
import { setRowSize } from "../utils/rowSizeSelect";
import { DeleteHeader } from "./App.HeaderActions.stories";
import { setInitData, waitReadyForGrid, COL_MAX_WITH_HEADER } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/Utilities",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のその他機能",
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
