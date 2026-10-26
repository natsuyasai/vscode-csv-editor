import { createByteRowScanner, scanRowsBytes } from "./byteRowScanner";

const utf8 = (text: string) => new TextEncoder().encode(text);
const bytes = (...values: number[]) => new Uint8Array(values);

/** チャンクに分けて与え、確定した行の範囲と最終結果を返す */
function scanChunks(chunks: Uint8Array[]) {
  const rows: { start: number; end: number; next: number }[] = [];
  const scanner = createByteRowScanner((start, end, next) => rows.push({ start, end, next }));
  for (const chunk of chunks) {
    scanner.push(chunk);
  }
  return { rows, summary: scanner.finish() };
}

/** 1バイトずつのチャンクに分ける */
const perByte = (data: Uint8Array) => Array.from(data, (value) => bytes(value));

describe("scanRowsBytes", () => {
  describe("行区切りの検出", () => {
    it("最初の改行がLFならLFを行区切りとする", () => {
      expect(scanRowsBytes(utf8("a\nb\r\nc")).delimiter).toBe("\n");
    });

    it("最初の改行がCRLFならCRLFを行区切りとする", () => {
      expect(scanRowsBytes(utf8("a\r\nb\nc")).delimiter).toBe("\r\n");
    });

    it("LFが続かないCRはCRを行区切りとする", () => {
      expect(scanRowsBytes(utf8("a\rb\r\nc")).delimiter).toBe("\r");
    });

    it("クォート内の改行は行区切りの検出に使わない", () => {
      expect(scanRowsBytes(utf8('"a\nb"\r\nc')).delimiter).toBe("\r\n");
    });

    it("改行が無ければ行区切りは null", () => {
      expect(scanRowsBytes(utf8("a,b")).delimiter).toBeNull();
      expect(scanRowsBytes(bytes()).delimiter).toBeNull();
    });
  });

  describe("行の範囲（バイトオフセット）", () => {
    it("行区切りがLFのとき、CRLFのCRは行の内容に含める", () => {
      expect(scanRowsBytes(utf8("x\na\r\nb")).rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 4, next: 5 },
        { start: 5, end: 6, next: 6 },
      ]);
    });

    it("行区切りがCRLFのとき、単独のCRは行の内容に含める", () => {
      expect(scanRowsBytes(utf8("x\r\na\r\r\nb")).rows).toEqual([
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 5, next: 7 },
        { start: 7, end: 8, next: 8 },
      ]);
    });

    it("行区切りがCRのとき、CRの直後のLFは次の行の内容になる", () => {
      expect(scanRowsBytes(utf8("a\rb\r\n")).rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 3, next: 4 },
        { start: 4, end: 5, next: 5 },
      ]);
    });

    it("多バイト文字はバイト数で数える", () => {
      // "あ" は UTF-8 で3バイト
      expect(scanRowsBytes(utf8("あ\nい")).rows).toEqual([
        { start: 0, end: 3, next: 4 },
        { start: 4, end: 7, next: 7 },
      ]);
    });

    it("2バイト目が 0x5C の Shift_JIS の文字も行を分けない", () => {
      // "ソ,表\n能" = 83 5C 2C 95 5C 0A 94 5C
      expect(scanRowsBytes(bytes(0x83, 0x5c, 0x2c, 0x95, 0x5c, 0x0a, 0x94, 0x5c)).rows).toEqual([
        { start: 0, end: 5, next: 6 },
        { start: 6, end: 8, next: 8 },
      ]);
    });
  });

  describe("BOM を飛ばさない（skipBom: false。Shift_JIS / EUC-JP 用）", () => {
    /** skipBom: false で走査し、確定した行の範囲と最終結果を返す */
    function scanKeepingBom(chunks: Uint8Array[]) {
      const rows: { start: number; end: number; next: number }[] = [];
      const scanner = createByteRowScanner((start, end, next) => rows.push({ start, end, next }), {
        skipBom: false,
      });
      for (const chunk of chunks) {
        scanner.push(chunk);
      }
      return { rows, summary: scanner.finish() };
    }

    it("先頭の EF BB BF を最初の行の内容として扱う", () => {
      const { rows, summary } = scanKeepingBom([bytes(0xef, 0xbb, 0xbf, 0x61, 0x0a, 0x62)]);
      expect(summary.contentStart).toBe(0);
      expect(rows).toEqual([
        { start: 0, end: 4, next: 5 },
        { start: 5, end: 6, next: 6 },
      ]);
    });

    it("EF BB BF だけでも1行と数える", () => {
      const { rows, summary } = scanKeepingBom([bytes(0xef, 0xbb, 0xbf)]);
      expect(summary).toEqual({ delimiter: null, contentStart: 0, byteLength: 3 });
      expect(rows).toEqual([{ start: 0, end: 3, next: 3 }]);
    });

    it("1バイトずつ与えても先頭の EF BB BF を行に含める", () => {
      const data = bytes(0xef, 0xbb, 0xbf, 0x61, 0x0a, 0x62);
      expect(scanKeepingBom(perByte(data))).toEqual(scanKeepingBom([data]));
    });

    it("skipBom を省略すると BOM を飛ばす（既定は true）", () => {
      const rows: number[] = [];
      const scanner = createByteRowScanner((start) => rows.push(start), {});
      scanner.push(bytes(0xef, 0xbb, 0xbf, 0x61));
      expect(scanner.finish().contentStart).toBe(3);
      expect(rows).toEqual([3]);
    });
  });

  describe("BOM", () => {
    it("UTF-8 の BOM（EF BB BF）は最初の行に含めない", () => {
      const result = scanRowsBytes(bytes(0xef, 0xbb, 0xbf, 0x61, 0x0a, 0x62));
      expect(result.rows[0]).toEqual({ start: 3, end: 4, next: 5 });
    });

    it("BOMのみは0行", () => {
      expect(scanRowsBytes(bytes(0xef, 0xbb, 0xbf)).rows).toEqual([]);
    });

    it("BOMの途中までしか一致しない先頭は内容として扱う", () => {
      expect(scanRowsBytes(bytes(0xef, 0xbb, 0x61)).rows).toEqual([{ start: 0, end: 3, next: 3 }]);
    });

    it("先頭以外の EF BB BF は内容として扱う", () => {
      expect(scanRowsBytes(bytes(0x61, 0x0a, 0xef, 0xbb, 0xbf)).rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 5, next: 5 },
      ]);
    });
  });

  describe("クォート", () => {
    it("クォート内の区切りの改行は行を分けない", () => {
      expect(scanRowsBytes(utf8('"a\r\nb",c\r\nd')).rows.map((row) => row.start)).toEqual([0, 10]);
    });

    it('クォート内の `""` はクォートを閉じない', () => {
      expect(scanRowsBytes(utf8('"a""\nb"\nc')).rows.map((row) => row.start)).toEqual([0, 8]);
    });

    it("閉じていないクォートは例外を投げず末尾までを1行とする", () => {
      expect(scanRowsBytes(utf8('a\n"b\nc')).rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 6, next: 6 },
      ]);
    });
  });

  describe("空行と末尾", () => {
    it("連続する改行の間の空行も1行と数える", () => {
      expect(scanRowsBytes(utf8("a\r\n\r\nb\r\n")).rows.map((row) => row.start)).toEqual([0, 3, 5]);
    });

    it("改行のみは空の1行", () => {
      expect(scanRowsBytes(utf8("\r\n")).rows).toEqual([{ start: 0, end: 0, next: 2 }]);
    });

    it("空のバイト列は0行", () => {
      expect(scanRowsBytes(bytes()).rows).toEqual([]);
    });
  });
});

