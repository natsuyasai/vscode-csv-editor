import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { EditableTable } from "@/components/editable-table/EditableTable";

/**
 * ライブラリ（@tanstack/react-table）更新前後で、実ブラウザでのソートの切り替えと
 * 列幅のドラッグ変更の結果が変わらないことを確かめる。
 *
 * データ順: a(3), b(9), c(1), d(2)（ソートは文字列比較になるため1桁の数値に揃えている）
 */
const meta = {
  title: "components/editable-table/EditableTable/TableBehavior",
  component: EditableTable,
  decorators: [
    (Story) => (
      <div style={{ height: "400px", width: "800px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    csvArray: [
      ["name", "num"],
      ["a", "3"],
      ["b", "9"],
      ["c", "1"],
      ["d", "2"],
    ],
    theme: "light",
    setCSVArray: fn(),
    onApply: fn(),
  },
} satisfies Meta<typeof EditableTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 表示中のデータ行(tbody)のname列の並びを返す */
const viewOrder = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll("tbody tr")).map(
    (tr) => tr.querySelector('td:nth-child(2) > div[role="button"]')?.textContent
  );

/** ソート表示（🔼/🔽）を除いた見出しが name のヘッダーセル */
const headerThOf = (canvasElement: HTMLElement, name: string) => {
  const th = Array.from(canvasElement.querySelectorAll<HTMLElement>("thead th")).find(
    (el) => (el.textContent ?? "").replace(/ [🔼🔽]/u, "").trim() === name
  );
  if (!th) throw new Error(`header ${name} not found`);
  return th;
};

export const SortCycle: Story = {
  name: "Enter を押すたびに昇順・降順・なしの順でソートが切り替わる",
  play: async ({ canvasElement }) => {
    const header = headerThOf(canvasElement, "num").querySelector<HTMLElement>("[tabindex]")!;
    const indicator = () => headerThOf(canvasElement, "num").textContent ?? "";

    // フォーカス→クリックで選択→Enterでソート
    header.focus();
    await userEvent.click(header);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(viewOrder(canvasElement)).toEqual(["c", "d", "a", "b"]));
    await expect(indicator()).toContain("🔼");

    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(viewOrder(canvasElement)).toEqual(["b", "a", "d", "c"]));
    await expect(indicator()).toContain("🔽");

    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(viewOrder(canvasElement)).toEqual(["a", "b", "c", "d"]));
    await expect(indicator()).not.toMatch(/[🔼🔽]/u);
  },
};

export const ColumnResizeByDrag: Story = {
  name: "列幅のハンドルをドラッグするとヘッダーとセルの幅が変わる",
  play: async ({ canvasElement }) => {
    const th = headerThOf(canvasElement, "num");
    const handle = within(th).getByRole("button", { name: "列の幅を調整" });
    const rect = handle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: handle, coords: { clientX: x, clientY: y } },
      { target: handle, coords: { clientX: x + 100, clientY: y } },
      { keys: "[/MouseLeft]", target: handle, coords: { clientX: x + 100, clientY: y } },
    ]);

    await waitFor(() => expect(th.style.width).toBe("250px"));
    const numCells = canvasElement.querySelectorAll<HTMLElement>('tbody td[data-col-index="1"]');
    await expect(numCells.length).toBe(4);
    for (const td of numCells) {
      await expect(td.style.width).toBe("250px");
    }
    await expect(headerThOf(canvasElement, "name").style.width).toBe("150px");
  },
};
