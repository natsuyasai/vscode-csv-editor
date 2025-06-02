import { Column } from "react-data-grid";

export type RowSizeType = "small" | "normal" | "large" | "extra large";
export const ROW_IDX_KEY = "_csv_row_index";
export const ROW_ID_KEY = "_csv_row_id_key";

export const ROW_IDX_COL: Column<Record<string, string>> = {
  frozen: true,
  key: ROW_IDX_KEY,
  name: "",
  resizable: false,
  width: 40,
  editable: false,
  sortable: false,
  draggable: false,
  cellClass: "csv-row-index",
};
