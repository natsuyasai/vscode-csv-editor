import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LargeModeBanner } from "../LargeModeBanner/LargeModeBanner";
import { LargeQueryActions, LargeSnapshotNotice } from "./LargeQueryControls";

const meta = {
  title: "Large/LargeQueryControls",
  component: LargeQueryActions,
  parameters: { layout: "fullscreen" },
  args: {
    enabled: true,
    filterRowVisible: false,
    onToggleFilterRow: fn(),
    onOpenSearch: fn(),
    job: null,
    onCancel: fn(),
  },
  // バナーの中に置いた状態で確かめる
  render: (args) => (
    <LargeModeBanner
      restrictions={["列の挿入・削除"]}
      encoding="utf-8"
      indexingRatio={null}
      actions={<LargeQueryActions {...args} />}
    />
  ),
} satisfies Meta<typeof LargeQueryActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "操作ボタン",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const filter = canvas.getByRole("button", { name: "フィルタ" });
    await expect(filter).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(filter);
    await expect(args.onToggleFilterRow).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: "検索" }));
    await expect(args.onOpenSearch).toHaveBeenCalledTimes(1);
    await expect(canvas.queryByRole("progressbar")).toBeNull();
  },
};

export const FilterRowOpen: Story = {
  name: "フィルタ行を表示中",
  args: { filterRowVisible: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "フィルタ" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  },
};

export const Disabled: Story = {
  name: "インデックス作成中は使えない",
  args: { enabled: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "フィルタ" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "検索" })).toBeDisabled();
  },
};

export const SortRunning: Story = {
  name: "ソート中の進捗とキャンセル",
  args: { job: { jobId: 3, kind: "sort", ratio: 0.45 } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const progress = canvas.getByRole("progressbar", { name: "ソート中" });
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute("value", "45");
    await expect(canvas.getByText("ソート中 45%")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "キャンセル" }));
    await expect(args.onCancel).toHaveBeenCalledTimes(1);
  },
};

export const FilterAndSearchRunning: Story = {
  name: "絞り込み中・検索中の表示",
  args: { job: { jobId: 4, kind: "filter", ratio: 0.1 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("絞り込み中 10%")).toBeVisible();
  },
};

export const SnapshotNotice: Story = {
  name: "編集しても並べ直されない注記と再適用",
  render: () => <ReapplyDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/編集しても並び替え・絞り込みは再実行されません/)).toBeVisible();
    const reapply = canvas.getByRole("button", { name: "再適用" });
    await expect(reapply).toBeEnabled();
    await userEvent.click(reapply);
    await expect(canvas.getByText("再適用しました")).toBeVisible();
  },
};

function ReapplyDemo() {
  const [done, setDone] = useState(false);
  return (
    <>
      <LargeModeBanner
        restrictions={[]}
        encoding="utf-8"
        indexingRatio={null}
        notice={<LargeSnapshotNotice disabled={false} onReapply={() => setDone(true)} />}
      />
      {done && <p>再適用しました</p>}
    </>
  );
}

export const DarkTheme: Story = {
  name: "ダークテーマ（進捗中）",
  args: { job: { jobId: 1, kind: "sort", ratio: 0.8 } },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e", color: "#cccccc" }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("ソート中 80%")).toBeVisible();
  },
};
