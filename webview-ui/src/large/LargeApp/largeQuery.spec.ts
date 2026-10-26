import { nextSort, searchFrom, toFilterConditions } from "./largeQuery";

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

describe("searchFrom", () => {
  const base = { rowCount: 100, selectedRow: null, lastMatchRow: null, fresh: true } as const;

  test("行が無ければ検索しない", () => {
    expect(searchFrom({ ...base, direction: "forward", rowCount: 0 })).toBeNull();
  });

  test("新しい検索で選択が無ければ、前方は先頭・後方は末尾から", () => {
    expect(searchFrom({ ...base, direction: "forward" })).toBe(0);
    expect(searchFrom({ ...base, direction: "backward" })).toBe(99);
  });

  test("新しい検索は選択セルの行から始める（その行を含む）", () => {
    expect(searchFrom({ ...base, direction: "forward", selectedRow: 40 })).toBe(40);
    expect(searchFrom({ ...base, direction: "backward", selectedRow: 40 })).toBe(40);
  });

  test("ヘッダー行（-1）の選択は選択なしとして扱う", () => {
    expect(searchFrom({ ...base, direction: "forward", selectedRow: -1 })).toBe(0);
  });

  test("続きの検索は現在の一致位置の次・前の行から", () => {
    const next = { ...base, fresh: false, selectedRow: 40, lastMatchRow: 40 };
    expect(searchFrom({ ...next, direction: "forward" })).toBe(41);
    expect(searchFrom({ ...next, direction: "backward" })).toBe(39);
  });

  test("続きの検索で、利用者が別のセルを選んでいればそこの次・前から", () => {
    const moved = { ...base, fresh: false, selectedRow: 10, lastMatchRow: 40 };
    expect(searchFrom({ ...moved, direction: "forward" })).toBe(11);
    expect(searchFrom({ ...moved, direction: "backward" })).toBe(9);
  });

  test("続きの検索で選択が無ければ一致位置を基準にする", () => {
    const only = { ...base, fresh: false, lastMatchRow: 5 };
    expect(searchFrom({ ...only, direction: "forward" })).toBe(6);
  });

  test("続きの検索で基準が無ければ新しい検索と同じ", () => {
    expect(searchFrom({ ...base, fresh: false, direction: "forward" })).toBe(0);
  });

  test("末尾を越える前方検索は先頭に、先頭を越える後方検索は末尾に回り込む", () => {
    const edge = { ...base, fresh: false };
    expect(searchFrom({ ...edge, direction: "forward", selectedRow: 99, lastMatchRow: 99 })).toBe(
      0
    );
    expect(searchFrom({ ...edge, direction: "backward", selectedRow: 0, lastMatchRow: 0 })).toBe(
      99
    );
  });

  test("選択がフィルタで減った行数を超えていても範囲内に収める", () => {
    expect(searchFrom({ ...base, direction: "forward", selectedRow: 500 })).toBe(0);
    expect(searchFrom({ ...base, direction: "backward", selectedRow: 500 })).toBe(99);
  });
});
