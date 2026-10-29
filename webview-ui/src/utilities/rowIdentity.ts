/**
 * CSVの行(string[])に紐づく行ID。
 * 行IDは行の読み込み・追加時にだけ振られ、編集で行配列が作り直されても inheritRowId で引き継ぐ。
 * 行配列の参照をキーにするため、Undo/Redoで過去の行配列に戻ると行IDも元に戻る。
 */
const rowIds = new WeakMap<readonly string[], string>();

/** 行の行IDを返す。未採番の行(読み込み直後・追加直後)には新しい行IDを振る */
export function getRowId(row: readonly string[]): string {
  let id = rowIds.get(row);
  if (id === undefined) {
    id = crypto.randomUUID();
    rowIds.set(row, id);
  }
  return id;
}

/** 編集で作り直した行 `to` に、元の行 `from` の行IDを引き継ぐ */
export function inheritRowId<T extends string[]>(from: readonly string[], to: T): T {
  rowIds.set(to, getRowId(from));
  return to;
}