describe("createByteRowScanner", () => {
  describe("チャンク境界", () => {
    it("行区切りが未定のまま CR と LF の間で切れても CRLF と判定する", () => {
      const { rows, summary } = scanChunks([utf8("a\r"), utf8("\nb")]);
      expect(summary.delimiter).toBe("\r\n");
      expect(rows).toEqual([
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 4, next: 4 },
      ]);
    });

    it("行区切りが未定のまま CR で切れて次が LF でなければ CR と判定する", () => {
      const { rows, summary } = scanChunks([utf8("a\r"), utf8("b")]);
      expect(summary.delimiter).toBe("\r");
      expect(rows).toEqual([
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 3, next: 3 },
      ]);
    });

    it("最後のチャンクが CR で終わり行区切りが未定なら finish で CR と確定する", () => {
      const { rows, summary } = scanChunks([utf8("a\r")]);
      expect(summary.delimiter).toBe("\r");
      expect(rows).toEqual([{ start: 0, end: 1, next: 2 }]);
    });

    it("行区切りが CRLF のとき CR と LF の間で切れても1つの行区切りになる", () => {
      const { rows } = scanChunks([utf8("a\r\nb\r"), utf8("\nc")]);
      expect(rows).toEqual([
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 4, next: 6 },
        { start: 6, end: 7, next: 7 },
      ]);
    });

    it("行区切りが CRLF のときチャンク末尾の CR の次が LF でなければ CR は内容になる", () => {
      const { rows } = scanChunks([utf8("a\r\nb\r"), utf8("c")]);
      expect(rows).toEqual([
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 6, next: 6 },
      ]);
    });

    it("行区切りが CRLF のとき最後の CR は finish で内容として最終行に含める", () => {
      const { rows } = scanChunks([utf8("a\r\nb\r")]);
      expect(rows).toEqual([
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 5, next: 5 },
      ]);
    });

    it("空のチャンクはチャンク末尾の CR の判定を変えない", () => {
      const { rows, summary } = scanChunks([utf8("a\r"), bytes(), utf8("\nb")]);
      expect(summary.delimiter).toBe("\r\n");
      expect(rows.map((row) => row.start)).toEqual([0, 3]);
    });

    it("クォートがチャンクをまたいでもクォート内の改行は行を分けない", () => {
      const { rows } = scanChunks([utf8('"a\n'), utf8('b"\nc')]);
      expect(rows.map((row) => row.start)).toEqual([0, 6]);
    });

    it("BOM が1バイトずつに分かれても最初の行に含めない", () => {
      const { rows, summary } = scanChunks(perByte(bytes(0xef, 0xbb, 0xbf, 0x61, 0x0a, 0x62)));
      expect(summary.contentStart).toBe(3);
      expect(rows).toEqual([
        { start: 3, end: 4, next: 5 },
        { start: 5, end: 6, next: 6 },
      ]);
    });

    it("3バイトに満たないデータでも finish で行を確定する", () => {
      const { rows, summary } = scanChunks([bytes(0x61), bytes(0x0a)]);
      expect(summary.contentStart).toBe(0);
      expect(rows).toEqual([{ start: 0, end: 1, next: 2 }]);
    });

    it("1バイトずつ与えても一括と同じ結果になる", () => {
      const data = utf8('﻿h1,"h\r\n2"\r\nあ,"""い"""\r\r\n\r\nz');
      expect(scanChunks(perByte(data)).rows).toEqual(scanRowsBytes(data).rows);
    });
  });

  describe("最終結果", () => {
    it("走査したバイト数の合計と BOM を除いた開始位置を返す", () => {
      expect(scanChunks([utf8("﻿ab"), utf8("\ncd")]).summary).toEqual({
        delimiter: "\n",
        contentStart: 3,
        byteLength: 8,
      });
    });

    it("行は確定した時点でコールバックに渡す", () => {
      const starts: number[] = [];
      const scanner = createByteRowScanner((start) => starts.push(start));
      scanner.push(utf8("a\nb\nc"));
      // 最終行 "c" は続きがあり得るのでまだ確定しない
      expect(starts).toEqual([0, 2]);
      scanner.finish();
      expect(starts).toEqual([0, 2, 4]);
    });

    it("finish の後の push は例外を投げる", () => {
      const scanner = createByteRowScanner(() => {});
      scanner.finish();
      expect(() => scanner.push(utf8("a"))).toThrow();
    });
  });

  describe("性能", () => {
    it("改行が無くクォートの多い長い行も線形時間で走査する", () => {
      // 4MB の 1 行。クォートの位置を毎回末尾まで探し直すと二乗時間になる
      const data = utf8('"a",'.repeat(1024 * 1024));
      const begin = performance.now();
      const { rows } = scanChunks([data.subarray(0, 2_000_001), data.subarray(2_000_001)]);
      expect(performance.now() - begin).toBeLessThan(2000);
      expect(rows).toEqual([{ start: 0, end: data.length, next: data.length }]);
    });
  });
});
