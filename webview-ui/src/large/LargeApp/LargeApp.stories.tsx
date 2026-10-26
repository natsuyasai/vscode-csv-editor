import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { FakeLargeExtension } from "@/test-utils/fakeLargeExtension";
import { LARGE_HEADER_HEIGHT, LARGE_ROW_HEIGHT } from "../LargeTable/LargeTable";
import { computeScrollScale, toDomOffset } from "../LargeTable/scrollScaling";
import { LargeApp } from "./LargeApp";
import { createLargeMessageHub } from "./largeMessageHub";

const MILLION = 1_000_000;
const HEADER = ["id", "name", "city"];

/** play から、画面に接続した拡張機能の代役を参照する（Story は1つずつ順に実行される） */
const current: { ext?: FakeLargeExtension } = {};
const ext = () => {
  if (!current.ext) throw new Error("拡張機能の代役が無い");
  return current.ext;
};

interface HarnessProps {
  indexing?: boolean;
  theme?: "light" | "dark";
}

function Harness({ indexing = false, theme = "light" }: HarnessProps) {
  const [{ hub, fake }] = useState(() => {
    const hub = createLargeMessageHub();
    const fake = new FakeLargeExtension({
      header: HEADER,
      rowCount: MILLION,
      autoRows: true,
      deliver: (message) => hub.dispatch(message),
    });
    current.ext = fake;
    return { hub, fake };
  });
  return (
    <LargeApp
      init={{
        type: "large/init",
        header: HEADER,
        rowCount: MILLION,
        indexing,
        encoding: "utf-8",
        restrictions: ["列の挿入・削除", "オートフィル"],
      }}
      theme={theme}
      messages={hub}
      postMessage={fake.post}
    />
  );
}

const meta: Meta<typeof Harness> = {
  title: "Large/LargeApp",
  component: Harness,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Harness>;

const scroller = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "大容量CSVの表" });

const sortButton = (canvasElement: HTMLElement, column: string) =>
  within(canvasElement).getByRole("button", { name: `列「${column}」をソート` });

/** 先頭行が表示されるまで待つ */
const waitForFirstRows = async (canvasElement: HTMLElement) => {
  await waitFor(() =>
    expect(
      within(canvasElement).getByRole("rowheader", { name: "1" }).closest("tr")
    ).toHaveTextContent("name-1")
  );
};

const rowTextOf = (canvasElement: HTMLElement, rowNumber: number) =>
  within(canvasElement)
    .getByRole("rowheader", { name: String(rowNumber) })
    .closest("tr");

export const SortCycle: Story = {
  name: "ソート（昇順 → 降順 → 解除）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    await userEvent.click(sortButton(canvasElement, "name"));
    await expect(ext().last("large/sort")).toMatchObject({ column: 1, direction: "asc" });
    ext().complete("sort", ext().last("large/sort").jobId);
    const header = canvas.getByRole("columnheader", { name: "name" });
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(header).toHaveTextContent("🔼");

    await userEvent.click(sortButton(canvasElement, "name"));
    await expect(ext().last("large/sort")).toMatchObject({ column: 1, direction: "desc" });
    ext().complete("sort", ext().last("large/sort").jobId);
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(header).toHaveTextContent("🔽");
    // 降順の表示順に変わった（先頭行の ID が最大）
    await waitFor(() => expect(rowTextOf(canvasElement, 1)).toHaveTextContent(String(MILLION)));

    await userEvent.click(sortButton(canvasElement, "name"));
    await expect(ext().last("large/sort")).toMatchObject({ column: 1, direction: null });
    ext().complete("sort", ext().last("large/sort").jobId);
    await expect(header).toHaveAttribute("aria-sort", "none");
  },
};

export const SortProgressAndCancel: Story = {
  name: "ソートの進捗表示とキャンセル",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    await userEvent.click(sortButton(canvasElement, "city"));
    const { jobId } = ext().last("large/sort");
    ext().progress("sort", jobId, 0.45);
    const progress = await canvas.findByRole("progressbar", { name: "ソート中" });
    await expect(progress).toHaveAttribute("value", "45");

    // 古い jobId の進捗は無視される
    ext().progress("sort", jobId + 100, 0.9);
    await expect(progress).toHaveAttribute("value", "45");

    await userEvent.click(canvas.getByRole("button", { name: "キャンセル" }));
    await expect(ext().sent("large/cancel")).toEqual([{ type: "large/cancel", jobId }]);
    await expect(canvas.queryByRole("progressbar")).toBeNull();
    await expect(canvas.getByRole("columnheader", { name: "city" })).toHaveAttribute(
      "aria-sort",
      "none"
    );
  },
};

export const SnapshotNoticeAndReapply: Story = {
  name: "ソート適用中の注記と再適用",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);
    await expect(canvas.queryByRole("button", { name: "再適用" })).toBeNull();

    await userEvent.click(sortButton(canvasElement, "name"));
    ext().complete("sort", ext().last("large/sort").jobId);
    await expect(
      await canvas.findByText(/編集しても並び替え・絞り込みは再実行されません/)
    ).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "再適用" }));
    await expect(ext().sent("large/sort")).toHaveLength(2);
    await expect(ext().last("large/sort")).toMatchObject({ column: 1, direction: "asc" });
  },
};

