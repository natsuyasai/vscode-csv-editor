import { InMemoryRowSource } from "./InMemoryRowSource";

const createSource = () =>
  new InMemoryRowSource(
    ["id", "name"],
    [
      ["1", "Alice"],
      ["2", "Bob"],
      ["3", "Carol"],
    ]
  );

describe("InMemoryRowSource", () => {
  it("配列の行を即時に返し、ハンドルは元の行番号になる", () => {
    const source = createSource();
    expect(source.header).toEqual(["id", "name"]);
    expect(source.rowCount).toBe(3);
    expect(source.getRow(1)).toEqual(["2", "Bob"]);
    expect(source.getHandle(1)).toBe(1);
  });

  it("範囲外は undefined", () => {
    const source = createSource();
    expect(source.getRow(3)).toBeUndefined();
    expect(source.getRow(-1)).toBeUndefined();
    expect(source.getHandle(3)).toBeUndefined();
  });

  it("ensureRange は何もしない（例外なし・通知なし）", () => {
    const source = createSource();
    const listener = vi.fn();
    source.subscribe(listener);
    source.ensureRange(0, 100);
    expect(listener).not.toHaveBeenCalled();
  });

  it("applyOps: setRow はハンドルの行を置換して通知する", () => {
    const source = createSource();
    const listener = vi.fn();
    source.subscribe(listener);
    const before = source.getVersion();
    source.applyOps([{ type: "setRow", handle: 1, row: ["2", "Bobby"] }]);
    expect(source.getRow(1)).toEqual(["2", "Bobby"]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getVersion()).not.toBe(before);
  });

  it("applyOps: deleteRows はハンドルの行を除き rowCount を減らす", () => {
    const source = createSource();
    source.applyOps([{ type: "deleteRows", handles: [0, 2] }]);
    expect(source.rowCount).toBe(1);
    expect(source.getRow(0)).toEqual(["2", "Bob"]);
    expect(source.getHandle(0)).toBe(1);
  });

  it("applyOps: insertRows は beforeHandle の直前に負のハンドルで挿入する", () => {
    const source = createSource();
    source.applyOps([{ type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["9", "Zed"]] }]);
    expect(source.rowCount).toBe(4);
    expect(source.getRow(1)).toEqual(["9", "Zed"]);
    expect(source.getHandle(1)).toBe(-1);
    expect(source.getRow(2)).toEqual(["2", "Bob"]);
  });

  it("applyOps: insertRows の beforeHandle が null なら末尾に追加する", () => {
    const source = createSource();
    source.applyOps([
      { type: "insertRows", beforeHandle: null, handles: [-1], rows: [["9", "Zed"]] },
    ]);
    expect(source.getRow(3)).toEqual(["9", "Zed"]);
  });

  it("applyOps: setHeader はヘッダーを置換する", () => {
    const source = createSource();
    source.applyOps([{ type: "setHeader", header: ["x", "y"] }]);
    expect(source.header).toEqual(["x", "y"]);
  });

  it("unsubscribe 後は通知しない", () => {
    const source = createSource();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    unsubscribe();
    source.applyOps([{ type: "setHeader", header: ["x"] }]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("ハンドルを渡すと、行のハンドルとして使う（ファイルの行番号と同じ形にできる）", () => {
    const source = new InMemoryRowSource(["id"], [["a"], ["b"]], [1, 2]);
    expect(source.getHandle(0)).toBe(1);
    expect(source.getHandle(1)).toBe(2);
    source.applyOps([{ type: "setRow", handle: 2, row: ["B"] }]);
    expect(source.getRow(1)).toEqual(["B"]);
  });
});

describe("InMemoryRowSource のコピー・貼り付け用の取得", () => {
  const source = () =>
    new InMemoryRowSource(
      ["id", "a", "b"],
      [["1", "a1", "b1"], ["2"], ["3", "a3", "b3"]],
      [1, 2, 3]
    );

  it("getRange は範囲のセルを返し、列が足りない分は空のセルで埋める", async () => {
    await expect(
      source().getRange({ startRow: 0, endRow: 2, startCol: 1, endCol: 3 })
    ).resolves.toEqual([
      ["a1", "b1"],
      ["", ""],
    ]);
  });

  it("getRange は末尾を超える行を切り詰める", async () => {
    await expect(
      source().getRange({ startRow: 2, endRow: 9, startCol: 0, endCol: 1 })
    ).resolves.toEqual([["3"]]);
  });

  it("fetchRows は行全体とハンドルを返し、末尾を超える行を切り詰める", async () => {
    await expect(source().fetchRows(1, 5)).resolves.toEqual({
      rows: [["2"], ["3", "a3", "b3"]],
      handles: [2, 3],
      revision: undefined,
    });
  });
});
