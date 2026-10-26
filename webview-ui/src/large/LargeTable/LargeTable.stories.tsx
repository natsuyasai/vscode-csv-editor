import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { LargeTable } from "@/large/LargeTable/LargeTable";
import { MAX_SCROLL_HEIGHT } from "@/large/LargeTable/scrollScaling";
import { InMemoryRowSource } from "@/large/rowSource/InMemoryRowSource";
import { GeneratedRowSource, PendingRowSource } from "@/test-utils/largeRowSources";

const MILLION = 1_000_000;
const HEADER = ["id", "name", "city", "note"];

const meta: Meta<typeof LargeTable> = {
  title: "Large/LargeTable",
  component: LargeTable,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    source: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "400px", width: "800px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LargeTable>;

const fewRows = () =>
  new InMemoryRowSource(HEADER, [
    ["1", "Alice", "Tokyo", "first"],
    ["2", "Bob", "Osaka", "second"],
    ["3", "Carol", "Kyoto", "multi\nline"],
  ]);

const scroller = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "大容量CSVの表" });

export const FewRows: Story = {
  name: "少数行",
  args: { source: fewRows(), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    await expect(canvas.getByRole("rowheader", { name: "3" })).toBeInTheDocument();
    await expect(canvas.getByText("Bob")).toBeInTheDocument();
  },
};

export const MillionRows: Story = {
  name: "100万行（スクロールで末尾まで）",
  args: { source: new GeneratedRowSource(HEADER, MILLION), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = scroller(canvasElement);
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());

    // 100万行×40px（4,000万px）はブラウザの最大要素高を超えるため、DOM 上の高さは上限に収める
    await expect(element.scrollHeight).toBeLessThanOrEqual(MAX_SCROLL_HEIGHT + 100);

    // スクロールバーで中ほどへ移動すると、その位置の行が表示される
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    await waitFor(() => {
      const numbers = canvas
        .getAllByRole("rowheader")
        .map((cell) => Number(cell.textContent))
        .filter((n) => n > 0);
      return expect(Math.max(...numbers)).toBeGreaterThan(MILLION * 0.45);
    });

    // 末尾まで移動すると最終行が表示領域の中に表示される
    element.scrollTop = element.scrollHeight;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader", { name: String(MILLION) })).toBeInTheDocument()
    );
    const lastRow = canvas.getByRole("rowheader", { name: String(MILLION) });
    const rowRect = lastRow.getBoundingClientRect();
    const viewRect = element.getBoundingClientRect();
    await expect(rowRect.bottom).toBeLessThanOrEqual(viewRect.bottom + 1);
    await expect(rowRect.top).toBeGreaterThanOrEqual(viewRect.top);
    await expect(canvas.getByText(`name-${String(MILLION)}`)).toBeVisible();

    // 先頭へ戻せる
    element.scrollTop = 0;
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());
  },
};

export const PendingRows: Story = {
  name: "未取得の行がある状態",
  args: { source: new PendingRowSource(HEADER, MILLION), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());
    const rows = within(canvas.getAllByRole("rowgroup")[1]).getAllByRole("row");
    // 表示範囲の行はすべて読み込み中（aria-busy）として表示される
    await expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      await expect(row).toHaveAttribute("aria-busy", "true");
    }
    // 表示範囲の行だけを要求している
    const source = args.source as PendingRowSource;
    await expect(source.requests.every(([start, end]) => end - start < 100)).toBe(true);
  },
};

export const DarkTheme: Story = {
  name: "ダークテーマ",
  args: { source: fewRows(), theme: "dark" },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e", height: "100%" }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    await expect(canvas.getByText("Alice")).toBeVisible();
  },
};
