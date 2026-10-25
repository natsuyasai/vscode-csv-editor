import { describe, expect, it } from "vitest";
import { createRowIndexMapper, identityRowIndexMapper } from "./rowIndexMapper";

describe("createRowIndexMapper", () => {
  // 表示順: データ位置 [2, 0, 3] の3行（ソート・フィルター後を想定）
  const mapper = createRowIndexMapper([{ index: 2 }, { index: 0 }, { index: 3 }]);

  it("表示行数を返す", () => {
    expect(mapper.viewRowCount).toBe(3);
  });

  it("表示位置をデータ位置に変換する", () => {
    expect(mapper.toDataIndex(0)).toBe(2);
    expect(mapper.toDataIndex(1)).toBe(0);
    expect(mapper.toDataIndex(2)).toBe(3);
  });

  it("範囲外の表示位置は undefined", () => {
    expect(mapper.toDataIndex(3)).toBeUndefined();
    expect(mapper.toDataIndex(-1)).toBeUndefined();
  });

  it("データ位置を表示位置に変換する", () => {
    expect(mapper.toViewIndex(2)).toBe(0);
    expect(mapper.toViewIndex(0)).toBe(1);
    expect(mapper.toViewIndex(3)).toBe(2);
  });

  it("フィルターで非表示のデータ位置は undefined", () => {
    expect(mapper.toViewIndex(1)).toBeUndefined();
  });

  it("行が無い場合はすべて undefined", () => {
    const empty = createRowIndexMapper([]);
    expect(empty.viewRowCount).toBe(0);
    expect(empty.toDataIndex(0)).toBeUndefined();
    expect(empty.toViewIndex(0)).toBeUndefined();
  });
});

describe("identityRowIndexMapper", () => {
  it("表示位置とデータ位置が一致する", () => {
    expect(identityRowIndexMapper.toDataIndex(5)).toBe(5);
    expect(identityRowIndexMapper.toViewIndex(5)).toBe(5);
  });

  it("負数は undefined", () => {
    expect(identityRowIndexMapper.toDataIndex(-1)).toBeUndefined();
  });
});
