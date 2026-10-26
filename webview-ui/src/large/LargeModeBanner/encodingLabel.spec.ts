import { toEncodingLabel } from "./encodingLabel";

describe("toEncodingLabel", () => {
  // 表示名は拡張機能の文字コード選択（largePrompts.ts の ENCODING_ITEMS）のラベルと同じ
  test.each([
    ["utf-8", "UTF-8"],
    ["utf-8-bom", "UTF-8 (BOM付き)"],
    ["shift_jis", "Shift_JIS"],
    ["euc-jp", "EUC-JP"],
  ])("%s は %s と表示する", (encoding, label) => {
    expect(toEncodingLabel(encoding)).toBe(label);
  });

  test("知らない値はそのまま表示する", () => {
    expect(toEncodingLabel("windows-1252")).toBe("windows-1252");
    expect(toEncodingLabel("UTF-8")).toBe("UTF-8");
  });
});
