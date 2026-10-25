import { detectCsvFormat, parseCsv, stringifyCsv, type CsvFormat } from "./csvFormat";

describe("parseCsv", () => {
  test("正常なCSVをパースできる", () => {
    const result = parseCsv("a,b\n1,2\n");
    expect(result).toEqual({
      ok: true,
      rows: [
        ["a", "b"],
        ["1", "2"],
      ],
      format: { delimiter: ",", eol: "\n", bom: false, trailingNewline: true },
    });
  });

  test("空ファイルは例外にならず空配列を返す", () => {
    expect(parseCsv("")).toMatchObject({ ok: true, rows: [] });
  });

  test("列数が不揃いな行は最大列数に合わせて空セルで補う", () => {
    const result = parseCsv("a,b,c\n1,2\n1,2,3,4\n");
    expect(result).toMatchObject({
      ok: true,
      rows: [
        ["a", "b", "c", ""],
        ["1", "2", "", ""],
        ["1", "2", "3", "4"],
      ],
    });
  });

  test("閉じていないクォートは失敗として行番号とメッセージを返す", () => {
    const result = parseCsv('a,b\n"x,1\n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CSV_QUOTE_NOT_CLOSED");
      expect(result.error.line).toBe(2);
      expect(result.error.message).toContain("Quote Not Closed");
    }
  });

  test("不正な位置のクォートは失敗として返す", () => {
    const result = parseCsv('a,"b"c\n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CSV_INVALID_CLOSING_QUOTE");
      expect(result.error.line).toBe(1);
    }
  });

  test("BOM付きでも先頭ヘッダー名にBOMが混入しない", () => {
    const result = parseCsv("﻿name,age\n1,2\n");
    expect(result).toMatchObject({
      ok: true,
      rows: [
        ["name", "age"],
        ["1", "2"],
      ],
    });
    expect(result.ok && result.format.bom).toBe(true);
  });
});

describe("detectCsvFormat", () => {
  test("CRLFを検出する", () => {
    expect(detectCsvFormat("a,b\r\n1,2\r\n")).toMatchObject({ eol: "\r\n", trailingNewline: true });
  });

  test("LFを検出する", () => {
    expect(detectCsvFormat("a,b\n1,2\n")).toMatchObject({ eol: "\n", trailingNewline: true });
  });

  test("改行が混在する場合は最初に現れた改行に合わせる", () => {
    expect(detectCsvFormat("a\r\nb\nc\n").eol).toBe("\r\n");
    expect(detectCsvFormat("a\nb\r\nc\r\n").eol).toBe("\n");
  });

  test("クォート内の改行は改行コードの判定に使わない", () => {
    expect(detectCsvFormat('"x\ny",b\r\n1,2\r\n').eol).toBe("\r\n");
  });

  test("BOMの有無を検出する", () => {
    expect(detectCsvFormat("﻿a,b\n").bom).toBe(true);
    expect(detectCsvFormat("a,b\n").bom).toBe(false);
  });

  test("末尾改行の有無を検出する", () => {
    expect(detectCsvFormat("a,b\n1,2").trailingNewline).toBe(false);
    expect(detectCsvFormat("a,b\n1,2\n").trailingNewline).toBe(true);
  });

  test("空テキストは既定書式(LF・BOMなし・末尾改行あり)", () => {
    expect(detectCsvFormat("")).toEqual({
      delimiter: ",",
      eol: "\n",
      bom: false,
      trailingNewline: true,
    });
  });
});

describe("stringifyCsv", () => {
  const rows = [
    ["a", "b"],
    ["1", "2"],
  ];
  const base: CsvFormat = { delimiter: ",", eol: "\n", bom: false, trailingNewline: true };

  test("LF・末尾改行あり", () => {
    expect(stringifyCsv(rows, base)).toBe("a,b\n1,2\n");
  });

  test("CRLF", () => {
    expect(stringifyCsv(rows, { ...base, eol: "\r\n" })).toBe("a,b\r\n1,2\r\n");
  });

  test("末尾改行なし", () => {
    expect(stringifyCsv(rows, { ...base, trailingNewline: false })).toBe("a,b\n1,2");
  });

  test("BOMあり", () => {
    expect(stringifyCsv(rows, { ...base, bom: true })).toBe("﻿a,b\n1,2\n");
  });

  test("空配列は空文字列", () => {
    expect(stringifyCsv([], base)).toBe("");
    expect(stringifyCsv([], { ...base, trailingNewline: false })).toBe("");
  });

  test("改行・カンマ・引用符を含むセルは必要時のみクォートされる", () => {
    expect(stringifyCsv([["x\ny", 'q"', "a,b", "plain"]], { ...base, eol: "\r\n" })).toBe(
      '"x\ny","q""","a,b",plain\r\n'
    );
  });
});
