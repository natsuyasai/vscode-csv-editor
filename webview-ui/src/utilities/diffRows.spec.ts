import { applyRowOps } from "./applyRowOps";
import { diffRows } from "./diffRows";

describe("diffRows", () => {
  const a = ["a"];
  const b = ["b"];
  const c = ["c"];

  it("両方空なら操作は作られない", () => {
    expect(diffRows([], [])).toEqual([]);
  });

  it("空から行が増えると全行追加になる", () => {
    expect(diffRows([], [a, b])).toEqual([
      { type: "replaceRows", start: 0, deleteCount: 0, rows: [a, b] },
    ]);
  });

  it("全行削除すると全行削除になる", () => {
    expect(diffRows([a, b], [])).toEqual([
      { type: "replaceRows", start: 0, deleteCount: 2, rows: [] },
    ]);
  });

  it("内容が同じでも参照が違えば変更とみなす", () => {
    expect(diffRows([a], [["a"]])).toEqual([
      { type: "replaceRows", start: 0, deleteCount: 1, rows: [["a"]] },
    ]);
  });

  it("末尾への追加は末尾位置の挿入になる", () => {
    expect(diffRows([a], [a, b])).toEqual([
      { type: "replaceRows", start: 1, deleteCount: 0, rows: [b] },
    ]);
  });

  it("離れた2行を変更すると間を含む1件にまとまる", () => {
    const a2 = ["a2"];
    const c2 = ["c2"];
    expect(diffRows([a, b, c], [a2, b, c2])).toEqual([
      { type: "replaceRows", start: 0, deleteCount: 3, rows: [a2, b, c2] },
    ]);
  });

  it("同じ参照の行が重複していても先頭と末尾の範囲が重ならない", () => {
    const prev = [a, b, a];
    const next = [a, a];
    expect(applyRowOps(prev, diffRows(prev, next))).toEqual(next);
    expect(diffRows([a, a, a], [a, a])).toEqual([
      { type: "replaceRows", start: 2, deleteCount: 1, rows: [] },
    ]);
  });

  it("offset を指定すると start に加算される", () => {
    expect(diffRows([a, b], [a, c], 1)).toEqual([
      { type: "replaceRows", start: 2, deleteCount: 1, rows: [c] },
    ]);
  });
});

describe("applyRowOps", () => {
  it("操作が空なら同じ内容の新しい配列を返す", () => {
    const rows = [["a"]];
    const result = applyRowOps(rows, []);
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("複数の操作を順に適用する", () => {
    const result = applyRowOps(
      [["a"], ["b"]],
      [
        { type: "replaceRows", start: 1, deleteCount: 0, rows: [["x"]] },
        { type: "replaceRows", start: 0, deleteCount: 1, rows: [] },
      ]
    );
    expect(result).toEqual([["x"], ["b"]]);
  });
});
