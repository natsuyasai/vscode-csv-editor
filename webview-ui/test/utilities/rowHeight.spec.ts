import { describe, expect, it } from "vitest";
import { getRowHeightFromSize, clampRowHeight } from "@/utilities/rowHeight";

describe("rowHeight", () => {
  describe("getRowHeightFromSize", () => {
    it("smallサイズの高さを返す", () => {
      expect(getRowHeightFromSize("small")).toBe(24);
    });

    it("normalサイズの高さを返す", () => {
      expect(getRowHeightFromSize("normal")).toBe(40);
    });

    it("largeサイズの高さを返す", () => {
      expect(getRowHeightFromSize("large")).toBe(80);
    });

    it("extra largeサイズの高さを返す", () => {
      expect(getRowHeightFromSize("extra large")).toBe(120);
    });

    it("不明なサイズの場合はnormalの高さを返す", () => {
      // @ts-expect-error テスト用の不正な値
      expect(getRowHeightFromSize("unknown")).toBe(40);
    });
  });

  describe("clampRowHeight", () => {
    it("最大値以下の場合はそのまま返す", () => {
      expect(clampRowHeight(100)).toBe(100);
      expect(clampRowHeight(500)).toBe(500);
    });

    it("最大値を超える場合は最大値を返す", () => {
      expect(clampRowHeight(600)).toBe(500);
      expect(clampRowHeight(1000)).toBe(500);
    });

    it("カスタム最大値が指定された場合はその値でクランプする", () => {
      expect(clampRowHeight(150, 100)).toBe(100);
      expect(clampRowHeight(50, 100)).toBe(50);
    });

    it("負の値も正しく処理する", () => {
      expect(clampRowHeight(-10)).toBe(-10);
      expect(clampRowHeight(-10, 0)).toBe(-10);
    });
  });
});