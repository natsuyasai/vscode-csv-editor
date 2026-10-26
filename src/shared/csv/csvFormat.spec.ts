import { BOM, DEFAULT_CSV_FORMAT, detectCsvFormat } from "./csvFormat";

describe("detectCsvFormat (shared)", () => {
  test("空テキストは既定書式のコピーを返す", () => {
    const format = detectCsvFormat("");
    expect(format).toEqual(DEFAULT_CSV_FORMAT);
    expect(format).not.toBe(DEFAULT_CSV_FORMAT);
  });

  test("BOM・CRLF・末尾改行を検出する", () => {
    expect(detectCsvFormat(`${BOM}a,b\r\n1,2\r\n`)).toEqual({
      delimiter: ",",
      eol: "\r\n",
      bom: true,
      trailingNewline: true,
    });
  });

  test("クォート内の改行は無視し、末尾改行なしを検出する", () => {
    expect(detectCsvFormat('"a\r\nb",c\n1,2')).toMatchObject({
      eol: "\n",
      bom: false,
      trailingNewline: false,
    });
  });
});
