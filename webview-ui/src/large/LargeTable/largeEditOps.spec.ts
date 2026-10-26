import { InMemoryRowSource } from "../rowSource/InMemoryRowSource";
import { deleteRowOp, insertRowOp, setCellOp, setHeaderOp } from "./largeEditOps";

/** ハンドルを 1 から振った（ファイルの行番号と同じ形の）3行 */
const source = () =>
  new InMemoryRowSource(
    ["id", "name"],
    [
      ["1", "Alice"],
      ["2", "Bob"],
      ["3", "Carol"],
    ],
    [1, 2, 3]
  );

describe("setCellOp", () => {
  it("行の1列だけを置き換えた setRow を作る（元の行は変えない）", () => {
    const row = ["2", "Bob"];
    expect(setCellOp(row, 2, 1, "Bobby", 2)).toEqual({
      type: "setRow",
      handle: 2,
      row: ["2", "Bobby"],
    });
    expect(row).toEqual(["2", "Bob"]);
  });

  it("列が足りない行は空文字で列数まで埋める", () => {
    expect(setCellOp(["1"], 5, 2, "x", 3)).toEqual({
      type: "setRow",
      handle: 5,
      row: ["1", "", "x"],
    });
  });
});

describe("setHeaderOp", () => {
  it("1列だけを置き換えた setHeader を作る", () => {
    expect(setHeaderOp(["id", "name"], 1, "氏名")).toEqual({
      type: "setHeader",
      header: ["id", "氏名"],
    });
  });
});

describe("insertRowOp", () => {
  it("上に挿入するときは、その行のハンドルの直前に挿入する", () => {
    expect(insertRowOp(source(), 1, "above", -1, 2)).toEqual({
      type: "insertRows",
      beforeHandle: 2,
      handles: [-1],
      rows: [["", ""]],
    });
  });

  it("下に挿入するときは、次の行のハンドルの直前に挿入する", () => {
    expect(insertRowOp(source(), 0, "below", -3, 2)).toMatchObject({ beforeHandle: 2 });
  });

  it("最終行の下に挿入するときは末尾（null）に挿入する", () => {
    expect(insertRowOp(source(), 2, "below", -1, 2)).toMatchObject({ beforeHandle: null });
  });

  it("基準の行のハンドルが分からない（未取得）ときは作らない", () => {
    expect(insertRowOp(source(), 5, "above", -1, 2)).toBeNull();
    const partial = { rowCount: 3, getHandle: (i: number) => (i === 0 ? 1 : undefined) };
    expect(insertRowOp(partial, 0, "below", -1, 2)).toBeNull();
  });
});

describe("deleteRowOp", () => {
  it("その行のハンドルを削除する", () => {
    expect(deleteRowOp(source(), 2)).toEqual({ type: "deleteRows", handles: [3] });
  });

  it("ハンドルが分からないときは作らない", () => {
    expect(deleteRowOp(source(), 3)).toBeNull();
  });
});
