import { nextSort, searchStart, toFilterConditions } from "./largeQuery";

describe("nextSort", () => {
  test("ソートしていない列をクリックすると昇順になる", () => {
    expect(nextSort(null, 2)).toEqual({ column: 2, direction: "asc" });
  });

  test("同じ列を続けてクリックすると 昇順 → 降順 → 解除 の順に変わる", () => {
    const asc = nextSort(null, 1);
    const desc = nextSort(asc, 1);
    expect(desc).toEqual({ column: 1, direction: "desc" });
    expect(nextSort(desc, 1)).toBeNull();
  });

  test("別の列をクリックすると、その列の昇順になる", () => {
    expect(nextSort({ column: 1, direction: "desc" }, 3)).toEqual({ column: 3, direction: "asc" });
  });
});

describe("toFilterConditions", () => {
  test("入力のある列だけを、列番号つきの条件にする", () => {
    expect(toFilterConditions(["", "abc", undefined as unknown as string, "x"])).toEqual([
      { column: 1, text: "abc" },
      { column: 3, text: "x" },
    ]);
  });

  test("空白だけの入力も条件にする（部分一致の対象は拡張機能が決める）", () => {
    expect(toFilterConditions([" "])).toEqual([{ column: 0, text: " " }]);
  });

  test("すべて空なら空配列（解除）", () => {
    expect(toFilterConditions(["", ""])).toEqual([]);
  });
});

describe("searchStart", () => {
  const base = { rowCount: 100, selectedRow: null, lastMatch: null } as const;

  test("行が無ければ検索しない", () => {
    expect(searchStart({ ...base, direction: "forward", rowCount: 0 })).toBeNull();
  });

  test("新しい検索で選択が無ければ、前方は先頭・後方は末尾の行から（列は指定しない）", () => {
    expect(searchStart({ ...base, direction: "forward" })).toEqual({ from: 0 });
    expect(searchStart({ ...base, direction: "backward" })).toEqual({ from: 99 });
  });

  test("新しい検索は選択中の行から始める（列は指定せず、行の端のセルから）", () => {
    expect(searchStart({ ...base, direction: "forward", selectedRow: 40 })).toEqual({ from: 40 });
    expect(searchStart({ ...base, direction: "backward", selectedRow: 40 })).toEqual({ from: 40 });
  });

  test("ヘッダー行（-1）の選択は選択なしとして扱う", () => {
    expect(searchStart({ ...base, direction: "forward", selectedRow: -1 })).toEqual({ from: 0 });
  });

  test("選択がフィルタで減った行数を超えていても範囲内に収める", () => {
    expect(searchStart({ ...base, direction: "forward", selectedRow: 500 })).toEqual({ from: 0 });
    expect(searchStart({ ...base, direction: "backward", selectedRow: 500 })).toEqual({ from: 99 });
  });

  test("続きの検索は直前の一致の行・列をそのまま送る（次のセルへの移動と折り返しは拡張機能が行う）", () => {
    const next = { ...base, lastMatch: { row: 99, col: 3 }, selectedRow: 99 };
    expect(searchStart({ ...next, direction: "forward" })).toEqual({ from: 99, fromCol: 3 });
    expect(searchStart({ ...next, direction: "backward" })).toEqual({ from: 99, fromCol: 3 });
  });

  test("直前の一致が表示行数を超えていれば新しい検索として扱う", () => {
    expect(searchStart({ ...base, direction: "forward", lastMatch: { row: 500, col: 0 } })).toEqual(
      { from: 0 }
    );
  });
});
