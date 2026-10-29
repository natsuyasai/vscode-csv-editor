import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { setInitData, waitReadyForGrid } from "@/test-utils/appStoryUtils";
import App from "./App";

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

export const SortingFunctionality: Story = {
  name: "ソート機能",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    setInitData();
    await waitReadyForGrid(canvasElement);

    // Nameヘッダーのドラッグ可能な要素（role="button"）を取得
    const nameHeader = await canvas.findByRole("columnheader", { name: /Name/ });
    const draggableButton = nameHeader.querySelector('[role="button"]') as HTMLElement;

    if (!draggableButton) {
      throw new Error("Draggable button not found in header");
    }

    // 1回目のクリック: 未選択のセルをクリック → 選択状態になるだけでソートしない
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ソートインジケーターが表示されないことを確認（まだソートされていない）
    await expect(nameHeader.textContent).not.toContain("🔼");
    await expect(nameHeader.textContent).not.toContain("🔽");

    // 2回目のクリック: 既に選択されているセルをクリック → ダブルクリック判定待ち（500ms）後にソート実行
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise((resolve) => setTimeout(resolve, 600)); // 500ms + 余裕

    // ソートインジケーター（🔼）が表示されることを確認
    await expect(nameHeader.textContent).toContain("🔼");

    // 3回目のクリック: 降順ソートに切り替わり
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise((resolve) => setTimeout(resolve, 600));

    // ソートインジケーター（🔽）が表示されることを確認
    await expect(nameHeader.textContent).toContain("🔽");

    // 4回目のクリック: ソート解除
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise((resolve) => setTimeout(resolve, 600));

    // ソートインジケーターが表示されないことを確認
    await expect(nameHeader.textContent).not.toContain("🔼");
    await expect(nameHeader.textContent).not.toContain("🔽");

    // データが表示されることを確認（ソート後も表示は継続）
    await expect(canvas.getByRole("gridcell", { name: "Alice" })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", { name: "Bob" })).toBeInTheDocument();
  },
};
