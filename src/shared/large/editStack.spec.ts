import { EditStack } from "./editStack";
import { RowStore, RowStoreError } from "./rowStore";

function contents(store: RowStore) {
  const handles = store.handlesInRange(0, store.rowCount);
  return { handles, rows: handles.map((h) => store.getEdited(h)), header: store.header };
}

function setup(lineCount = 4) {
  const store = new RowStore(lineCount);
  return { store, stack: new EditStack(store) };
}

describe("EditStack", () => {
  it("初期状態は undo も redo もできず、dirty でない", () => {
    const { stack } = setup();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.isDirty).toBe(false);
    expect(stack.undo()).toBe(false);
    expect(stack.redo()).toBe(false);
  });

  it("apply した op 列を1単位として undo / redo する", () => {
    const { store, stack } = setup();
    const initial = contents(store);
    expect(
      stack.apply([
        { type: "setRow", handle: 1, row: ["a"] },
        { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["n"]] },
        { type: "deleteRows", handles: [2] },
        { type: "setHeader", header: ["H"] },
      ])
    ).toBe(true);
    const edited = contents(store);
    expect(edited.handles).toEqual([-1, 1, 3]);
    expect(stack.isDirty).toBe(true);

    expect(stack.undo()).toBe(true);
    expect(contents(store)).toEqual(initial);
    expect(stack.isDirty).toBe(false);
    expect(stack.canRedo).toBe(true);

    expect(stack.redo()).toBe(true);
    expect(contents(store)).toEqual(edited);
    expect(stack.isDirty).toBe(true);
  });

  it("空の op 列は何もせず履歴も積まない", () => {
    const { stack } = setup();
    expect(stack.apply([])).toBe(false);
    expect(stack.canUndo).toBe(false);
  });

  it("途中の op が不正なら、それまでの op を巻き戻して例外を投げ、履歴も redo も変わらない", () => {
    const { store, stack } = setup();
    stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
    stack.apply([{ type: "setRow", handle: 2, row: ["b"] }]);
    stack.undo();
    const before = contents(store);
    expect(() =>
      stack.apply([
        { type: "setRow", handle: 3, row: ["c"] },
        { type: "deleteRows", handles: [3] },
        { type: "setRow", handle: 3, row: ["d"] },
      ])
    ).toThrow(RowStoreError);
    expect(contents(store)).toEqual(before);
    expect(stack.canRedo).toBe(true);
    stack.redo();
    expect(store.getEdited(2)).toEqual(["b"]);
  });

  it("新しい編集で redo 履歴は捨てられる", () => {
    const { stack } = setup();
    stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
    stack.undo();
    stack.apply([{ type: "setRow", handle: 2, row: ["b"] }]);
    expect(stack.canRedo).toBe(false);
  });

  describe("保存位置と dirty", () => {
    it("保存した位置に undo / redo で戻ると dirty でなくなる", () => {
      const { stack } = setup();
      stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
      stack.markSaved();
      expect(stack.isDirty).toBe(false);
      stack.apply([{ type: "setRow", handle: 1, row: ["b"] }]);
      expect(stack.isDirty).toBe(true);
      stack.undo();
      expect(stack.isDirty).toBe(false);
      stack.undo();
      expect(stack.isDirty).toBe(true);
      stack.redo();
      expect(stack.isDirty).toBe(false);
    });

    it("保存後に undo してから新しい編集をすると、保存した状態には戻れないので dirty のまま", () => {
      const { stack } = setup();
      stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
      stack.markSaved();
      stack.undo();
      stack.apply([{ type: "setRow", handle: 2, row: ["b"] }]);
      expect(stack.isDirty).toBe(true);
      stack.undo();
      expect(stack.isDirty).toBe(true);
      expect(stack.redo()).toBe(true);
      expect(stack.isDirty).toBe(true);
    });

    it("保存を始めた時点の version を markSaved に渡すと、保存中の編集は dirty のまま", () => {
      const { stack } = setup();
      stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
      const version = stack.version;
      stack.apply([{ type: "setRow", handle: 2, row: ["b"] }]);
      expect(stack.version).not.toBe(version);
      stack.markSaved(version);
      expect(stack.isDirty).toBe(true);
      stack.undo();
      expect(stack.version).toBe(version);
      expect(stack.isDirty).toBe(false);
    });

    it("内容が元と同じでも保存位置と違えば dirty（VSCode の dirty と揃える）", () => {
      const { stack } = setup();
      stack.apply([{ type: "setRow", handle: 1, row: ["a"] }]);
      stack.markSaved();
      stack.undo();
      expect(stack.isDirty).toBe(true);
    });
  });
});
