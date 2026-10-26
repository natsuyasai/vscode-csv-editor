import { buildPasteOps, planPaste } from "./largeClipboard";

const bounds = { rowCount: 10, colCount: 4 };

describe("planPaste（貼り付ける範囲）", () => {
  test("起点から貼り付ける値の行数・列数の範囲", () => {
    expect(
      planPaste(
        { row: 2, col: 1 },
        [
          ["a", "b"],
          ["c", "d"],
        ],
        bounds
      )
    ).toEqual({
      startRow: 2,
      endRow: 4,
      startCol: 1,
      values: [
        ["a", "b"],
        ["c", "d"],
      ],
      cellCount: 4,
      width: 2,
    });
  });

  test("末尾の行を超える分は切り詰める（行は追加しない）", () => {
    const plan = planPaste({ row: 8, col: 0 }, [["1"], ["2"], ["3"], ["4"]], bounds);
    expect(plan).toMatchObject({ startRow: 8, endRow: 10, values: [["1"], ["2"]], cellCount: 2 });
  });

  test("右端の列を超える分は切り詰める（列は追加しない）", () => {
    const plan = planPaste({ row: 0, col: 2 }, [["a", "b", "c", "d"], ["e"]], bounds);
    expect(plan).toMatchObject({
      values: [["a", "b"], ["e"]],
      cellCount: 3,
      width: 2,
    });
  });

  test("貼り付ける値が無い・表の外なら null", () => {
    expect(planPaste({ row: 0, col: 0 }, [], bounds)).toBeNull();
    expect(planPaste({ row: 10, col: 0 }, [["a"]], bounds)).toBeNull();
    expect(planPaste({ row: 0, col: 4 }, [["a"]], bounds)).toBeNull();
  });
});

describe("buildPasteOps（行の置き換え）", () => {
  const plan = {
    startRow: 1,
    endRow: 3,
    startCol: 1,
    values: [["X", "Y"], ["Z"]],
    cellCount: 3,
    width: 2,
  };

  test("対象の行ごとに、貼り付けたセルを置き換えた行全体の setRow を作る", () => {
    const ops = buildPasteOps(
      {
        rows: [
          ["1", "a", "b", "c"],
          ["2", "d", "e", "f"],
        ],
        handles: [11, 12],
      },
      plan,
      4
    );
    expect(ops).toEqual([
      { type: "setRow", handle: 11, row: ["1", "X", "Y", "c"] },
      { type: "setRow", handle: 12, row: ["2", "Z", "e", "f"] },
    ]);
  });

  test("列が足りない行は空のセルで列数まで埋める", () => {
    const ops = buildPasteOps({ rows: [["1"], ["2", "d"]], handles: [11, 12] }, plan, 4);
    expect(ops).toEqual([
      { type: "setRow", handle: 11, row: ["1", "X", "Y", ""] },
      { type: "setRow", handle: 12, row: ["2", "Z", "", ""] },
    ]);
  });

  test("内容が変わらない行の op は作らない", () => {
    const ops = buildPasteOps(
      {
        rows: [
          ["1", "X", "Y", "c"],
          ["2", "d", "e", "f"],
        ],
        handles: [11, 12],
      },
      plan,
      4
    );
    expect(ops).toEqual([{ type: "setRow", handle: 12, row: ["2", "Z", "e", "f"] }]);
  });

  test("取り寄せた行が足りなければ（行が減った）その行までにする", () => {
    const ops = buildPasteOps({ rows: [["1", "a", "b", "c"]], handles: [11] }, plan, 4);
    expect(ops).toEqual([{ type: "setRow", handle: 11, row: ["1", "X", "Y", "c"] }]);
  });
});
