import type { RowOp } from "@shared/csv/ops";

/**
 * 編集前後の行配列から差分操作を作る。
 * 先頭と末尾から同じ参照の行が続く範囲を除いた中間を、replaceRows 1件にする。
 * 変化がなければ空配列を返す。
 * start はこの関数に渡した配列の添字基準。ヘッダー行を含むファイル行番号と配列の添字が
 * ずれる場合は offset を指定する。
 */
export function diffRows(prev: string[][], next: string[][], offset = 0): RowOp[] {
  const minLength = Math.min(prev.length, next.length);

  let head = 0;
  while (head < minLength && prev[head] === next[head]) {
    head++;
  }

  // 先頭の一致範囲と重ならないよう、末尾の一致数は残りの短い方を上限にする
  const maxTail = minLength - head;
  let tail = 0;
  while (tail < maxTail && prev[prev.length - 1 - tail] === next[next.length - 1 - tail]) {
    tail++;
  }

  const deleteCount = prev.length - head - tail;
  const rows = next.slice(head, next.length - tail);
  if (deleteCount === 0 && rows.length === 0) {
    return [];
  }
  return [{ type: "replaceRows", start: head + offset, deleteCount, rows }];
}
