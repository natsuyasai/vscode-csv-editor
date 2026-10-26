import { parseRow, stringifyRow } from "./rowCodec";

describe("stringifyRow", () => {
  it("通常のセルはそのまま区切り文字で連結する", () => {
    expect(stringifyRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("区切り文字を含むセルはクォートする", () => {
    expect(stringifyRow(["a,b", "c"])).toBe('"a,b",c');
  });

  it('ダブルクォートを含むセルはクォートし、`"` を `""` にする', () => {
    expect(stringifyRow(['say "hi"'])).toBe('"say ""hi"""');
  });

  it("LF・CRを含むセルはクォートする", () => {
    expect(stringifyRow(["a\nb", "c\rd", "e\r\nf"])).toBe('"a\nb","c\rd","e\r\nf"');
  });

  it("空セルと空白だけのセルはクォートしない", () => {
    expect(stringifyRow(["", " ", ""])).toBe(", ,");
  });

  it("delimiterを指定するとその文字で連結し、その文字を含むセルだけクォートする", () => {
    expect(stringifyRow(["a,b", "c\td"], { delimiter: "\t" })).toBe('a,b\t"c\td"');
  });

  it("空配列と空セル1個の行はどちらも空文字列になる（csv-stringifyと同じ）", () => {
    expect(stringifyRow([])).toBe("");
    expect(stringifyRow([""])).toBe("");
  });

  it("末尾に改行を付けない", () => {
    expect(stringifyRow(["a"]).endsWith("\n")).toBe(false);
  });
});

describe("parseRow", () => {
  it("区切り文字でセルに分割する", () => {
    expect(parseRow("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("空文字列は空セル1個になる", () => {
    expect(parseRow("")).toEqual([""]);
  });

  it("空セルを保持する（先頭・中間・末尾）", () => {
    expect(parseRow(",a,,")).toEqual(["", "a", "", ""]);
  });

  it("クォートされたセルは区切り文字を含められる", () => {
    expect(parseRow('"a,b",c')).toEqual(["a,b", "c"]);
  });

  it('クォート内の `""` は `"` になる', () => {
    expect(parseRow('"say ""hi"""')).toEqual(['say "hi"']);
  });

  it("クォート内の改行(LF/CR/CRLF)を保持する", () => {
    expect(parseRow('"a\nb","c\rd","e\r\nf"')).toEqual(["a\nb", "c\rd", "e\r\nf"]);
  });

  it("クォートされた空セルは空文字になる", () => {
    expect(parseRow('"",a')).toEqual(["", "a"]);
  });

  it("末尾の改行(LF/CRLF)を1つだけ無視する", () => {
    expect(parseRow("a,b\n")).toEqual(["a", "b"]);
    expect(parseRow("a,b\r\n")).toEqual(["a", "b"]);
    expect(parseRow('"a\n"\n')).toEqual(["a\n"]);
  });

  it("delimiterを指定できる", () => {
    expect(parseRow("a,b\tc", { delimiter: "\t" })).toEqual(["a,b", "c"]);
  });

  it("閉じられていないクォートはエラー", () => {
    expect(() => parseRow('"abc')).toThrow();
  });

  it("閉じクォートの後に文字が続くとエラー", () => {
    expect(() => parseRow('"a"b')).toThrow();
  });

  it("クォートされていないセル内のダブルクォートはエラー", () => {
    expect(() => parseRow('a"b')).toThrow();
  });

  it("クォート外の改行（複数レコード）はエラー", () => {
    expect(() => parseRow("a\nb")).toThrow();
    expect(() => parseRow("a\rb")).toThrow();
  });
});

describe("空行の仕様", () => {
  it("[] は書き出すと空文字になり、パースすると [''] になる（往復で区別できない）", () => {
    expect(parseRow(stringifyRow([]))).toEqual([""]);
  });

  it("[''] は往復で保たれる", () => {
    expect(parseRow(stringifyRow([""]))).toEqual([""]);
  });
});
