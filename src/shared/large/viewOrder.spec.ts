import { RowStore } from "./rowStore";
import { applyStoreOpToView, ViewOrder, type RemovedPlace } from "./viewOrder";

const handlesOf = (view: ViewOrder) => view.handlesInRange(0, view.length);

describe("ViewOrder", () => {
  it("位置からハンドル、ハンドルから位置を引ける", () => {
    const view = new ViewOrder([5, 3, -1, 2]);
    expect(view.length).toBe(4);
    expect(view.handleAt(2)).toBe(-1);
    expect(view.indexOf(2)).toBe(3);
    expect(view.indexOf(9)).toBe(-1);
    expect(view.handlesInRange(1, 10)).toEqual([3, -1, 2]);
    expect(view.handlesInRange(9, 2)).toEqual([]);
  });

  it("insert は beforeHandle の直前に入れ、無い・null なら末尾に入れる", () => {
    const view = new ViewOrder([5, 3]);
    view.insert(3, [-1, -2]);
    expect(handlesOf(view)).toEqual([5, -1, -2, 3]);
    view.insert(null, [-3]);
    view.insert(99, [-4]);
    expect(handlesOf(view)).toEqual([5, -1, -2, 3, -3, -4]);
  });

  it("remove は除いた行ごとに、直後に残った行と元の位置を返す", () => {
    const view = new ViewOrder([5, 3, 4, 1]);
    const places = view.remove([3, 4, 1, 77]);
    expect(handlesOf(view)).toEqual([5]);
    expect(places.get(3)).toEqual({ next: null, index: 1 });
    expect(places.get(1)).toEqual({ next: null, index: 3 });
    const view2 = new ViewOrder([5, 3, 4, 1]);
    expect(view2.remove([3]).get(3)).toEqual({ next: 4, index: 1 });
  });

  it("remap は付け替え、undefined の行は除く", () => {
    const view = new ViewOrder([5, 3, -1]);
    view.remap((h) => (h === 3 ? undefined : h * 10));
    expect(handlesOf(view)).toEqual([50, -10]);
  });

  it("toFloat64Array はコピーを返す", () => {
    const view = new ViewOrder([1, 2]);
    const copy = view.toFloat64Array();
    copy[0] = 9;
    expect(view.handleAt(0)).toBe(1);
  });
});

describe("applyStoreOpToView（RowStore に当てた op を表示順に当てる）", () => {
  it("行の挿入は表示順で beforeHandle の直前に入る", () => {
    const store = new RowStore(5); // データ行 1..4
    const view = new ViewOrder([4, 2, 3, 1]);
    const places = new Map<number, RemovedPlace>();
    const op = { type: "insertRows" as const, beforeHandle: 3, handles: [-1], rows: [["x"]] };
    store.apply(op);
    applyStoreOpToView(view, op, places);
    expect(handlesOf(view)).toEqual([4, 2, -1, 3, 1]);
  });

  it("削除を元に戻すと、削除した位置に戻る", () => {
    const store = new RowStore(6);
    const view = new ViewOrder([4, 2, 5, 3, 1]);
    const places = new Map<number, RemovedPlace>();
    const del = { type: "deleteRows" as const, handles: [2, 3] };
    const inverse = store.apply(del);
    applyStoreOpToView(view, del, places);
    expect(handlesOf(view)).toEqual([4, 5, 1]);
    store.apply(inverse);
    applyStoreOpToView(view, inverse, places);
    expect(handlesOf(view)).toEqual([4, 2, 5, 3, 1]);
  });

  it("戻す位置の行が表示に無ければ、ファイル上の次の行の直前、それも無ければ末尾に戻す", () => {
    const store = new RowStore(6);
    const view = new ViewOrder([4, 2]);
    const places = new Map<number, RemovedPlace>();
    const inverse = store.apply({ type: "deleteRows", handles: [3] });
    // 表示に無い行の削除は表示を変えない（places にも無い）
    applyStoreOpToView(view, { type: "deleteRows", handles: [3] }, places);
    store.apply(inverse);
    applyStoreOpToView(view, inverse, places);
    expect(handlesOf(view)).toEqual([3, 4, 2]);
  });

  it("セル・ヘッダーの編集は表示順を変えない", () => {
    const view = new ViewOrder([2, 1]);
    applyStoreOpToView(view, { type: "setRow", handle: 1, row: ["z"] }, new Map());
    applyStoreOpToView(view, { type: "setHeader", header: ["h"] }, new Map());
    expect(handlesOf(view)).toEqual([2, 1]);
  });
});
