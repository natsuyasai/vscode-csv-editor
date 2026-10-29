/**
 * 表示位置とデータ位置の変換
 *
 * - 表示位置(view index): ソート・フィルター適用後の `table.getRowModel().rows` 上の位置。
 *   セル選択・フォーカス・検索結果・オートフィルなど「画面上の並び」を基準にする状態はこちらで持つ。
 * - データ位置(data index): 元データ(`TanStack Table` の `row.index`)上の位置。
 *   CSV配列への書き込み、行の挿入/削除、行の高さなど「行の実体」に紐づく操作はこちらを使う。
 *
 * 両者の変換はこのモジュールに集約する。
 */
export interface RowIndexMapper {
  /** 表示されている行数 */
  readonly viewRowCount: number;
  /** 表示位置 → データ位置。範囲外は undefined */
  toDataIndex: (viewIndex: number) => number | undefined;
  /** データ位置 → 表示位置。フィルターで非表示の場合などは undefined */
  toViewIndex: (dataIndex: number) => number | undefined;
}

/**
 * 表示行(`table.getRowModel().rows`)から変換器を作成する
 */
export const createRowIndexMapper = (rows: ReadonlyArray<{ index: number }>): RowIndexMapper => {
  const viewToData = rows.map((row) => row.index);
  const dataToView = new Map<number, number>();
  viewToData.forEach((dataIndex, viewIndex) => dataToView.set(dataIndex, viewIndex));

  return {
    viewRowCount: viewToData.length,
    toDataIndex: (viewIndex) => viewToData[viewIndex],
    toViewIndex: (dataIndex) => dataToView.get(dataIndex),
  };
};

/**
 * ソート・フィルターを適用していない場合の変換器（表示位置とデータ位置が一致する）
 */
export const identityRowIndexMapper: RowIndexMapper = {
  viewRowCount: Number.POSITIVE_INFINITY,
  toDataIndex: (viewIndex) => (viewIndex >= 0 ? viewIndex : undefined),
  toViewIndex: (dataIndex) => (dataIndex >= 0 ? dataIndex : undefined),
};
