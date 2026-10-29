import { escapeTsvCell, parseTsv, toTsv } from "./tsv";

describe("escapeTsvCell", () => {
  test("改行・タブ・ダブルクォートを含まない値はそのまま返す", () => {
    expect(escapeTsvCell("abc")).toBe("abc");
    expect(escapeTsvCell("")).toBe("");
    expect(escapeTsvCell("a,b")).toBe("a,b");
  });

  test("改行・タブを含む値はダブルクォートで囲む", () => {
    expect(escapeTsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeTsvCell("a\tb")).toBe('"a\tb"');
  });

  test("ダブルクォートは2つ重ねて、値全体をダブルクォートで囲む", () => {
    expect(escapeTsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("toTsv", () => {
  test("セルをタブ、行を LF でつなぐ（末尾に改行を付けない）", () => {
    expect(
      toTsv([
        ["a", "b"],
        ["c", "d"],
      ])
    ).toBe("a\tb\nc\td");
  });

  test("各セルをエスケープする", () => {
    expect(toTsv([['x"y', "1\n2"]])).toBe('"x""y"\t"1\n2"');
  });

  test("行が無ければ空文字", () => {
    expect(toTsv([])).toBe("");
  });
});

describe("parseTsv", () => {
  test("タブと LF で区切る", () => {
    expect(parseTsv("a\tb\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("CRLF も行区切りとして扱う", () => {
    expect(parseTsv("a\tb\r\nc\td\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("末尾の改行で空の行を作らない", () => {
    expect(parseTsv("a\n")).toEqual([["a"]]);
  });

  test("クォート内の改行・タブ・二重のダブルクォートを値として読む", () => {
    expect(parseTsv('"1\n2"\t"a\tb"\t"x""y"')).toEqual([["1\n2", "a\tb", 'x"y']]);
  });

  test("空文字は行なし", () => {
    expect(parseTsv("")).toEqual([]);
  });

  test("toTsv の結果を元の行に戻せる", () => {
    const rows = [
      ["a", 'q"q', ""],
      ["x\ny", "t\tt", "z"],
    ];
    expect(parseTsv(toTsv(rows))).toEqual(rows);
  });
});
