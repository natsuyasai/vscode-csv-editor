import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomHeaderCell } from "@/components/Header/CustomHeaderCell";

const meta = {
  title: "components/CustomHeaderCell",
  component: CustomHeaderCell,
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div
          style={{
            display: "grid",
            margin: "8px",
            width: "200px",
            height: "40px",
            border: "1px solid #ccc",
          }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
  args: {
    column: {
      idx: 0,
      key: "test-column",
      name: "テストカラム",
      width: 120,
      minWidth: 50,
      maxWidth: undefined,
      resizable: true,
      sortable: true,
      frozen: false,
      renderCell: () => null,
      renderHeaderCell: () => null,
      headerCellClass: undefined,
      cellClass: undefined,
      parent: undefined,
      level: 0,
      colSpan: undefined,
      editable: true,
      draggable: true,
    },
    sortDirection: undefined,
    priority: undefined,
    isIgnoreHeaderRow: false,
    sortColumnsForWaitingDoubleClick: [],
    onHeaderCellContextMenu: fn(),
    onHeaderEdit: fn(),
    onKeyDown: fn(),
    onCanSortColumnsChange: fn(),
    onDoubleClick: fn(),
    tabIndex: 0,
    showFilters: false,
    filterValue: "",
    onFilterChange: fn(),
    onFilterClear: fn(),
    isFilterActive: false,
  },
} satisfies Meta<typeof CustomHeaderCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSortAsc: Story = {
  args: {
    sortDirection: "ASC",
    priority: 1,
  },
};

export const WithSortDesc: Story = {
  args: {
    sortDirection: "DESC",
    priority: 1,
  },
};

export const IgnoreHeaderRow: Story = {
  args: {
    isIgnoreHeaderRow: true,
  },
};

export const WithFilter: Story = {
  args: {
    showFilters: true,
  },
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div
          style={{
            display: "grid",
            margin: "8px",
            width: "200px",
            height: "60px",
            border: "1px solid #ccc",
          }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
};

export const WithActiveFilter: Story = {
  args: {
    showFilters: true,
    filterValue: "フィルター値",
    isFilterActive: true,
  },
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div
          style={{
            display: "grid",
            margin: "8px",
            width: "200px",
            height: "60px",
            border: "1px solid #ccc",
          }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
};

export const SortedWithFilter: Story = {
  args: {
    sortDirection: "ASC",
    priority: 1,
    showFilters: true,
    filterValue: "テスト",
    isFilterActive: true,
  },
  decorators: [
    (Story) => (
      <DndProvider backend={HTML5Backend}>
        <div
          style={{
            display: "grid",
            margin: "8px",
            width: "200px",
            height: "60px",
            border: "1px solid #ccc",
          }}>
          <Story />
        </div>
      </DndProvider>
    ),
  ],
};
