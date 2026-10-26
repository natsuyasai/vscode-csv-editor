/**
 * 拡張機能が `large/init` の encoding で送る内部値 → 画面に出す表示名。
 * 表示名は拡張機能の文字コード選択（src/large/largePrompts.ts の ENCODING_ITEMS）のラベルと揃える。
 */
const ENCODING_LABELS: Readonly<Record<string, string>> = {
  "utf-8": "UTF-8",
  "utf-8-bom": "UTF-8 (BOM付き)",
  "shift_jis": "Shift_JIS",
  "euc-jp": "EUC-JP",
};

/** 文字コードの表示名。知らない値はそのまま返す */
export function toEncodingLabel(encoding: string): string {
  return Object.hasOwn(ENCODING_LABELS, encoding) ? ENCODING_LABELS[encoding] : encoding;
}
