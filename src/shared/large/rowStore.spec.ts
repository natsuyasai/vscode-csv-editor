import { RowStore, RowStoreError } from "./rowStore";
import type { RowSegment } from "./rowStore";

/** 並び・編集内容・ヘッダーをまとめて取り出す */
function snapshot(store: RowStore) {
  const handles = store.handlesInRange(0, store.rowCount);
  return {
    handles,
    rows: handles.map((h) => store.getEdited(h)),
    header: store.header,
  };
}

function segmentsOf(store: RowStore): RowSegment[] {
  return [...store.segments()];
}

describe("RowStore", () => {
  describe("初期状態", () => {
    it("ヘッダーを除いたデータ行のハンドル 1..N を表示順に持つ", () => {
      const store = new RowStore(4);
      expect(store.rowCount).toBe(3);
      expect(store.originalDataRowCount).toBe(3);
      expect(store.handlesInRange(0, 3)).toEqual([1, 2, 3]);
      expect(store.handleAt(0)).toBe(1);
      expect(store.handleAt(2)).toBe(3);
      expect(store.indexOfHandle(2)).toBe(1);
      expect(store.isModified).toBe(false);
      expect(store.header).toBeUndefined();
    });

    it("空ファイル（0行）とヘッダーだけのファイルはデータ行が0件", () => {
      expect(new RowStore(0).rowCount).toBe(0);
      expect(new RowStore(1).rowCount).toBe(0);
    });

    it("範囲外の位置は RangeError、無いハンドルの位置は -1", () => {
      const store = new RowStore(3);
      expect(() => store.handleAt(2)).toThrow(RangeError);
      expect(() => store.handleAt(-1)).toThrow(RangeError);
      expect(store.indexOfHandle(0)).toBe(-1);
      expect(store.indexOfHandle(3)).toBe(-1);
      expect(store.indexOfHandle(-1)).toBe(-1);
      expect(store.has(0)).toBe(false);
      expect(store.has(1)).toBe(true);
    });

    it("handlesInRange は末尾で切り詰める", () => {
      const store = new RowStore(4);
      expect(store.handlesInRange(2, 10)).toEqual([3]);
      expect(store.handlesInRange(5, 10)).toEqual([]);
    });

    it("未編集なら segments はヘッダーを含む全行の1区間", () => {
      expect(segmentsOf(new RowStore(5))).toEqual([{ kind: "original", start: 0, end: 5 }]);
      expect(segmentsOf(new RowStore(0))).toEqual([]);
    });

    it("500万行でも即座に作れる", () => {
      const store = new RowStore(5_000_001);
      expect(store.rowCount).toBe(5_000_000);
      expect(store.handleAt(4_999_999)).toBe(5_000_000);
    });
  });

  describe("setRow", () => {
    it("元ファイルの行を編集すると内容を持ち、逆操作は編集の取り消し（clearRow）", () => {
      const store = new RowStore(4);
      const inverse = store.apply({ type: "setRow", handle: 2, row: ["x"] });
      expect(store.getEdited(2)).toEqual(["x"]);
      expect(store.isModified).toBe(true);
      expect(inverse).toEqual({ type: "clearRow", handle: 2 });
      store.apply(inverse);
      expect(store.getEdited(2)).toBeUndefined();
      expect(store.isModified).toBe(false);
    });

    it("編集済みの行を編集すると逆操作は前の内容の setRow", () => {
      const store = new RowStore(4);
      store.apply({ type: "setRow", handle: 2, row: ["x"] });
      const inverse = store.apply({ type: "setRow", handle: 2, row: ["y"] });
      expect(inverse).toEqual({ type: "setRow", handle: 2, row: ["x"] });
    });

    it("渡した配列を書き換えても保持している内容は変わらない", () => {
      const store = new RowStore(3);
      const row = ["a"];
      store.apply({ type: "setRow", handle: 1, row });
      row[0] = "changed";
      expect(store.getEdited(1)).toEqual(["a"]);
    });

    it("存在しないハンドルやヘッダー（0）は RowStoreError で、状態は変わらない", () => {
      const store = new RowStore(3);
      for (const handle of [0, 3, -1, 1.5]) {
        expect(() => store.apply({ type: "setRow", handle, row: ["x"] })).toThrow(RowStoreError);
      }
      expect(store.isModified).toBe(false);
    });
  });

  describe("setHeader", () => {
    it("初めての上書きの逆操作は clearHeader、2回目は前のヘッダー", () => {
      const store = new RowStore(3);
      const first = store.apply({ type: "setHeader", header: ["A"] });
      expect(first).toEqual({ type: "clearHeader" });
      expect(store.header).toEqual(["A"]);
      expect(store.isModified).toBe(true);
      const second = store.apply({ type: "setHeader", header: ["B"] });
      expect(second).toEqual({ type: "setHeader", header: ["A"] });
      store.apply(second);
      store.apply(first);
      expect(store.header).toBeUndefined();
      expect(store.isModified).toBe(false);
    });
  });

  describe("insertRows", () => {
    it("beforeHandle の直前に挿入し、null なら末尾。逆操作は deleteRows", () => {
      const store = new RowStore(4);
      const inverse = store.apply({
        type: "insertRows",
        beforeHandle: 2,
        handles: [-1, -2],
        rows: [["n1"], ["n2"]],
      });
      expect(store.handlesInRange(0, store.rowCount)).toEqual([1, -1, -2, 2, 3]);
      expect(store.getEdited(-2)).toEqual(["n2"]);
      expect(inverse).toEqual({ type: "deleteRows", handles: [-1, -2] });

      store.apply({ type: "insertRows", beforeHandle: null, handles: [-3], rows: [["n3"]] });
      expect(store.handleAt(store.rowCount - 1)).toBe(-3);
      expect(store.indexOfHandle(-2)).toBe(2);
    });

    it("空のファイルにも挿入できる", () => {
      const store = new RowStore(0);
      store.apply({ type: "insertRows", beforeHandle: null, handles: [-1], rows: [["a"]] });
      expect(store.rowCount).toBe(1);
      expect(segmentsOf(store)).toEqual([{ kind: "row", handle: -1, row: ["a"] }]);
    });

    it("ハンドルの重複・既存との衝突・正のハンドル・無い beforeHandle・件数の不一致は拒否し、状態は変わらない", () => {
      const store = new RowStore(3);
      store.apply({ type: "insertRows", beforeHandle: null, handles: [-1], rows: [["a"]] });
      const before = snapshot(store);
      const invalid = [
        { beforeHandle: null, handles: [-2, -2], rows: [["x"], ["y"]] },
        { beforeHandle: null, handles: [-1], rows: [["x"]] },
        { beforeHandle: null, handles: [3], rows: [["x"]] },
        { beforeHandle: null, handles: [0], rows: [["x"]] },
        { beforeHandle: 9, handles: [-5], rows: [["x"]] },
        { beforeHandle: 0, handles: [-5], rows: [["x"]] },
        { beforeHandle: null, handles: [-5, -6], rows: [["x"]] },
      ];
      for (const op of invalid) {
        expect(() => store.apply({ type: "insertRows", ...op })).toThrow(RowStoreError);
        expect(snapshot(store)).toEqual(before);
      }
    });

    it("削除済みの負のハンドルは再び使える", () => {
      const store = new RowStore(2);
      store.apply({ type: "insertRows", beforeHandle: null, handles: [-1], rows: [["a"]] });
      store.apply({ type: "deleteRows", handles: [-1] });
      expect(() =>
        store.apply({ type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["b"]] })
      ).not.toThrow();
      expect(store.handlesInRange(0, 2)).toEqual([-1, 1]);
    });
  });

  describe("deleteRows", () => {
    it("指定した行を消し、逆操作で元の位置と内容（編集済みの内容を含む）を戻す", () => {
      const store = new RowStore(7);
      store.apply({ type: "setRow", handle: 3, row: ["e3"] });
      store.apply({ type: "insertRows", beforeHandle: 5, handles: [-1], rows: [["n"]] });
      // 並び: 1 2 3 4 -1 5 6
      const before = snapshot(store);
      const inverse = store.apply({ type: "deleteRows", handles: [-1, 3, 2, 6] });
      expect(store.handlesInRange(0, store.rowCount)).toEqual([1, 4, 5]);
      expect(store.getEdited(3)).toBeUndefined();
      expect(store.has(-1)).toBe(false);
      expect(inverse).toEqual({
        type: "restoreRows",
        runs: [
          { beforeHandle: 4, handles: [2, 3], rows: [null, ["e3"]] },
          { beforeHandle: 5, handles: [-1], rows: [["n"]] },
          { beforeHandle: null, handles: [6], rows: [null] },
        ],
      });
      const redo = store.apply(inverse);
      expect(snapshot(store)).toEqual(before);
      expect(redo).toEqual({ type: "deleteRows", handles: [2, 3, -1, 6] });
    });

    it("無いハンドル・重複・ヘッダー（0）は拒否し、状態は変わらない", () => {
      const store = new RowStore(4);
      for (const handles of [[1, 1], [1, 9], [0], [-1]]) {
        expect(() => store.apply({ type: "deleteRows", handles })).toThrow(RowStoreError);
        expect(store.rowCount).toBe(3);
      }
    });

    it("全行を消しても元に戻せる", () => {
      const store = new RowStore(4);
      const inverse = store.apply({ type: "deleteRows", handles: [1, 2, 3] });
      expect(store.rowCount).toBe(0);
      expect(store.isModified).toBe(true);
      store.apply(inverse);
      expect(store.handlesInRange(0, 3)).toEqual([1, 2, 3]);
      expect(store.isModified).toBe(false);
    });
  });

  describe("チャンクの境界", () => {
    it("小さなチャンクで多数の挿入・削除をしても位置とハンドルが一致する", () => {
      const store = new RowStore(21, { chunkSize: 4 });
      const model = Array.from({ length: 20 }, (_, i) => i + 1);
      let next = -1;
      for (let i = 0; i < 30; i++) {
        const pos = (i * 7) % (model.length + 1);
        const beforeHandle = pos < model.length ? model[pos] : null;
        store.apply({ type: "insertRows", beforeHandle, handles: [next], rows: [[String(next)]] });
        model.splice(pos, 0, next);
        next--;
        if (i % 3 === 0) {
          const victim = model[(i * 5) % model.length];
          store.apply({ type: "deleteRows", handles: [victim] });
          model.splice(model.indexOf(victim), 1);
        }
      }
      expect(store.handlesInRange(0, store.rowCount)).toEqual(model);
      model.forEach((h, i) => {
        expect(store.handleAt(i)).toBe(h);
        expect(store.indexOfHandle(h)).toBe(i);
      });
    });
  });

  describe("segments", () => {
    it("未編集の元の行の連続は1区間にまとめ、編集・追加行・ヘッダーの上書きは行で返す", () => {
      const store = new RowStore(8);
      store.apply({ type: "setRow", handle: 3, row: ["e3"] });
      store.apply({ type: "insertRows", beforeHandle: 6, handles: [-1], rows: [["n"]] });
      store.apply({ type: "deleteRows", handles: [5] });
      expect(segmentsOf(store)).toEqual([
        { kind: "original", start: 0, end: 3 },
        { kind: "row", handle: 3, row: ["e3"] },
        { kind: "original", start: 4, end: 5 },
        { kind: "row", handle: -1, row: ["n"] },
        { kind: "original", start: 6, end: 8 },
      ]);
    });

    it("ヘッダーを上書きすると先頭はヘッダーの行になる", () => {
      const store = new RowStore(3);
      store.apply({ type: "setHeader", header: ["H"] });
      expect(segmentsOf(store)).toEqual([
        { kind: "row", handle: 0, row: ["H"] },
        { kind: "original", start: 1, end: 3 },
      ]);
    });
  });
});
