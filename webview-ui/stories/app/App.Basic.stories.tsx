import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import App from "../../src/App";
import { setInitData, waitReadyForGrid, COL_MAX_WITH_HEADER, ROW_MAX } from "./utils";

const meta: Meta<typeof App> = {
  title: "App/Basic",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor の基本表示機能",
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
