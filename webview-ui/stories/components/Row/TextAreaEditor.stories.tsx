import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import TextAreaEditor from "@/components/Row/TextAreaEditor";
import { DataGridContext } from "@/contexts/dataGridContext";

const meta = {
  title: "components/TextAreaEditor",
  component: TextAreaEditor,
  decorators: [
    (Story) => (
      <DataGridContext.Provider value={null}>
        <div style={{ padding: "20px", border: "1px solid #ccc", width: "200px" }}>
          <Story />
        </div>
      </DataGridContext.Provider>
    ),
  ],
  args: {
    row: {
      "test-column": "編集可能なテキスト",
      "column2": "その他のデータ",
    },
    rowIdx: 0,
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
      renderCell: fn(),
      renderHeaderCell: fn(),
      headerCellClass: undefined,
      cellClass: undefined,
      parent: undefined,
      level: 0,
      colSpan: undefined,
      editable: true,
      draggable: true,
    },
    onRowChange: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof TextAreaEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyValue: Story = {
  args: {
    row: {
      "test-column": "",
      "column2": "その他のデータ",
    },
  },
};

export const LongText: Story = {
  args: {
    row: {
      "test-column":
        "これは非常に長いテキストのサンプルです。\n複数行にわたるテキストで、\nテキストエリアの動作をテストします。",
      "column2": "その他のデータ",
    },
  },
};

export const MultilineText: Story = {
  args: {
    row: {
      "test-column": "行1\n行2\n行3\n行4\n行5",
      "column2": "その他のデータ",
    },
  },
};
