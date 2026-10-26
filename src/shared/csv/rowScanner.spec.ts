import { scanRows } from "./rowScanner";

const BOM = "﻿";

const starts = (text: string) => scanRows(text).rows.map((row) => row.start);

describe("scanRows", () => {
  describe("行区切りの検出", () => {
    it("最初の改行がLFならLFを行区切りとする", () => {
      expect(scanRows("a\nb\r\nc").delimiter).toBe("\n");
    });

    it("最初の改行がCRLFならCRLFを行区切りとする", () => {
      expect(scanRows("a\r\nb\nc").delimiter).toBe("\r\n");
    });

    it("LFが続かないCRはCRを行区切りとする", () => {
      expect(scanRows("a\rb\r\nc").delimiter).toBe("\r");
    });

    it("クォート内の改行は行区切りの検出に使わない", () => {
      expect(scanRows('"a\nb"\r\nc').delimiter).toBe("\r\n");
    });

    it("改行が無ければ行区切りは null", () => {
      expect(scanRows("a,b").delimiter).toBeNull();
      expect(scanRows("").delimiter).toBeNull();
    });
  });

  describe("行の範囲", () => {
    it("行区切りがLFのとき、CRLFのCRは行の内容に含める", () => {
      expect(scanRows("x\na\r\nb").rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 4, next: 5 },
        { start: 5, end: 6, next: 6 },
      ]);
    });

    it("行区切りがCRのとき、CRの直後のLFは次の行の内容になる", () => {
      expect(scanRows("a\rb\r\n").rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 3, next: 4 },
        { start: 4, end: 5, next: 5 },
      ]);
    });

    it("末尾改行が無い最終行は終了位置と次の行の開始位置がテキスト末尾になる", () => {
      expect(scanRows("a\nbc").rows[1]).toEqual({ start: 2, end: 4, next: 4 });
    });

    it("BOMは最初の行に含めない", () => {
      expect(scanRows(`${BOM}a\nb`).rows[0]).toEqual({ start: 1, end: 2, next: 3 });
    });

    it("BOMのみのテキストは0行", () => {
      expect(scanRows(BOM).rows).toEqual([]);
    });
  });

  describe("クォート", () => {
    it("クォート内の区切りの改行は行を分けない", () => {
      expect(starts('"a\r\nb",c\r\nd')).toEqual([0, 10]);
    });

    it('クォート内の `""` はクォートを閉じない', () => {
      expect(starts('"a""\nb"\nc')).toEqual([0, 8]);
    });

    it("空のクォートのセルだけの最終行も1行と数える", () => {
      expect(starts('a\n""')).toEqual([0, 2]);
    });

    it("閉じていないクォートは例外を投げず末尾までを1行とする", () => {
      expect(scanRows('a\n"b\nc').rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 6, next: 6 },
      ]);
    });
  });

  describe("空行と末尾", () => {
    it("連続する改行の間の空行も1行と数える", () => {
      expect(starts("a\r\n\r\nb\r\n")).toEqual([0, 3, 5]);
    });

    it("改行のみのテキストは空の1行", () => {
      expect(scanRows("\r\n").rows).toEqual([{ start: 0, end: 0, next: 2 }]);
    });
  });
});
