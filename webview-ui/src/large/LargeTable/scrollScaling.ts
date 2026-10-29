/**
 * 大容量モードのスクロール位置のスケーリング。
 *
 * 行数×行高（仮想の高さ）がブラウザの最大要素高（Chrome 約3,355万px）を超えると、
 * スクロールバーで末尾まで移動できなくなる。そこで DOM 上の高さを MAX_SCROLL_HEIGHT までに収め、
 * DOM のスクロール位置と仮想のスクロール位置を比例で変換する。
 * - 先頭（0）は先頭、DOM の末尾（domHeight - viewport）は仮想の末尾（contentHeight - viewport）に対応する
 * - 行は「現在の DOM スクロール位置 + (行の仮想位置 - 仮想スクロール位置)」に置く（rowDomTop）
 * 高さはすべて表のボディ部分（固定ヘッダーを除く）で扱う。
 */

/** DOM 上のボディの高さの上限（px）。Firefox の上限（約1,790万px）も下回る値にする */
export const MAX_SCROLL_HEIGHT = 10_000_000;

export interface ScrollScale {
  /** 仮想の高さ（行数×行高） */
  contentHeight: number;
  /** DOM 上の高さ（contentHeight を MAX_SCROLL_HEIGHT までに収めたもの） */
  domHeight: number;
  /** ボディの表示領域の高さ */
  viewportHeight: number;
  /** DOM 上の高さを縮めているか */
  scaled: boolean;
}

export function computeScrollScale(
  rowCount: number,
  rowHeight: number,
  viewportHeight: number,
  maxHeight: number = MAX_SCROLL_HEIGHT
): ScrollScale {
  const contentHeight = Math.max(0, rowCount) * rowHeight;
  const scaled = contentHeight > maxHeight;
  return {
    contentHeight,
    domHeight: scaled ? maxHeight : contentHeight,
    viewportHeight: Math.max(0, viewportHeight),
    scaled,
  };
}

const virtualMax = (scale: ScrollScale) => Math.max(0, scale.contentHeight - scale.viewportHeight);
const domMax = (scale: ScrollScale) => Math.max(0, scale.domHeight - scale.viewportHeight);
const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** DOM のスクロール位置 → 仮想のスクロール位置 */
export function toVirtualOffset(domOffset: number, scale: ScrollScale): number {
  const dMax = domMax(scale);
  if (dMax === 0) {
    return 0;
  }
  const clamped = clamp(domOffset, dMax);
  return scale.scaled ? (clamped * virtualMax(scale)) / dMax : clamped;
}

/** 仮想のスクロール位置 → DOM のスクロール位置 */
export function toDomOffset(virtualOffset: number, scale: ScrollScale): number {
  const vMax = virtualMax(scale);
  if (vMax === 0) {
    return 0;
  }
  const clamped = clamp(virtualOffset, vMax);
  return scale.scaled ? (clamped * domMax(scale)) / vMax : clamped;
}

/** 仮想位置 itemStart の行を置く DOM 上の位置（ボディの先頭から） */
export function rowDomTop(itemStart: number, virtualOffset: number, domOffset: number): number {
  return domOffset + (itemStart - virtualOffset);
}
