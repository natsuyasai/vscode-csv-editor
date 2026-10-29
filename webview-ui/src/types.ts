export type RowSizeType = "small" | "normal" | "large" | "extra large";

export type VerticalAlignment = "top" | "center" | "bottom";
export type HorizontalAlignment = "left" | "center" | "right";

export interface CellAlignment {
  vertical: VerticalAlignment;
  horizontal: HorizontalAlignment;
}

export type ColumnAlignments = Record<string, CellAlignment>;

export const ROW_IDX_KEY = "_csv_row_index";
export const ROW_ID_KEY = "_csv_row_id_key";
