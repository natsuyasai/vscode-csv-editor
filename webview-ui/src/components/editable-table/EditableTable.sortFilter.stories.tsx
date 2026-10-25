import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { EditableTable } from "@/components/editable-table/EditableTable";

/**
 * ソート・フィルター適用中の表示位置整合性 (issue #79)
 *
 * データ順: a(3), b(12), c(1), d(2)
 * num昇順ソート後の表示順: c(1), d(2), a(3), b(12)
 */
const meta = {
  title: "components/editable-table/EditableTable/SortFilter",
  component: EditableTable,
  decorators: [
    (Story) => (
      <div style={{ height: "400px", width: "600px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    csvArray: [
      ["name", "num"],
      ["a", "3"],
      ["b", "12"],
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

const cellOf = (canvasElement: HTMLElement, name: string, colIdx = 0) => {
  const tr = Array.from(canvasElement.querySelectorAll("tbody tr")).find(
    (row) => row.querySelector('td:nth-child(2) > div[role="button"]')?.textContent === name
  );
  const cell = tr?.querySelector<HTMLElement>(`td:nth-child(${colIdx + 2}) > div[role="button"]`);
  if (!cell) throw new Error(`cell ${name} not found`);
  return cell;
};

const sortByNum = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const header = canvas.getByText("num").closest<HTMLElement>("[tabindex]")!;
  // フォーカス→クリックで選択→Enterでソート
  header.focus();
  await userEvent.click(header);
  await userEvent.keyboard("{Enter}");
  await waitFor(() => expect(viewOrder(canvasElement)).toEqual(["c", "d", "a", "b"]));
};

export const SortedRowSelection: Story = {
  name: "ソート中の行選択ハイライト",
  play: async ({ canvasElement }) => {
    await sortByNum(canvasElement);
    const tr = cellOf(canvasElement, "d").closest("tr")!;
    await userEvent.click(tr.querySelector<HTMLElement>('td:first-child [role="button"]')!);
    await waitFor(() => {
      const selected = Array.from(canvasElement.querySelectorAll("tbody tr")).filter((row) =>
        (row.querySelector("td") as HTMLElement).style.backgroundColor.includes(
          "activeSelectionBackground"
        )
      );
      expect(selected).toEqual([tr]);
    });
  },
};

export const SortedArrowKeyNavigation: Story = {
  name: "ソート中の矢印キー移動は表示順",
  play: async ({ canvasElement }) => {
    await sortByNum(canvasElement);
    await userEvent.click(cellOf(canvasElement, "c"));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toBe(cellOf(canvasElement, "d")));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toBe(cellOf(canvasElement, "a")));
    await userEvent.keyboard("{ArrowUp}");
    await waitFor(() => expect(document.activeElement).toBe(cellOf(canvasElement, "d")));
  },
};

export const SortedRangeSelection: Story = {
  name: "ソート中の範囲選択は表示されている行が対象",
  play: async ({ canvasElement }) => {
    await sortByNum(canvasElement);
    // 表示上 c → a (間の d を含む3行) を範囲選択
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: cellOf(canvasElement, "c") },
      { target: cellOf(canvasElement, "a") },
      { keys: "[/MouseLeft]" },
    ]);
    // 選択された3セル(c, d, a)にフィルハンドルが表示され、範囲外の b には表示されない
    await waitFor(() => {
      const handles = canvasElement.querySelectorAll('[aria-label="Auto fill handle"]');
      expect(handles.length).toBe(3);
      expect(
        cellOf(canvasElement, "b").querySelector('[aria-label="Auto fill handle"]')
      ).toBeNull();
    });
  },
};

export const FilteredArrowKeyNavigation: Story = {
  name: "フィルター中の矢印キー移動は表示行の範囲内",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // フィルター行を表示してnum列に "2" を入力 → b(12), d(2) が表示される
    // (フィルター表示ボタンはヘッダーのツールバー内)
    await userEvent.click(canvas.getByRole("button", { name: "toggle filters" }));
    const inputs = canvas.getAllByPlaceholderText("フィルター...");
    await userEvent.type(inputs[inputs.length - 1], "2");
    await waitFor(() => expect(viewOrder(canvasElement)).toEqual(["b", "d"]));

    await userEvent.click(cellOf(canvasElement, "b"));
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toBe(cellOf(canvasElement, "d")));
    // 最終表示行より下へは進まない
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(document.activeElement).toBe(cellOf(canvasElement, "d")));
  },
};
