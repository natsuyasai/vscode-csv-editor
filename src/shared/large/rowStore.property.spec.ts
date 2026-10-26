import * as fc from "fast-check";
import type { LargeOp } from "../../message/largeMessages";
import { EditStack } from "./editStack";
import { RowStore, RowStoreError } from "./rowStore";
import type { RowStoreOp } from "./rowStore";

/*
 * 性質（配列モデルとの比較）:
 * (a) op を当てて得た逆操作を逆順に当てると、並び・編集内容・ヘッダーが完全に元に戻る
 * (b) 各 op の後、handleAt / indexOfHandle / getEdited / header / isModified が単純な配列モデルと一致する
 * (c) segments() を展開するとモデルのファイル行の並びと一致し、未編集の元の行の連続は1区間にまとまる
 * (d) EditStack: apply / undo / redo / markSaved を任意に挟んでも、履歴付きの配列モデルと内容・dirty が一致する
 * 不正な op（存在しないハンドル・重複・衝突）は例外になり、状態は変わらない。
 * チャンクサイズを小さくして、チャンクの分割・結合の境界をよく通す。
 */

interface ModelRow {
  handle: number;
  /** null は元ファイルの行のまま */
  row: string[] | null;
}

interface Model {
  rows: ModelRow[];
  header: string[] | null;
}

type OpSeed =
  | { kind: "set"; pos: number; row: string[] }
  | { kind: "header"; header: string[] }
  | { kind: "insert"; pos: number; rows: string[][]; reuse: boolean }
  | { kind: "delete"; positions: number[] }
  | { kind: "invalid"; variant: number; pos: number };

/** 負のハンドルの採番（webview 相当）。reuse で、使ったことがあり今は無いハンドルを使い回す */
interface HandleContext {
  next: number;
  used: number[];
}

const cellArb = fc.string({ unit: fc.constantFrom("a", "b", ",", '"', "\n", "あ"), maxLength: 3 });
const rowArb = fc.array(cellArb, { maxLength: 3 });

const seedArb: fc.Arbitrary<OpSeed> = fc.oneof(
  {
    weight: 3,
    arbitrary: fc.record({ kind: fc.constant("set" as const), pos: fc.nat(), row: rowArb }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("header" as const), header: rowArb }) },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("insert" as const),
      pos: fc.nat(),
      rows: fc.array(rowArb, { minLength: 1, maxLength: 5 }),
      reuse: fc.boolean(),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("delete" as const),
      positions: fc.array(fc.nat(), { maxLength: 6 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("invalid" as const),
      variant: fc.nat({ max: 4 }),
      pos: fc.nat(),
    }),
  }
);

const chunkSizeArb = fc.constantFrom(1, 2, 3, 4, 8, 4096);
const lineCountArb = fc.nat({ max: 40 });

function initialModel(lineCount: number): Model {
  const dataRows = Math.max(0, lineCount - 1);
  return {
    rows: Array.from({ length: dataRows }, (_, i) => ({ handle: i + 1, row: null })),
    header: null,
  };
}

function cloneModel(model: Model): Model {
  return {
    rows: model.rows.map((r) => ({ handle: r.handle, row: r.row ? [...r.row] : null })),
    header: model.header ? [...model.header] : null,
  };
}

/** 存在しないハンドル（元ファイルの範囲外か、削除済みの元の行） */
function absentHandle(model: Model, lineCount: number): number {
  const present = new Set(model.rows.map((r) => r.handle));
  for (let h = 1; h < lineCount; h++) {
    if (!present.has(h)) {
      return h;
    }
  }
  return Math.max(lineCount, 1) + 7;
}

