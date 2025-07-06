import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import App from "../../src/App";

const meta: Meta<typeof App> = {
  title: "App/Sorting",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "VSCode CSV Editor のソート機能",
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
