import type { Meta, StoryObj } from "@storybook/react";
import { fn, expect, userEvent } from "@storybook/test";

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

export const Empty: Story = {
  args: {
    csvArray: [],
  },
};
