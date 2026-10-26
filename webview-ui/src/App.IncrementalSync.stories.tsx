import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";
import { setInitData, waitReadyForGrid } from "@/test-utils/appStoryUtils";
import { vscode } from "@/utilities/vscode";
import App from "./App";

const meta: Meta<typeof App> = {
  title: "App/IncrementalSync",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "編集を差分の操作（applyOps）として拡張機能へ送る同期の結合テスト",
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

/** Alice のセル(2行目の1列目)を Delete で空にした結果の操作 */
const CLEAR_ALICE_OP = {
  type: "replaceRows",
  start: 1,
  deleteCount: 1,
  rows: [["", "28", "Tokyo", "Engineer"]],
};

/** Alice のセルを選択して Delete で内容を消す */
async function clearAliceCell(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const aliceCell = await canvas.findByRole("button", { name: "Alice" });
  await userEvent.click(aliceCell);
  await userEvent.keyboard("{Delete}");
}

export const SendsRowOpsAfterEdit: Story = {
  name: "セルを編集すると、編集した行の置換操作だけがエポック付きで送られる",
  play: async ({ canvasElement }) => {
    const postMessage = spyOn(vscode, "postMessage");
    try {
      setInitData();
      await waitReadyForGrid(canvasElement);
      postMessage.mockClear();

      await clearAliceCell(canvasElement);

      // デバウンス後に1回だけ送られる
      await waitFor(() =>
        expect(postMessage).toHaveBeenCalledWith({
          type: "applyOps",
          epoch: 0,
          ops: [CLEAR_ALICE_OP],
        })
      );
      await expect(postMessage).toHaveBeenCalledTimes(1);
    } finally {
      postMessage.mockRestore();
    }
  },
};

export const FlushesOpsBeforeSave: Story = {
  name: "編集の直後に保存すると、保留中の操作を送ってから内容を持たない保存を送る",
  play: async ({ canvasElement }) => {
    const postMessage = spyOn(vscode, "postMessage");
    try {
      setInitData();
      await waitReadyForGrid(canvasElement);
      postMessage.mockClear();

      await clearAliceCell(canvasElement);
      // デバウンスを待たずに保存する
      await userEvent.keyboard("{Control>}s{/Control}");

      await expect(postMessage.mock.calls.map(([message]) => message)).toEqual([
        { type: "applyOps", epoch: 0, ops: [CLEAR_ALICE_OP] },
        { type: "save" },
      ]);
    } finally {
      postMessage.mockRestore();
    }
  },
};
