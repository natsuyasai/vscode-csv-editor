import { parseCsv } from "./csvFormat";

describe("parseCsv", () => {
  test("正常なCSVをパースできる", () => {
    const result = parseCsv("a,b\n1,2\n");
    expect(result).toEqual({
      ok: true,
      rows: [
        ["a", "b"],
        ["1", "2"],
      ],
    });
  });

  test("空ファイルは例外にならず空配列を返す", () => {
    expect(parseCsv("")).toEqual({ ok: true, rows: [] });
  });

  test("列数が不揃いな行は最大列数に合わせて空セルで補う", () => {
    const result = parseCsv("a,b,c\n1,2\n1,2,3,4\n");
    expect(result).toEqual({
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
});