/** モデルの現在の状態に対して seed を op にする。valid は RowStore が受け付けるべきか */
function toOp(
  seed: OpSeed,
  model: Model,
  lineCount: number,
  ctx: HandleContext
): { op: LargeOp; valid: boolean } {
  const len = model.rows.length;
  switch (seed.kind) {
    case "set":
      if (len === 0) {
        return { op: { type: "setRow", handle: 1, row: seed.row }, valid: false };
      }
      return {
        op: { type: "setRow", handle: model.rows[seed.pos % len].handle, row: seed.row },
        valid: true,
      };
    case "header":
      return { op: { type: "setHeader", header: seed.header }, valid: true };
    case "insert": {
      const pos = seed.pos % (len + 1);
      const present = new Set(model.rows.map((r) => r.handle));
      const handles: number[] = [];
      for (let i = 0; i < seed.rows.length; i++) {
        const reusable = seed.reuse
          ? ctx.used.find((h) => !present.has(h) && !handles.includes(h))
          : undefined;
        if (reusable !== undefined) {
          handles.push(reusable);
        } else {
          handles.push(ctx.next);
          ctx.used.push(ctx.next);
          ctx.next--;
        }
      }
      return {
        op: {
          type: "insertRows",
          beforeHandle: pos < len ? model.rows[pos].handle : null,
          handles,
          rows: seed.rows,
        },
        valid: true,
      };
    }
    case "delete": {
      const handles = [
        ...new Set(len === 0 ? [] : seed.positions.map((p) => model.rows[p % len].handle)),
      ];
      return { op: { type: "deleteRows", handles }, valid: true };
    }
    case "invalid": {
      const some = len === 0 ? undefined : model.rows[seed.pos % len].handle;
      switch (seed.variant) {
        case 0:
          return { op: { type: "setRow", handle: 0, row: ["x"] }, valid: false };
        case 1:
          return {
            op: { type: "setRow", handle: absentHandle(model, lineCount), row: ["x"] },
            valid: false,
          };
        case 2:
          // 既に並びにあるハンドル（無ければ正のハンドル）で挿入
          return {
            op: { type: "insertRows", beforeHandle: null, handles: [some ?? 1], rows: [["x"]] },
            valid: false,
          };
        case 3:
          return {
            op: {
              type: "deleteRows",
              handles: some === undefined ? [absentHandle(model, lineCount)] : [some, some],
            },
            valid: false,
          };
        default:
          return {
            op: {
              type: "insertRows",
              beforeHandle: absentHandle(model, lineCount),
              handles: [ctx.next - 1000],
              rows: [["x"]],
            },
            valid: false,
          };
      }
    }
  }
}

function applyToModel(model: Model, op: LargeOp): Model {
  const next = cloneModel(model);
  switch (op.type) {
    case "setRow": {
      const target = next.rows.find((r) => r.handle === op.handle);
      if (target) {
        target.row = [...op.row];
      }
      return next;
    }
    case "setHeader":
      next.header = [...op.header];
      return next;
    case "insertRows": {
      const pos =
        op.beforeHandle === null
          ? next.rows.length
          : next.rows.findIndex((r) => r.handle === op.beforeHandle);
      next.rows.splice(
        pos,
        0,
        ...op.handles.map((handle, i) => ({ handle, row: [...op.rows[i]] }))
      );
      return next;
    }
    case "deleteRows": {
      const victims = new Set(op.handles);
      next.rows = next.rows.filter((r) => !victims.has(r.handle));
      return next;
    }
  }
}

function isModelModified(model: Model, lineCount: number): boolean {
  const dataRows = Math.max(0, lineCount - 1);
  return (
    model.header !== null ||
    model.rows.length !== dataRows ||
    model.rows.some((r, i) => r.row !== null || r.handle !== i + 1)
  );
}

/** モデルのファイル行の並び（ヘッダーを含む）。row が null なら元ファイルの行のまま */
function modelLines(model: Model, lineCount: number): ModelRow[] {
  const header: ModelRow[] =
    model.header !== null
      ? [{ handle: 0, row: model.header }]
      : lineCount > 0
        ? [{ handle: 0, row: null }]
        : [];
  return [...header, ...model.rows];
}

function expectSegments(store: RowStore, model: Model, lineCount: number) {
  const segments = [...store.segments()];
  const expanded: ModelRow[] = [];
  segments.forEach((seg, i) => {
    if (seg.kind === "original") {
      expect(seg.end).toBeGreaterThan(seg.start);
      const prev = segments[i - 1];
      if (prev?.kind === "original") {
        expect(prev.end).not.toBe(seg.start);
      }
      for (let line = seg.start; line < seg.end; line++) {
        expanded.push({ handle: line, row: null });
      }
    } else {
      expanded.push({ handle: seg.handle, row: [...seg.row] });
    }
  });
  expect(expanded).toEqual(modelLines(model, lineCount));
}

