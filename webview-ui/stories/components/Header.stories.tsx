import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, expect } from "@storybook/test";
import { useState } from "react";
import { Header } from "@/components/Header";
import { RowSizeType } from "@/types";

const meta = {
  title: "components/Header",
  component: Header,
  args: {
    isIgnoreHeaderRow: false,
    isEnabledRedo: true,
    isEnabledUndo: true,
    onSearch: fn(),
    onUndo: fn(),
    onRedo: fn(),
    onUpdateIgnoreHeaderRow: fn(),
    rowSize: "normal",
    onUpdateRowSize: fn(),
    onClickApply: fn(),
    showFilters: false,
    onToggleFilters: fn(),
    onClearFilters: fn(),
    hasActiveFilters: false,
  },
  render: function Render(args) {
    const [rowSize, setRowSize] = useState<RowSizeType>("normal");
    const [showFilters, setShowFilters] = useState(false);
    const [hasActiveFilters, setHasActiveFilters] = useState(false);
    
    return (
      <Header 
        {...args} 
        rowSize={rowSize} 
        onUpdateRowSize={setRowSize}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => setHasActiveFilters(false)}
      />
    );
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isIgnoreHeaderRow: false,
  },
};

export const DisabledUndoRedo: Story = {
  args: {
    isEnabledRedo: false,
    isEnabledUndo: false,
  },
};

export const OpenSlectRow: Story = {
  play: async ({ canvas }) => {
    const listbox = canvas.getByRole("listbox");
    const listItem = listbox.shadowRoot?.querySelector("div[class*='select-face']");
    await expect(listItem).toBeVisible();
    await userEvent.click(listItem!);
    const option = listbox.shadowRoot?.querySelector("div[class*=' dropdown ']");
    await expect(option).toBeVisible();
  },
};

export const WithFilters: Story = {
  args: {
    showFilters: true,
    hasActiveFilters: false,
  },
};

export const WithActiveFilters: Story = {
  args: {
    showFilters: true,
    hasActiveFilters: true,
  },
};

export const FilterToggleInteraction: Story = {
  play: async ({ canvas }) => {
    const filterButton = canvas.getByLabelText("toggle filters");
    await expect(filterButton).toBeVisible();
    await userEvent.click(filterButton);
  },
};
