import type { RowOp } from "@shared/csv/ops";

/** 行配列に差分操作を順に適用した新しい配列を返す（元の配列は変更しない） */
export function applyRowOps(rows: string[][], ops: RowOp[]): string[][] {
  const result = [...rows];
  for (const op of ops) {
    result.splice(op.start, op.deleteCount, ...op.rows);
  }
  return result;
}
