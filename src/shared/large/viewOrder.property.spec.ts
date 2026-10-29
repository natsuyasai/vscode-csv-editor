import * as fc from "fast-check";
import type { LargeOp } from "../../message/largeMessages";
import { EditStack } from "./editStack";
import { RowStore, type RowStoreOp } from "./rowStore";
import { applyStoreOpToView, ViewOrder, type RemovedPlace } from "./viewOrder";

/*
 * 性質（RowStore に op を当て、同じ op を表示順にも当てる。表示順は RowStore の行の任意の並べ替え・部分集合）:
 * (a) insert / remove / remap は配列モデルと一致する
 * (b) 表示順にあった行は、削除されない限り相対順を保つ。挿入した行は表示順の beforeHandle の直前（無ければ末尾）に入る
 * (c) 表示順の行は常に RowStore にある行で、重複しない
 * (d) 編集の直後に Undo すると表示順は編集の前とまったく同じに戻る（削除の Undo は元の位置に戻る）
 */

const sample = <T>(items: readonly T[], seed: number): T | undefined =>
  items.length === 0 ? undefined : items[seed % items.length];

type Seed =
  | { kind: "insert"; at: number; count: number; end: boolean }
  | { kind: "delete"; picks: number[] }
  | { kind: "set"; at: number };

const seedArb: fc.Arbitrary<Seed> = fc.oneof(
  fc.record({
    kind: fc.constant("insert" as const),
    at: fc.nat(),
    count: fc.integer({ min: 1, max: 3 }),
    end: fc.boolean(),
  }),
  fc.record({
    kind: fc.constant("delete" as const),
    picks: fc.array(fc.nat(), { minLength: 1, maxLength: 3 }),
  }),
  fc.record({ kind: fc.constant("set" as const), at: fc.nat() })
);

/** 表示順の初期状態: データ行 1..n を shuffle で並べ替え、keep で間引く */
const initialArb = fc.integer({ min: 0, max: 12 }).chain((n) =>
  fc.record({
    n: fc.constant(n),
    order: fc.shuffledSubarray(
      Array.from({ length: n }, (_, i) => i + 1),
      { minLength: 0, maxLength: n }
    ),
  })
);

describe("viewOrder のプロパティ", () => {
  it("(a) insert / remove / remap は配列モデルと一致する", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -20, max: 20 }), { maxLength: 15 }),
        fc.array(
          fc.oneof(
            fc.record({
              kind: fc.constant("insert" as const),
              before: fc.integer({ min: -20, max: 20 }),
              nul: fc.boolean(),
            }),
            fc.record({
              kind: fc.constant("remove" as const),
              handles: fc.array(fc.integer({ min: -20, max: 20 }), { maxLength: 4 }),
            }),
            fc.record({
              kind: fc.constant("remap" as const),
              drop: fc.integer({ min: -20, max: 20 }),
            })
          ),
          { maxLength: 10 }
        ),
        (initial, actions) => {
          const view = new ViewOrder(initial);
          let model = [...initial];
          let next = 100;
          for (const action of actions) {
            if (action.kind === "insert") {
              const handles = [next++, next++];
              const before = action.nul ? null : action.before;
              view.insert(before, handles);
              const at = before === null ? -1 : model.indexOf(before);
              model.splice(at < 0 ? model.length : at, 0, ...handles);
            } else if (action.kind === "remove") {
              const places = view.remove(action.handles);
              const removed = new Set(action.handles);
              model.forEach((h, i) => {
                if (removed.has(h)) {
                  const after = model.slice(i + 1).find((x) => !removed.has(x));
                  expect(places.get(h)).toEqual({ next: after ?? null, index: i });
                }
              });
              model = model.filter((h) => !removed.has(h));
            } else {
              view.remap((h) => (h === action.drop ? undefined : h + 1000));
              model = model.filter((h) => h !== action.drop).map((h) => h + 1000);
            }
            expect(view.handlesInRange(0, view.length)).toEqual(model);
            expect(view.length).toBe(model.length);
            model.forEach((h, i) => {
              expect(view.indexOf(h)).toBe(i);
            });
          }
        }
      )
    );
  });

  it("(b)(c)(d) RowStore の op を当てても相対順と所属を保ち、直後の Undo で元に戻る", () => {
    fc.assert(
      fc.property(initialArb, fc.array(seedArb, { maxLength: 12 }), ({ n, order }, seeds) => {
        const store = new RowStore(n + 1, { chunkSize: 2 });
        const view = new ViewOrder(order);
        const places = new Map<number, RemovedPlace>();
        const stack = new EditStack(store, {
          onApplied: (op: RowStoreOp) => {
            applyStoreOpToView(view, op, places);
          },
        });
        let nextHandle = -1;
        for (const seed of seeds) {
          const before = view.handlesInRange(0, view.length);
          let op: LargeOp | undefined;
          if (seed.kind === "insert") {
            const count = seed.count;
            const handles = Array.from({ length: count }, () => nextHandle--);
            const target = seed.end ? null : (sample(before, seed.at) ?? null);
            op = {
              type: "insertRows",
              beforeHandle: target,
              handles,
              rows: handles.map(() => ["x"]),
            };
          } else if (seed.kind === "delete") {
            const picks = [...new Set(seed.picks.map((p) => sample(before, p)))].filter(
              (h): h is number => h !== undefined
            );
            op = picks.length > 0 ? { type: "deleteRows", handles: picks } : undefined;
          } else {
            const handle = sample(before, seed.at);
            op = handle === undefined ? undefined : { type: "setRow", handle, row: ["y"] };
          }
          if (!op) {
            continue;
          }
          stack.apply([op]);
          const after = view.handlesInRange(0, view.length);
          // (c) 表示順の行は RowStore にあり、重複しない
          expect(new Set(after).size).toBe(after.length);
          for (const h of after) {
            expect(store.has(h)).toBe(true);
          }
          // (b) 残った行の相対順は保たれる
          const kept = before.filter((h) => after.includes(h));
          expect(after.filter((h) => before.includes(h))).toEqual(kept);
          if (op.type === "insertRows") {
            const at = op.beforeHandle === null ? after.length : after.indexOf(op.beforeHandle);
            expect(after.slice(at - op.handles.length, at)).toEqual(op.handles);
          }
          // (d) 直後の Undo で元に戻り、Redo でもう一度同じになる
          stack.undo();
          expect(view.handlesInRange(0, view.length)).toEqual(before);
          stack.redo();
          expect(view.handlesInRange(0, view.length)).toEqual(after);
        }
      })
    );
  });
});
