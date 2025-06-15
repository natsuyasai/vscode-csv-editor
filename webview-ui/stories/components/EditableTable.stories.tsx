import type { Meta, StoryObj } from "@storybook/react";
import { fn, expect, userEvent, within } from "@storybook/test";

import { EditableTable } from "@/components/EditableTable";
import { Canvas } from "storybook/internal/types";
import { RowSizeType } from "@/types";

const meta = {
  title: "components/EditableTable",
  component: EditableTable,
  args: {
    csvArray: [
      ["A", "B", "CCCCCCCCCCCCCCCCC", "D", "E"],
      ["1", "11", "111", "1111", "1\n1\n1\n1\n1"],
      ["2", "22", "222", "2222", "22222"],
      ["", "", "", "", ""],
      ["3", "33", "333", "3333", "33333"],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["4", "44", "444", "4444", "44444"],
      ["", "", "", "", ""],
    ],
    theme: "light",
    setCSVArray: fn(),
    onApply: fn(),
  },
} satisfies Meta<typeof EditableTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const headercell = canvas.getAllByRole("columnheader");
    await expect(headercell.length).toBe(6);
    const cell = canvas.getAllByRole("cell");
    await expect(cell.length).toBe(6);
    await expect(cell[0]).toHaveTextContent("");
    await expect(cell[1]).toHaveTextContent("A");
    await expect(cell[2]).toHaveTextContent("B");
    await expect(cell[3]).toHaveTextContent("CCCCCCCCCCCCCCCCC");
    await expect(cell[4]).toHaveTextContent("D");
    await expect(cell[5]).toHaveTextContent("E");
  },
};

export const IgnoreHeaderRow: Story = {
  play: async ({ canvas }) => {
    const checkbox = canvas.getByLabelText("Ignore Header Row");
    await expect(checkbox).toBeVisible();
    await userEvent.click(checkbox.shadowRoot!.querySelector("label")!);
    const headercell = canvas.getAllByRole("columnheader");
    await expect(headercell.length).toBe(6);
    const cell = canvas.getAllByRole("cell");
    await expect(cell.length).toBe(6);
    await expect(cell[0]).toHaveTextContent("");
    await expect(cell[1]).toHaveTextContent("");
    await expect(cell[2]).toHaveTextContent("");
    await expect(cell[3]).toHaveTextContent("");
    await expect(cell[4]).toHaveTextContent("");
    await expect(cell[5]).toHaveTextContent("");
  },
};

async function setRowSize(canvas: Canvas, rowSize: RowSizeType) {
  const listbox = canvas.getByRole("listbox");
  const listItem = listbox.shadowRoot?.querySelector("div[class*='select-face']");
  await expect(listItem).toBeVisible();
  await userEvent.click(listItem!);
  const dropdown = listbox.shadowRoot?.querySelector("div[class*=' dropdown ']");
  await expect(dropdown).toBeVisible();
  const option = dropdown!.querySelector("ul[class*='options']");
  const item = [...(option?.querySelectorAll("li") ?? [])].filter(
    (li) => (li.textContent?.indexOf(rowSize) ?? -1) >= 0
  )[0];
  await userEvent.click(item);
}

export const RowSize_small: Story = {
  play: async ({ canvas }) => setRowSize(canvas, "small"),
};

export const RowSize_normal: Story = {
  play: async ({ canvas }) => setRowSize(canvas, "normal"),
};

export const RowSize_large: Story = {
  play: async ({ canvas }) => setRowSize(canvas, "large"),
};

export const RowSize_extra_large: Story = {
  play: async ({ canvas }) => setRowSize(canvas, "extra large"),
};

export const SelectedRow: Story = {
  play: async ({ canvas }) => {
    const cells = canvas.getAllByRole("gridcell");
    const indexCells = cells.filter((cell) => cell.getAttribute("aria-colindex") === "1");
    await userEvent.click(indexCells[1]);
    const rows = canvas.getAllByRole("row");
    await expect(rows[2]).toHaveAttribute("aria-selected", "true");
  },
};

export const SearchText: Story = {
  play: async () => {
    // 検索フォームを表示して検索実施
    const body = within(document.body);
    const searchButton = body.getByRole("button", { name: "search" });
    await userEvent.click(searchButton);
    const input = body.getByRole("searchbox");
    await userEvent.type(input, "1");
    await userEvent.keyboard("{Enter}");

    // 意図した件数ヒットすること
    const searchStatus = body.getByText("1 of 5");
    await expect(searchStatus).toBeVisible();

    // 次の結果に移動できること
    const nextButton = body.getByRole("button", { name: "Next search result" });
    await expect(nextButton).toBeEnabled();
    await userEvent.click(nextButton);
    const nextSearchStatus = body.getByText("2 of 5");
    await expect(nextSearchStatus).toBeVisible();
  },
};

export const Empty: Story = {
  args: {
    csvArray: [],
  },
};

export const Light: Story = {
  args: {
    theme: "light",
  },
};

export const Dark: Story = {
  args: {
    theme: "dark",
  },
};

export const EmptyData: Story = {
  args: {
    csvArray: [["Column 1", "Column 2", "Column 3"]],
  },
};

