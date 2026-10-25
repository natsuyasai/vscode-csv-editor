import { shiftOnDelete, shiftOnInsert, remapOnMove } from "./indexKeyRemap";

describe("indexKeyRemap", () => {
  describe("shiftOnInsert", () => {
    it("挿入位置以降のキーを後ろにずらす（Map）", () => {
      const result = shiftOnInsert(
        new Map([
          [0, 10],
          [1, 20],
          [2, 30],
        ]),
        1
      );
      expect([...result]).toEqual([
        [0, 10],
        [2, 20],
        [3, 30],
      ]);
    });

    it("Recordにも使える", () => {
      expect(shiftOnInsert({ 0: "a", 1: "b" }, 0)).toEqual({ 1: "a", 2: "b" });
    });

    it("count指定で複数分ずらす", () => {
      expect(shiftOnInsert({ 1: "a" }, 1, 3)).toEqual({ 4: "a" });
    });

    it("入力を破壊しない", () => {
      const src = new Map([[1, 1]]);
      shiftOnInsert(src, 0);
      expect([...src]).toEqual([[1, 1]]);
    });
  });

  describe("shiftOnDelete", () => {
    it("削除位置のキーを消し、後ろのキーを前にずらす（Map）", () => {
      const result = shiftOnDelete(
        new Map([
          [0, 10],
          [1, 20],
          [2, 30],
        ]),
        1
      );
      expect([...result]).toEqual([
        [0, 10],
        [1, 30],
      ]);
    });

    it("Recordにも使える", () => {
      expect(shiftOnDelete({ 0: "a", 2: "c" }, 0)).toEqual({ 1: "c" });
    });
  });

  describe("remapOnMove", () => {
    it("前方から後方への移動: 間のキーが前にずれ、移動元の設定は移動先へ", () => {
      expect(remapOnMove({ 0: "a", 1: "b", 2: "c", 3: "d" }, 0, 2)).toEqual({
        0: "b",
        1: "c",
        2: "a",
        3: "d",
      });
    });

    it("後方から前方への移動: 間のキーが後ろにずれ、移動元の設定は移動先へ", () => {
      expect(remapOnMove({ 0: "a", 1: "b", 2: "c", 3: "d" }, 3, 1)).toEqual({
        0: "a",
        1: "d",
        2: "b",
        3: "c",
      });
    });

    it("設定のない列を動かしても間の設定は正しくずれる（Map）", () => {
      const result = remapOnMove(new Map([[1, 100]]), 0, 2);
      expect([...result]).toEqual([[0, 100]]);
    });

    it("from===to は変化なし", () => {
      expect(remapOnMove({ 1: "x" }, 1, 1)).toEqual({ 1: "x" });
    });
  });
});
