/**
 * 大容量モードで選べる文字コード。
 * UTF-16 系は対象外（行境界をバイト単位で探す `byteRowScanner` の前提を満たさないため）。
 *
 * メッセージ `large/init` の `encoding` は `string` のまま（webview 側の型を変えないため）。
 * provider はこの型の値を送る。
 */
export const LARGE_ENCODINGS = ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"] as const;

export type LargeEncoding = (typeof LARGE_ENCODINGS)[number];

/** TextDecoder に渡すラベル */
export type DecoderLabel = "utf-8" | "shift_jis" | "euc-jp";

export function isLargeEncoding(value: unknown): value is LargeEncoding {
  return typeof value === "string" && (LARGE_ENCODINGS as readonly string[]).includes(value);
}

/** TextDecoder のラベル。UTF-8(BOM) も utf-8 で読む（BOM は行インデックス側で飛ばす） */
export function decoderLabel(encoding: LargeEncoding): DecoderLabel {
  return encoding === "utf-8-bom" ? "utf-8" : encoding;
}

/**
 * 行インデックスの作成時に先頭の EF BB BF を BOM として飛ばすか。
 * UTF-8 系だけ true（UTF-8 を選んだファイルに BOM があっても内容に含めない）。
 * Shift_JIS / EUC-JP では EF BB BF は BOM ではないので飛ばさない。
 */
export function skipsBom(encoding: LargeEncoding): boolean {
  return encoding === "utf-8" || encoding === "utf-8-bom";
}
