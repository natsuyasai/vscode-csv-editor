import { RowSizeType } from "@/types";
import { Canvas } from "storybook/internal/types";
import { expect, userEvent } from "@storybook/test";

export async function setRowSize(canvas: Canvas, rowSize: RowSizeType) {
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
