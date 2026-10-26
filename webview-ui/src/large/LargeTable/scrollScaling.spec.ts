import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  computeScrollScale,
  MAX_SCROLL_HEIGHT,
  rowDomTop,
  toDomOffset,
  toVirtualOffset,
} from "./scrollScaling";

describe("computeScrollScale", () => {
  it("最大高さ以下なら実寸のままにする", () => {
    const scale = computeScrollScale(100, 40, 400);
    expect(scale).toEqual({
      contentHeight: 4000,
      domHeight: 4000,
      viewportHeight: 400,
      scaled: false,
    });
  });

  it("最大高さを超えるなら DOM 上の高さを上限に収める", () => {
    const scale = computeScrollScale(5_000_000, 40, 600);
    expect(scale.contentHeight).toBe(200_000_000);
    expect(scale.domHeight).toBe(MAX_SCROLL_HEIGHT);
    expect(scale.scaled).toBe(true);
  });

  it("上限は Chrome の最大要素高（約3,355万px）より十分小さい", () => {
    expect(MAX_SCROLL_HEIGHT).toBeLessThanOrEqual(15_000_000);
  });

  it("行が0件なら高さは0", () => {
    expect(computeScrollScale(0, 40, 400).domHeight).toBe(0);
  });
});

describe("toVirtualOffset / toDomOffset", () => {
  it("スケーリングしない場合は同じ値を返す", () => {
    const scale = computeScrollScale(100, 40, 400);
    expect(toVirtualOffset(1234, scale)).toBe(1234);
    expect(toDomOffset(1234, scale)).toBe(1234);
  });

  it("先頭は先頭、DOM 上の末尾は仮想の末尾に対応する", () => {
    const scale = computeScrollScale(5_000_000, 40, 600);
    expect(toVirtualOffset(0, scale)).toBe(0);
    const domMax = scale.domHeight - scale.viewportHeight;
    const virtualMax = scale.contentHeight - scale.viewportHeight;
    expect(toVirtualOffset(domMax, scale)).toBeCloseTo(virtualMax, 3);
    expect(toDomOffset(virtualMax, scale)).toBeCloseTo(domMax, 3);
  });

  it("範囲外のスクロール位置は端に丸める", () => {
    const scale = computeScrollScale(5_000_000, 40, 600);
    expect(toVirtualOffset(-10, scale)).toBe(0);
    expect(toVirtualOffset(scale.domHeight * 2, scale)).toBeCloseTo(
      scale.contentHeight - scale.viewportHeight,
      3
    );
  });

  it("表示領域が内容より高いときは常に0", () => {
    const scale = computeScrollScale(3, 40, 400);
    expect(toVirtualOffset(50, scale)).toBe(0);
    expect(toDomOffset(50, scale)).toBe(0);
  });

  it("性質: DOM のスクロール位置に対して単調増加し、往復で元に戻る", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20_000_000 }),
        fc.integer({ min: 100, max: 2000 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (rowCount, viewport, a, b) => {
          const scale = computeScrollScale(rowCount, 40, viewport);
          const domMax = Math.max(0, scale.domHeight - scale.viewportHeight);
          const [lo, hi] = a <= b ? [a * domMax, b * domMax] : [b * domMax, a * domMax];
          expect(toVirtualOffset(lo, scale)).toBeLessThanOrEqual(toVirtualOffset(hi, scale));
          const round = toDomOffset(toVirtualOffset(hi, scale), scale);
          expect(Math.abs(round - hi)).toBeLessThan(1e-3 * Math.max(1, hi));
        }
      )
    );
  });
});

describe("rowDomTop", () => {
  it("行の仮想位置を、現在のスクロール位置からの相対で DOM 上に置く", () => {
    // 仮想 1000px の位置にある行は、仮想オフセット 900 / DOM 位置 90 のとき DOM 上 190px
    expect(rowDomTop(1000, 900, 90)).toBe(190);
  });

  it("末尾までスクロールすると最終行の下端が DOM の高さに一致する", () => {
    const rowHeight = 40;
    const scale = computeScrollScale(5_000_000, rowHeight, 600);
    const domTop = scale.domHeight - scale.viewportHeight;
    const virtualOffset = toVirtualOffset(domTop, scale);
    const lastStart = (5_000_000 - 1) * rowHeight;
    expect(rowDomTop(lastStart, virtualOffset, domTop) + rowHeight).toBeCloseTo(scale.domHeight, 3);
  });
});