function expectMatches(store: RowStore, model: Model, lineCount: number) {
  const handles = model.rows.map((r) => r.handle);
  expect(store.rowCount).toBe(model.rows.length);
  expect(store.handlesInRange(0, store.rowCount)).toEqual(handles);
  model.rows.forEach((r, i) => {
    expect(store.handleAt(i)).toBe(r.handle);
    expect(store.indexOfHandle(r.handle)).toBe(i);
    expect(store.has(r.handle)).toBe(true);
    expect(store.getEdited(r.handle)).toEqual(r.row ?? undefined);
  });
  const present = new Set(handles);
  for (let h = 0; h < lineCount + 2; h++) {
    if (!present.has(h)) {
      expect(store.indexOfHandle(h)).toBe(-1);
      expect(store.has(h)).toBe(false);
    }
  }
  expect(store.header).toEqual(model.header ?? undefined);
  expect(store.isModified).toBe(isModelModified(model, lineCount));
  expectSegments(store, model, lineCount);
}

describe("RowStore - Property-Based Tests", () => {
  it("op 列の各段階で配列モデルと一致し、逆操作を逆順に当てると元に戻る", () => {
    fc.assert(
      fc.property(
        lineCountArb,
        chunkSizeArb,
        fc.array(seedArb, { maxLength: 25 }),
        (lineCount, chunkSize, seeds) => {
          const store = new RowStore(lineCount, { chunkSize });
          const initial = initialModel(lineCount);
          let model = initial;
          const ctx: HandleContext = { next: -1, used: [] };
          const inverses: RowStoreOp[] = [];
          for (const seed of seeds) {
            const { op, valid } = toOp(seed, model, lineCount, ctx);
            if (valid) {
              inverses.push(store.apply(op));
              model = applyToModel(model, op);
            } else {
              expect(() => store.apply(op)).toThrow(RowStoreError);
            }
            expectMatches(store, model, lineCount);
          }
          for (const inverse of inverses.reverse()) {
            store.apply(inverse);
          }
          expectMatches(store, initial, lineCount);
          expect(store.isModified).toBe(false);
        }
      ),
      { numRuns: 800 }
    );
  });
});

type Command =
  { kind: "apply"; seeds: OpSeed[] } | { kind: "undo" } | { kind: "redo" } | { kind: "save" };

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant("apply" as const),
      seeds: fc.array(seedArb, { maxLength: 4 }),
    }),
  },
  { weight: 2, arbitrary: fc.constant({ kind: "undo" as const }) },
  { weight: 2, arbitrary: fc.constant({ kind: "redo" as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: "save" as const }) }
);

interface Version {
  id: number;
  model: Model;
}

describe("EditStack - Property-Based Tests", () => {
  it("apply / undo / redo / markSaved を任意に挟んでも履歴付きの配列モデルと一致する", () => {
    fc.assert(
      fc.property(
        lineCountArb,
        chunkSizeArb,
        fc.array(commandArb, { maxLength: 30 }),
        (lineCount, chunkSize, commands) => {
          const store = new RowStore(lineCount, { chunkSize });
          const stack = new EditStack(store);
          const ctx: HandleContext = { next: -1, used: [] };
          let current: Version = { id: 0, model: initialModel(lineCount) };
          const past: Version[] = [];
          let future: Version[] = [];
          let savedId = 0;
          let nextId = 1;

          for (const command of commands) {
            switch (command.kind) {
              case "apply": {
                let working = current.model;
                const ops: LargeOp[] = [];
                let valid = true;
                for (const seed of command.seeds) {
                  const converted = toOp(seed, working, lineCount, ctx);
                  ops.push(converted.op);
                  if (!converted.valid) {
                    valid = false;
                    break;
                  }
                  working = applyToModel(working, converted.op);
                }
                if (!valid) {
                  expect(() => stack.apply(ops)).toThrow(RowStoreError);
                } else if (ops.length === 0) {
                  expect(stack.apply(ops)).toBe(false);
                } else {
                  expect(stack.apply(ops)).toBe(true);
                  past.push(current);
                  current = { id: nextId++, model: working };
                  future = [];
                }
                break;
              }
              case "undo": {
                const previous = past.pop();
                expect(stack.undo()).toBe(previous !== undefined);
                if (previous) {
                  future.push(current);
                  current = previous;
                }
                break;
              }
              case "redo": {
                const following = future.pop();
                expect(stack.redo()).toBe(following !== undefined);
                if (following) {
                  past.push(current);
                  current = following;
                }
                break;
              }
              case "save":
                stack.markSaved();
                savedId = current.id;
                break;
            }
            expectMatches(store, current.model, lineCount);
            expect(stack.isDirty).toBe(current.id !== savedId);
            expect(stack.canUndo).toBe(past.length > 0);
            expect(stack.canRedo).toBe(future.length > 0);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
