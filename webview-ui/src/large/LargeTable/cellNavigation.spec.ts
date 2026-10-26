import { HEADER_ROW, moveCell, revealOffset } from "./cellNavigation";

const bounds = { rowCount: 5, colCount: 3 };

describe("moveCell", () => {
  it.each([
    ["ArrowDown", { row: 1, col: 1 }, { row: 2, col: 1 }],
    ["ArrowUp", { row: 1, col: 1 }, { row: 0, col: 1 }],
    ["ArrowLeft", { row: 1, col: 1 }, { row: 1, col: 0 }],
    ["ArrowRight", { row: 1, col: 1 }, { row: 1, col: 2 }],
  ])("%s で隣のセルへ移動する", (key, from, to) => {
    expect(moveCell(from, key, false, bounds)).toEqual(to);
  });

  it.each([
    ["ArrowDown", { row: 4, col: 1 }],
    ["ArrowLeft", { row: 1, col: 0 }],
    ["ArrowRight", { row: 1, col: 2 }],
    ["ArrowUp", { row: HEADER_ROW, col: 1 }],
  ])("%s で端を越えない", (key, at) => {
    expect(moveCell(at, key, false, bounds)).toEqual(at);
  });

  it("先頭行で ArrowUp を押すとヘッダーへ、ヘッダーで ArrowDown を押すと先頭行へ移動する", () => {
    expect(moveCell({ row: 0, col: 2 }, "ArrowUp", false, bounds)).toEqual({
      row: HEADER_ROW,
      col: 2,
    });
    expect(moveCell({ row: HEADER_ROW, col: 2 }, "ArrowDown", false, bounds)).toEqual({
      row: 0,
      col: 2,
    });
  });

  it("Tab は右へ移動し、行末では次の行の先頭へ移る", () => {
    expect(moveCell({ row: 1, col: 0 }, "Tab", false, bounds)).toEqual({ row: 1, col: 1 });
    expect(moveCell({ row: 1, col: 2 }, "Tab", false, bounds)).toEqual({ row: 2, col: 0 });
    expect(moveCell({ row: HEADER_ROW, col: 2 }, "Tab", false, bounds)).toEqual({
      row: 0,
      col: 0,
    });
    expect(moveCell({ row: 4, col: 2 }, "Tab", false, bounds)).toEqual({ row: 4, col: 2 });
  });

  it("Shift+Tab は左へ移動し、行頭では前の行の末尾へ移る", () => {
    expect(moveCell({ row: 1, col: 1 }, "Tab", true, bounds)).toEqual({ row: 1, col: 0 });
    expect(moveCell({ row: 1, col: 0 }, "Tab", true, bounds)).toEqual({ row: 0, col: 2 });
    expect(moveCell({ row: 0, col: 0 }, "Tab", true, bounds)).toEqual({ row: HEADER_ROW, col: 2 });
    expect(moveCell({ row: HEADER_ROW, col: 0 }, "Tab", true, bounds)).toEqual({
      row: HEADER_ROW,
      col: 0,
    });
  });

  it("行が無いときはヘッダーの中だけを移動する", () => {
    const empty = { rowCount: 0, colCount: 3 };
    expect(moveCell({ row: HEADER_ROW, col: 0 }, "ArrowDown", false, empty)).toEqual({
      row: HEADER_ROW,
      col: 0,
    });
    expect(moveCell({ row: HEADER_ROW, col: 2 }, "Tab", false, empty)).toEqual({
      row: HEADER_ROW,
      col: 2,
    });
  });

  it("移動のキーでなければ null を返す", () => {
    expect(moveCell({ row: 1, col: 1 }, "Enter", false, bounds)).toBeNull();
    expect(moveCell({ row: 1, col: 1 }, "a", false, bounds)).toBeNull();
  });
});

describe("revealOffset", () => {
  // 行の高さ 40px・表示領域 200px（5行分）
  it("表示領域の中にある行ならスクロールしない（null）", () => {
    expect(revealOffset(3, 40, 0, 200)).toBeNull();
    expect(revealOffset(4, 40, 0, 200)).toBeNull();
  });

  it("下にはみ出す行は、その行の下端が表示領域の下端に来る位置を返す", () => {
    expect(revealOffset(5, 40, 0, 200)).toBe(40);
    expect(revealOffset(999_999, 40, 0, 200)).toBe(999_999 * 40 + 40 - 200);
  });

  it("上にはみ出す行は、その行の上端が表示領域の上端に来る位置を返す", () => {
    expect(revealOffset(2, 40, 100, 200)).toBe(80);
  });

  it("ヘッダーは固定表示なのでスクロールしない", () => {
    expect(revealOffset(HEADER_ROW, 40, 400, 200)).toBeNull();
  });
});