/** Ctrl+F で検索欄を開き、検索語を入力して Enter を押す */
const searchFor = async (query: string) => {
  const body = within(document.body);
  await userEvent.keyboard("{Control>}f{/Control}");
  const textfield = await waitFor(() => {
    const element = document.body.querySelector("vscode-textfield");
    if (!element) throw new Error("検索欄が無い");
    return element;
  });
  const input = textfield.shadowRoot?.querySelector("input");
  if (!input) throw new Error("検索欄の input が無い");
  await userEvent.type(input, `${query}{Enter}`);
  return body;
};

export const SearchJump: Story = {
  name: "検索で一致したセルへジャンプ",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    const body = await searchFor("name-750000");
    await waitFor(() => expect(ext().sent("large/search")).toHaveLength(1));
    const search = ext().last("large/search");
    await expect(search).toMatchObject({ query: "name-750000", direction: "forward" });
    await expect(await body.findByText("検索中...")).toBeVisible();

    ext().found(search.jobId, { row: 749_999, col: 1 });

    // 一致したセルが選択され、スクロール位置が仮想位置から変換した値になる
    const cell = await canvas.findByRole("gridcell", { selected: true });
    await expect(cell).toHaveTextContent("name-750000");
    const element = scroller(canvasElement);
    const scale = computeScrollScale(
      MILLION,
      LARGE_ROW_HEIGHT,
      element.clientHeight - LARGE_HEADER_HEIGHT
    );
    await waitFor(() =>
      expect(
        Math.abs(element.scrollTop - toDomOffset(749_999 * LARGE_ROW_HEIGHT, scale))
      ).toBeLessThan(2)
    );
    // 表示領域に収まっている
    const box = cell.getBoundingClientRect();
    const area = element.getBoundingClientRect();
    await expect(box.top).toBeGreaterThanOrEqual(area.top);
    await expect(box.bottom).toBeLessThanOrEqual(area.bottom + 1);
    await expect(await body.findByText("行 750000・列「name」")).toBeVisible();

    // 次へは一致した行の次の行から探す
    await userEvent.click(body.getByRole("button", { name: "Next search result" }));
    await waitFor(() => expect(ext().sent("large/search")).toHaveLength(2));
    await expect(ext().last("large/search")).toMatchObject({ from: 750_000, direction: "forward" });
  },
};

export const SearchNotFound: Story = {
  name: "検索で見つからない",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    const body = await searchFor("zzz");
    await waitFor(() => expect(ext().sent("large/search")).toHaveLength(1));
    ext().found(ext().last("large/search").jobId, null);
    await expect(await body.findByText("見つかりません")).toBeVisible();
    await expect(canvas.queryByRole("gridcell", { selected: true })).toBeNull();
  },
};

export const FilterRow: Story = {
  name: "フィルタ行（入力で絞り込みを要求）",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "フィルタ" }));
    const input = await canvas.findByRole("textbox", { name: "列「city」のフィルター" });
    await userEvent.type(input, "Tokyo");
    // 入力が止まってから1回だけ送られる
    await waitFor(() => expect(ext().sent("large/filter")).toHaveLength(1), { timeout: 3000 });
    await expect(ext().last("large/filter").filters).toEqual([{ column: 2, text: "Tokyo" }]);

    ext().complete("filter", ext().last("large/filter").jobId, 120);
    await waitFor(() => expect(canvas.getByRole("grid")).toHaveAttribute("aria-rowcount", "121"));
    await expect(
      await canvas.findByText(/編集しても並び替え・絞り込みは再実行されません/)
    ).toBeVisible();
  },
};

export const LastRowReachableWithFilterRow: Story = {
  name: "フィルタ行を開いても末尾の行までスクロールできる",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "フィルタ" }));
    await canvas.findByRole("textbox", { name: "列「name」のフィルター" });
    const element = scroller(canvasElement);
    element.scrollTop = element.scrollHeight;

    const lastRow = await canvas.findByRole("rowheader", { name: String(MILLION) });
    await waitFor(async () => {
      const box = lastRow.getBoundingClientRect();
      const area = element.getBoundingClientRect();
      // 固定ヘッダーとフィルタ行の下に隠れず、表示領域の下端に収まる
      const headerBottom = canvas
        .getByRole("textbox", { name: "列「name」のフィルター" })
        .getBoundingClientRect().bottom;
      await expect(box.bottom).toBeLessThanOrEqual(area.bottom + 1);
      await expect(box.top).toBeGreaterThanOrEqual(headerBottom);
    });
  },
};

export const IndexingDisablesQuery: Story = {
  name: "インデックス作成中は検索・ソート・フィルタを使えない",
  args: { indexing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(sortButton(canvasElement, "name")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "フィルタ" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "検索" })).toBeDisabled();
    await userEvent.keyboard("{Control>}f{/Control}");
    await expect(document.body.querySelector("vscode-textfield")).toBeNull();
  },
};

export const DarkThemeRunning: Story = {
  name: "ダークテーマ（ソート中）",
  args: { theme: "dark" },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e" }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitForFirstRows(canvasElement);
    await userEvent.click(sortButton(canvasElement, "name"));
    ext().progress("sort", ext().last("large/sort").jobId, 0.6);
    await expect(await canvas.findByText("ソート中 60%")).toBeVisible();
  },
};
