import { HEADER_ROW } from "./cellNavigation";
import {
  clampRange,
  extendCell,
  isInRange,
  rangeCellCount,
  selectionRange,
} from "./largeSelection";

const bounds = { rowCount: 10, colCount: 4 };

describe("selectionRange", () => {
  test("起点と選択中のセルを対角とする範囲（end は排他）", () => {
    expect(selectionRange({ row: 5, col: 3 }, { row: 2, col: 1 })).toEqual({
      startRow: 2,
      endRow: 6,
      startCol: 1,
      endCol: 4,
    });
  });

  test("起点が無ければ選択中のセルだけの範囲", () => {
    expect(selectionRange(null, { row: 2, col: 1 })).toEqual({
      startRow: 2,
      endRow: 3,
      startCol: 1,
      endCol: 2,
    });
  });

  test("選択が無い・ヘッダーを含むときは範囲にしない（範囲はデータ行だけ）", () => {
    expect(selectionRange(null, null)).toBeNull();
    expect(selectionRange(null, { row: HEADER_ROW, col: 0 })).toBeNull();
    expect(selectionRange({ row: HEADER_ROW, col: 0 }, { row: 3, col: 0 })).toBeNull();
  });
});

describe("rangeCellCount / isInRange", () => {
  const range = { startRow: 2, endRow: 5, startCol: 1, endCol: 3 };

  test("セル数は行数×列数", () => {
    expect(rangeCellCount(range)).toBe(6);
  });

  test("範囲の中のセルだけ true", () => {
    expect(isInRange(range, 2, 1)).toBe(true);
    expect(isInRange(range, 4, 2)).toBe(true);
    expect(isInRange(range, 5, 2)).toBe(false);
    expect(isInRange(range, 3, 3)).toBe(false);
    expect(isInRange(range, 1, 1)).toBe(false);
    expect(isInRange(null, 2, 1)).toBe(false);
  });
});

describe("clampRange", () => {
  test("表の行数・列数に収める", () => {
    expect(clampRange({ startRow: 8, endRow: 20, startCol: 2, endCol: 9 }, bounds)).toEqual({
      startRow: 8,
      endRow: 10,
      startCol: 2,
      endCol: 4,
    });
  });

  test("表の外なら null", () => {
    expect(clampRange({ startRow: 10, endRow: 12, startCol: 0, endCol: 1 }, bounds)).toBeNull();
    expect(clampRange(null, bounds)).toBeNull();
  });
});

describe("extendCell（Shift+矢印で範囲を広げる先）", () => {
  test("矢印の方向へ1つ動かす", () => {
    expect(extendCell({ row: 3, col: 1 }, "ArrowDown", bounds)).toEqual({ row: 4, col: 1 });
    expect(extendCell({ row: 3, col: 1 }, "ArrowRight", bounds)).toEqual({ row: 3, col: 2 });
    expect(extendCell({ row: 3, col: 1 }, "ArrowLeft", bounds)).toEqual({ row: 3, col: 0 });
    expect(extendCell({ row: 3, col: 1 }, "ArrowUp", bounds)).toEqual({ row: 2, col: 1 });
  });

  test("表の端を越えず、先頭行から上へはヘッダーに入らない", () => {
    expect(extendCell({ row: 0, col: 1 }, "ArrowUp", bounds)).toEqual({ row: 0, col: 1 });
    expect(extendCell({ row: 9, col: 3 }, "ArrowDown", bounds)).toEqual({ row: 9, col: 3 });
    expect(extendCell({ row: 9, col: 3 }, "ArrowRight", bounds)).toEqual({ row: 9, col: 3 });
  });

  test("ヘッダーからや矢印以外のキーは範囲を広げない（null）", () => {
    expect(extendCell({ row: HEADER_ROW, col: 1 }, "ArrowDown", bounds)).toBeNull();
    expect(extendCell({ row: 3, col: 1 }, "Tab", bounds)).toBeNull();
  });
});
