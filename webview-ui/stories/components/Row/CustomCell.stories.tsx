import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataGrid } from "react-data-grid";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { fn } from "storybook/test";
import { CustomCell } from "@/components/Row/CustomCell";
import { DataGridContext } from "@/contexts/dataGridContext";
import { ROW_ID_KEY, ROW_IDX_COL, ROW_IDX_KEY } from "@/types";

const columnDef = {
  idx: 1,
  key: "",
  name: "",
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
};
const meta = {
  title: "components/CustomCell",
  component: CustomCell,
  args: {
    cellKey: "test-cell",
    row: {
      [ROW_ID_KEY]: "row-1",
      [ROW_IDX_KEY]: "1",
      col0: "サンプルデータ",
      col1: "その他のデータ",
    },
    rowIdx: 0,
    column: {
      idx: 1,
      key: "col0",
      name: "Header1",
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
    isCellSelected: false,
    colSpan: undefined,
    isDraggedOver: false,
    onRowChange: fn(),
    selectCell: fn(),
    onClick: fn(),
    onDoubleClick: fn(),
    onContextMenu: fn(),
    onUpdateRowHeight: fn(),
    onClickRow: fn(),
  },
  render: (args) => {
    const sampleRows = [args.row];
    const sampleColumns = [
      ROW_IDX_COL,
      { ...args.column },
      { ...columnDef, idx: 2, key: "col1", name: "Header2" },
    ];

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
              renderCell: (key, props) => (
                <CustomCell
                  key={key}
                  {...props}
                  cellKey={key}
                  onUpdateRowHeight={fn()}
                  onClickRow={fn()}
                  isSearchTarget={args.isSearchTarget}
                />
              ),
            }}
          />
        </DataGridContext.Provider>
      </DndProvider>
    );
  },
} satisfies Meta<typeof CustomCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Selected: Story = {
  args: {
    isCellSelected: true,
  },
};

export const SearchTarget: Story = {
  args: {
    isSearchTarget: true,
  },
};

export const RowIndexColumn: Story = {
  args: {
    column: {
      ...columnDef,
      idx: 0,
      key: ROW_IDX_KEY,
      name: "#",
      width: 60,
      minWidth: 40,
      resizable: false,
      sortable: false,
      frozen: true,
      editable: false,
      draggable: false,
    },
  },
};
