import { parseRow } from "../csv/rowCodec";
import {
  compareAlphanumeric,
  compareCells,
  compareSortKeys,
  detectSortKind,
  findInRow,
  normalizeFilters,
  normalizeSearchQuery,
  parseRecord,
  rowMatchesFilters,
  searchRows,
  sortKey,
  sortOrder,
  SortKindDetector,
} from "./query";

describe("compareAlphanumeric（通常モードの TanStack alphanumeric と同じ）", () => {
  it.each([
    ["a2", "a10", -1],
    ["a10", "a2", 1],
    ["item1", "item1", 0],
    ["abc", "5", -1],
    ["5", "abc", 1],
    ["", "a", -1],
    ["a", "", 1],
    ["007", "7", 0],
    ["1a", "1", 1],
  ])("%j と %j は %i", (a, b, expected) => {
    expect(Math.sign(compareAlphanumeric(a, b))).toBe(expected);
  });
});

describe("detectSortKind（TanStack の getAutoSortingFn と同じ選び方）", () => {
  it("10行以下なら basic（大文字小文字を区別する）", () => {
    expect(detectSortKind(["b", "A", "c1"])).toBe("basic");
  });

  it("11行目以降に数字を含む値があれば alphanumeric", () => {
    const values = Array.from({ length: 10 }, () => "x");
    expect(detectSortKind([...values, "a1"])).toBe("alphanumeric");
  });

  it("先頭10行だけに数字があっても text", () => {
    const values = Array.from({ length: 10 }, (_, i) => `v${String(i)}`);
    expect(detectSortKind([...values, "x", "y"])).toBe("text");
  });

  it("SortKindDetector は1つずつ観測しても同じ結果になる", () => {
    const detector = new SortKindDetector();
    for (const value of [...Array.from({ length: 10 }, () => "x"), "y", "z9"]) {
      detector.observe(value);
    }
    expect(detector.kind).toBe("alphanumeric");
  });
});

describe("sortKey / compareSortKeys", () => {
  it.each(["basic", "text", "alphanumeric"] as const)(
    "%s のキーの大小は compareCells と一致する",
    (kind) => {
      const values = ["b", "B", "a10", "a2", "", "10", "9", "x\u0000", "x", "Ａ"];
      for (const a of values) {
        for (const b of values) {
          expect(Math.sign(compareSortKeys(sortKey(a, kind), sortKey(b, kind)))).toBe(
            Math.sign(compareCells(a, b, kind))
          );
        }
      }
    }
  );

  it("text は大文字小文字を区別しない", () => {
    expect(compareCells("B", "a", "text")).toBe(1);
    expect(compareCells("B", "b", "text")).toBe(0);
  });

  it("basic は大文字小文字を区別する", () => {
    expect(compareCells("B", "a", "basic")).toBe(-1);
  });
});

describe("sortOrder", () => {
  it("昇順は安定（同じキーは元の順）", () => {
    expect(Array.from(sortOrder(["b", "a", "b", "a"], "asc"))).toEqual([1, 3, 0, 2]);
  });

  it("降順は比較だけを反転し、同じキーは元の順のまま", () => {
    expect(Array.from(sortOrder(["b", "a", "b", "a"], "desc"))).toEqual([0, 2, 1, 3]);
  });
});

describe("フィルタ（通常モードの includesString と同じ）", () => {
  it("空の条件は除き、文字列は小文字にする（前後の空白は残す）", () => {
    expect(
      normalizeFilters([
        { column: 0, text: "" },
        { column: 1, text: " AbC " },
      ])
    ).toEqual([{ column: 1, text: " abc " }]);
  });

  it("すべての条件に部分一致（大文字小文字を区別しない）する行だけが合う", () => {
    const filters = normalizeFilters([
      { column: 0, text: "TO" },
      { column: 1, text: "1" },
    ]);
    expect(rowMatchesFilters(["Tokyo", "10"], filters)).toBe(true);
    expect(rowMatchesFilters(["Tokyo", "20"], filters)).toBe(false);
    expect(rowMatchesFilters(["Osaka", "10"], filters)).toBe(false);
  });

  it("無いセルは空文字として扱う（空でない条件には合わない）", () => {
    expect(rowMatchesFilters(["a"], normalizeFilters([{ column: 3, text: "a" }]))).toBe(false);
  });
});

describe("検索（通常モードの useTableSearch と同じ）", () => {
  it("前後の空白を除いて小文字にする。空なら null", () => {
    expect(normalizeSearchQuery("  AbC ")).toBe("abc");
    expect(normalizeSearchQuery("   ")).toBeNull();
  });

  it("findInRow は方向と開始列（その列は含まない）で探す", () => {
    const row = ["ab", "x", "AB", "ab"];
    expect(findInRow(row, "ab", "forward")).toBe(0);
    expect(findInRow(row, "ab", "forward", 0)).toBe(2);
    expect(findInRow(row, "ab", "backward")).toBe(3);
    expect(findInRow(row, "ab", "backward", 3)).toBe(2);
    expect(findInRow(row, "zz", "forward")).toBe(-1);
  });

  it("searchRows は末尾まで行ったら先頭に折り返す", () => {
    const rows = [["a"], ["b"], ["a"]];
    expect(searchRows(rows, "a", 1, undefined, "forward")).toEqual({ row: 2, col: 0 });
    expect(searchRows(rows, "a", 2, 0, "forward")).toEqual({ row: 0, col: 0 });
    expect(searchRows(rows, "a", 0, 0, "backward")).toEqual({ row: 2, col: 0 });
  });

  it("一致が開始セルだけなら、一周してそのセルを返す", () => {
    expect(searchRows([["a"], ["b"]], "a", 0, 0, "forward")).toEqual({ row: 0, col: 0 });
  });

  it("一致が無ければ null", () => {
    expect(searchRows([["a"]], "z", 0, undefined, "forward")).toBeNull();
    expect(searchRows([], "z", 0, undefined, "forward")).toBeNull();
  });
});

describe("parseRecord（parseRow と同じ結果を速く返す）", () => {
  it.each(["a,b,c", "", ",", 'a,"b,c",d', 'x,"y""z"', '"a\nb",c'])("%j", (text) => {
    expect(parseRecord(text)).toEqual(parseRow(text));
  });

  it("パースできない行は生テキストを1セルにする", () => {
    expect(parseRecord('a,"b')).toEqual(['a,"b']);
  });
});