export const LargeDataset: Story = {
  args: {
    csvArray: [
      ["ID", "Name", "Email", "Department", "Salary", "StartDate", "Status"],
      ...Array.from({ length: 100 }, (_, i) => [
        String(i + 1),
        `Employee ${i + 1}`,
        `employee${i + 1}@company.com`,
        ["Engineering", "Marketing", "Sales", "HR"][i % 4],
        String(50000 + i * 1000),
        `2023-0${(i % 12) + 1}-01`,
        ["Active", "Inactive"][i % 2],
      ]),
    ],
  },
};

export const JapaneseData: Story = {
  args: {
    csvArray: [
      ["名前", "年齢", "都市", "国"],
      ["田中太郎", "30", "東京", "日本"],
      ["佐藤花子", "25", "大阪", "日本"],
      ["鈴木一郎", "35", "名古屋", "日本"],
      ["高橋美子", "28", "福岡", "日本"],
      ["渡辺健太", "32", "札幌", "日本"],
    ],
  },
};

export const FilterToggle: Story = {
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await expect(filterButton).toBeVisible();
    await userEvent.click(filterButton);
    
    // フィルター入力フィールドが表示されること
    const filterInputs = canvas.queryAllByPlaceholderText("filter...");
    await expect(filterInputs.length).toBeGreaterThan(0);
  },
};

export const FilterInput: Story = {
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // フィルター入力フィールドに値を入力
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const firstFilterInput = filterInputs[1]; // 最初の列（行番号以外）のフィルター
    
    await userEvent.type(firstFilterInput, "1");
    await expect(firstFilterInput).toHaveValue("1");
    
    // クリアボタンが表示されること
    const clearButton = canvas.getByTitle("Clear Filter");
    await expect(clearButton).toBeVisible();
  },
};

export const FilterClear: Story = {
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // フィルター入力フィールドに値を入力
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const firstFilterInput = filterInputs[1];
    
    await userEvent.type(firstFilterInput, "test");
    
    // クリアボタンをクリック
    const clearButton = canvas.getByTitle("Clear Filter");
    await userEvent.click(clearButton);
    
    // 入力値がクリアされること
    await expect(firstFilterInput).toHaveValue("");
  },
};

export const FilterKeyboardNavigation: Story = {
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // フィルター入力フィールドにフォーカス
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const firstFilterInput = filterInputs[1];
    
    await userEvent.click(firstFilterInput);
    await userEvent.type(firstFilterInput, "test");
    
    // Escapeキーでクリア
    await userEvent.keyboard("{Escape}");
    await expect(firstFilterInput).toHaveValue("");
  },
};

export const FilterAndSearch: Story = {
  args: {
    csvArray: [
      ["名前", "年齢", "部署"],
      ["田中太郎", "30", "Engineering"],
      ["田中花子", "25", "Marketing"],
      ["佐藤太郎", "35", "Sales"],
      ["山田一郎", "28", "Engineering"],
    ],
  },
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // 名前列でAND検索
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const nameFilterInput = filterInputs[1]; // 名前列のフィルター
    
    await userEvent.type(nameFilterInput, "田中 太郎");
    await expect(nameFilterInput).toHaveValue("田中 太郎");
  },
};

export const FilterOrSearch: Story = {
  args: {
    csvArray: [
      ["部署", "ステータス"],
      ["Engineering", "Active"],
      ["Marketing", "Inactive"],
      ["Sales", "Active"],
      ["HR", "Active"],
    ],
  },
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // 部署列でOR検索
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const deptFilterInput = filterInputs[1]; // 部署列のフィルター
    
    await userEvent.type(deptFilterInput, "Engineering or Marketing");
    await expect(deptFilterInput).toHaveValue("Engineering or Marketing");
  },
};

export const FilterZenkakuHankaku: Story = {
  args: {
    csvArray: [
      ["商品名", "価格"],
      ["ProductＡ", "１００"],
      ["ProductA", "100"],
      ["ProductＢ", "２００"],
      ["ProductB", "200"],
    ],
  },
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // 商品名列で全角検索（半角もマッチする）
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const productFilterInput = filterInputs[1]; // 商品名列のフィルター
    
    await userEvent.type(productFilterInput, "ProductＡ");
    await expect(productFilterInput).toHaveValue("ProductＡ");
  },
};

export const FilterExactMatch: Story = {
  args: {
    csvArray: [
      ["ステータス", "コメント"],
      ["Active", "User is active"],
      ["Inactive", "User is inactive"],
      ["act", "Short action"],
      ["Active User", "Extended status"],
    ],
  },
  play: async ({ canvas }) => {
    // フィルターボタンをクリックしてフィルターを表示
    const filterButton = canvas.getByLabelText("toggle filters");
    await userEvent.click(filterButton);
    
    // ステータス列でダブルクオート完全一致検索
    const filterInputs = canvas.getAllByPlaceholderText("filter...");
    const statusFilterInput = filterInputs[1]; // ステータス列のフィルター
    
    await userEvent.type(statusFilterInput, '"Active"');
    await expect(statusFilterInput).toHaveValue('"Active"');
  },
};