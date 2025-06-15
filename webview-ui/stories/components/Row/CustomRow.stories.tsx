import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { CustomRow } from "@/components/Row/CustomRow";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";
import { DataGrid } from "react-data-grid";
import { DataGridContext } from "@/contexts/dataGridContext";

const meta = {
  title: "components/CustomRow",
  component: CustomRow,
  args: {
    rowKey: "row-1",
    row: {
      [ROW_ID_KEY]: "row-1",
      [ROW_IDX_KEY]: "0",
      column1: "サンプルデータ1",
      column2: "サンプルデータ2",
      column3: "サンプルデータ3",
    },
    rowIdx: 0,
    viewportColumns: [
      {
        idx: 0,
        key: ROW_IDX_KEY,
        name: "#",
        width: 60,
        minWidth: 40,
        maxWidth: undefined,
        resizable: false,
        sortable: false,
        frozen: true,
        renderCell: (props) => <div>{props.row[props.column.key]}</div>,
        renderHeaderCell: fn(),
        headerCellClass: undefined,
        cellClass: undefined,
        parent: undefined,
        level: 0,
        colSpan: undefined,
        editable: false,
        draggable: false,
      },
      {
        idx: 1,
        key: "column1",
        name: "カラム1",
        width: 120,
        minWidth: 50,
        maxWidth: undefined,
        resizable: true,
        sortable: true,
        frozen: false,
        renderCell: (props) => <div>{props.row[props.column.key]}</div>,
        renderHeaderCell: fn(),
        headerCellClass: undefined,
        cellClass: undefined,
        parent: undefined,
        level: 0,
        colSpan: undefined,
        editable: true,
        draggable: true,
      },
      {
        idx: 2,
        key: "column2",
        name: "カラム2",
        width: 120,
        minWidth: 50,
        maxWidth: undefined,
        resizable: true,
        sortable: true,
        frozen: false,
        renderCell: (props) => <div>{props.row[props.column.key]}</div>,
        renderHeaderCell: fn(),
        headerCellClass: undefined,
        cellClass: undefined,
        parent: undefined,
        level: 0,
        colSpan: undefined,
        editable: true,
        draggable: true,
      },
    ],
    isRowSelected: false,
    lastFrozenColumnIndex: 0,
    draggedOverCellIdx: undefined,
    onRowChange: fn(),
    rowClass: undefined,
    selectCell: fn(),
    selectedCellIdx: -1,
    selectedCellEditor: undefined,
    setDraggedOverRowIdx: undefined,
    isRowSelectionDisabled: false,
    gridRowStart: 1,
    onUpdateRowHeight: fn(),
    onRowReorder: fn(),
  },
  render: (args) => {
    const sampleRows = [args.row];
    const sampleColumns = args.viewportColumns;

    return (
      <DndProvider backend={HTML5Backend}>
        <DataGridContext.Provider value={null}>
          <DataGrid
            className="rdg-light"
            columns={sampleColumns}
            rows={sampleRows}
            headerRowHeight={35}
            rowHeight={35}
            rowKeyGetter={(row) => row[ROW_ID_KEY]}
            renderers={{
              renderRow: (key, props) => (
                <CustomRow
                  key={key}
                  {...props}
                  rowKey={key}
                  onUpdateRowHeight={fn()}
                  onRowReorder={fn()}
                />
              ),
            }}
          />
        </DataGridContext.Provider>
      </DndProvider>
    );
  },
} satisfies Meta<typeof CustomRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Selected: Story = {
  args: {
    isRowSelected: true,
  },
};

export const WithLongContent: Story = {
  args: {
    row: {
      [ROW_ID_KEY]: "row-1",
      [ROW_IDX_KEY]: "0",
      column1: "これは非常に長いテキストのサンプルです",
      column2: "セルの幅を超える場合の表示テスト",
      column3: "行の高さが調整されるかを確認",
    },
  },
};

export const DifferentRowIndex: Story = {
  args: {
    rowIdx: 5,
    row: {
      [ROW_ID_KEY]: "row-6",
      [ROW_IDX_KEY]: "5",
      column1: "6行目のデータ",
      column2: "インデックス5",
      column3: "行番号表示テスト",
    },
  },
};
