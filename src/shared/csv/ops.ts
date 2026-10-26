/** 行単位の差分操作。行番号はヘッダー行を含むファイル上の行番号（0始まり） */
export type RowOp = {
  type: "replaceRows";
  start: number;
  deleteCount: number;
  rows: string[][];
};
