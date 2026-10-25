import { describe, it, expect } from "vitest";
import { getRowId, inheritRowId } from "./rowIdentity";

describe("rowIdentity", () => {
  it("同じ行配列には同じ行IDを返す", () => {
    const row = ["a"];
    expect(getRowId(row)).toBe(getRowId(row));
  });

  it("別の行配列には別の行IDを返す", () => {
    expect(getRowId(["a"])).not.toBe(getRowId(["a"]));
  });

  it("inheritRowIdで新しい行配列が元の行IDを引き継ぐ", () => {
    const from = ["a"];
    const to = ["b"];
    expect(inheritRowId(from, to)).toBe(to);
    expect(getRowId(to)).toBe(getRowId(from));
  });
});
