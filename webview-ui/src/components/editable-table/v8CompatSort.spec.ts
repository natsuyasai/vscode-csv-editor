import { compareByV8SortKind, selectV8AutoSortKind } from "./v8CompatSort";

/**
 * @tanstack/react-table v8 の既定ソート(sortingFn: "auto")と同じ並びを保つための関数のテスト。
 * v8 は自動判定の標本に filteredRows.slice(10)（先頭10行を除いた残り）を使っていたため、
 * 10行以下の表では常に basic（大文字小文字を区別する単純比較＝文字列の辞書順）になる。
 */
describe("selectV8AutoSortKind", () => {
  it("10行以下なら標本が空になり basic を選ぶ", () => {
    expect(selectV8AutoSortKind(["3", "12", "1", "2"])).toBe("basic");
    expect(selectV8AutoSortKind(Array.from({ length: 10 }, (_, i) => `v${i}`))).toBe("basic");
  });

  it("11行目以降に数字を含む値があれば alphanumeric を選ぶ", () => {
    const values = [...Array.from({ length: 10 }, () => "x"), "a", "b1"];
    expect(selectV8AutoSortKind(values)).toBe("alphanumeric");
  });

  it("数字が先頭10行にしか無く11行目以降が文字列だけなら text を選ぶ", () => {
    const values = [...Array.from({ length: 10 }, (_, i) => String(i)), "a", "b"];
    expect(selectV8AutoSortKind(values)).toBe("text");
  });

  it("11行目以降に Date があれば datetime を選ぶ", () => {
    const values = [...Array.from({ length: 10 }, () => "x"), new Date(0)];
    expect(selectV8AutoSortKind(values)).toBe("datetime");
  });

  it("11行目以降に文字列が無ければ basic を選ぶ", () => {
    const values = [...Array.from({ length: 10 }, () => "x"), undefined, 1];
    expect(selectV8AutoSortKind(values)).toBe("basic");
  });
});

describe("compareByV8SortKind", () => {
  const sortBy = (kind: Parameters<typeof compareByV8SortKind>[0], values: string[]) =>
    [...values].sort((a, b) => compareByV8SortKind(kind, a, b));

  it("basic は文字列の辞書順で、大文字小文字を区別する", () => {
    expect(sortBy("basic", ["3", "12", "1", "2"])).toEqual(["1", "12", "2", "3"]);
    expect(sortBy("basic", ["b", "B", "a", "A"])).toEqual(["A", "B", "a", "b"]);
  });

  it("text は大文字小文字を区別しない辞書順", () => {
    expect(sortBy("text", ["3", "12", "1", "2"])).toEqual(["1", "12", "2", "3"]);
    expect(sortBy("text", ["b", "A", "a", "B"]).map((v) => v.toLowerCase())).toEqual([
      "a",
      "a",
      "b",
      "b",
    ]);
  });

  it("alphanumeric は数字部分を数値として比べる", () => {
    expect(sortBy("alphanumeric", ["3", "12", "1", "2"])).toEqual(["1", "2", "3", "12"]);
    expect(sortBy("alphanumeric", ["a10", "a2", "B1", "a1"])).toEqual(["a1", "a2", "a10", "B1"]);
  });

  it("alphanumeric は数字より文字を先に並べ、共通部分が同じなら短い方が先", () => {
    expect(sortBy("alphanumeric", ["a", "1", "a1", ""])).toEqual(["", "a", "a1", "1"]);
  });

  it("等しい値は 0 を返す", () => {
    expect(compareByV8SortKind("basic", "x", "x")).toBe(0);
    expect(compareByV8SortKind("text", "X", "x")).toBe(0);
    expect(compareByV8SortKind("alphanumeric", "A1", "a1")).toBe(0);
    expect(compareByV8SortKind("datetime", new Date(1), new Date(1))).toBe(0);
  });
});
