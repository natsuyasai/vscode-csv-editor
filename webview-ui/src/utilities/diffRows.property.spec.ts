import * as fc from "fast-check";
import { applyRowOps } from "./applyRowOps";
import { diffRows } from "./diffRows";

describe("diffRows - Property-Based Tests", () => {
  const rowArb = fc.array(fc.constantFrom("a", "b", "c", ""), { minLength: 1, maxLength: 3 });
  const prevArb = fc.array(rowArb, { maxLength: 12 });
  // prevの行参照を共有しつつ、挿入・削除・置換を加えたnextを作る
  const scenarioArb = prevArb.chain((prev) =>
    fc
      .array(
        fc.oneof(
          fc.record({ kind: fc.constant("keep" as const), pick: fc.nat() }),
          fc.record({ kind: fc.constant("new" as const), row: rowArb })
        ),
        { maxLength: 14 }
      )
      .map((picks) => ({
        prev,
        next: picks.map((p) => (p.kind === "keep" ? (prev[p.pick % prev.length] ?? []) : p.row)),
      }))
  );

  it("opを適用するとnextに（行参照も含めて）一致する", () => {
    fc.assert(
      fc.property(scenarioArb, ({ prev, next }) => {
        const result = applyRowOps(prev, diffRows(prev, next));
        expect(result).toHaveLength(next.length);
        result.forEach((row, i) => expect(row).toBe(next[i]));
      })
    );
  });

  it("opは高々1件で、変更がなければ作られない", () => {
    fc.assert(
      fc.property(scenarioArb, ({ prev, next }) => {
        const ops = diffRows(prev, next);
        expect(ops.length).toBeLessThanOrEqual(1);
        const same = prev.length === next.length && prev.every((row, i) => row === next[i]);
        expect(ops.length === 0).toBe(same);
      })
    );
  });

  it("opは最小範囲で、先頭と末尾の置換範囲の両端は参照が異なる", () => {
    fc.assert(
      fc.property(scenarioArb, ({ prev, next }) => {
        const [op] = diffRows(prev, next);
        if (!op) return;
        const end = op.start + op.deleteCount;
        const nextEnd = op.start + op.rows.length;
        // 前方の直前までは同じ参照
        for (let i = 0; i < op.start; i++) expect(prev[i]).toBe(next[i]);
        // 後方の直後からは同じ参照
        for (let i = 0; i < prev.length - end; i++) {
          expect(prev[end + i]).toBe(next[nextEnd + i]);
        }
        // 範囲の両端は最小性を満たす（先頭・末尾が一致していたら範囲を狭められる）
        if (op.deleteCount > 0 && op.rows.length > 0) {
          expect(prev[op.start]).not.toBe(op.rows[0]);
          expect(prev[end - 1]).not.toBe(op.rows[op.rows.length - 1]);
        }
      })
    );
  });
});
