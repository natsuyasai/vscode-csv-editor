import type { LargeOp } from "@message/largeMessages";
import type { RowSource } from "../rowSource/RowSource";

/**
 * 表の操作から、拡張機能へ送る編集操作（LargeOp）を作る。
 * 行は表示位置ではなく、RowSource から引いたハンドルで指定する。
 */

/** 行の1列だけを value に置き換えた setRow。列が足りない行は空文字で colCount 列まで埋める */
export function setCellOp(
  row: readonly string[],
  handle: number,
  col: number,
  value: string,
  colCount: number
): LargeOp {
  const next = Array.from({ length: Math.max(colCount, row.length, col + 1) }, (_, i) =>
    i === col ? value : (row[i] ?? "")
  );
  return { type: "setRow", handle, row: next };
}

/** ヘッダーの1列だけを value に置き換えた setHeader */
export function setHeaderOp(header: readonly string[], col: number, value: string): LargeOp {
  return { type: "setHeader", header: header.map((name, i) => (i === col ? value : name)) };
}

type HandleLookup = Pick<RowSource, "rowCount" | "getHandle">;

/**
 * viewIndex の行の上（above）または下（below）に空行を1行挿入する insertRows。
 * 下に挿入するときは次の行のハンドルの直前に入れ、最終行の下なら末尾（null）にする。
 * 基準のハンドルが分からない（未取得の）ときは null
 */
export function insertRowOp(
  source: HandleLookup,
  viewIndex: number,
  where: "above" | "below",
  handle: number,
  colCount: number
): LargeOp | null {
  if (source.getHandle(viewIndex) === undefined) {
    return null;
  }
  const beforeIndex = where === "above" ? viewIndex : viewIndex + 1;
  let beforeHandle: number | null = null;
  if (beforeIndex < source.rowCount) {
    const found = source.getHandle(beforeIndex);
    if (found === undefined) {
      return null;
    }
    beforeHandle = found;
  }
  return {
    type: "insertRows",
    beforeHandle,
    handles: [handle],
    rows: [Array.from({ length: colCount }, () => "")],
  };
}

/** viewIndex の行を削除する deleteRows。ハンドルが分からないときは null */
export function deleteRowOp(source: HandleLookup, viewIndex: number): LargeOp | null {
  const handle = source.getHandle(viewIndex);
  return handle === undefined ? null : { type: "deleteRows", handles: [handle] };
}
