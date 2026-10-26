import { applyRowOpsToText, applyTextEdits, verifyAppliedRows } from "./applyRowOpsToText";
import { DEFAULT_CSV_FORMAT, detectCsvFormat } from "./csvFormat";
import type { CsvFormat } from "./csvFormat";
import type { RowOp } from "./ops";

const BOM = "﻿";

const replaceRows = (start: number, deleteCount: number, rows: string[][] = []): RowOp => ({
  type: "replaceRows",
  start,
  deleteCount,
  rows,
});

/** op を当てた後のテキスト（書式は元テキストから検出する） */
function apply(text: string, ops: RowOp[], format: CsvFormat = detectCsvFormat(text)): string {
  return applyTextEdits(text, applyRowOpsToText(text, ops, format).edits);
}

describe("applyRowOpsToText", () => {
  describe("挿入", () => {
    it("先頭に挿入する", () => {
      expect(apply("a\nb\n", [replaceRows(0, 0, [["x"]])])).toBe("x\na\nb\n");
    });

    it("中間に挿入する", () => {
      expect(apply("a\nb\n", [replaceRows(1, 0, [["x"], ["y"]])])).toBe("a\nx\ny\nb\n");
    });

    it("末尾改行ありのテキストの末尾に挿入すると末尾改行を保つ", () => {
      expect(apply("a\nb\n", [replaceRows(2, 0, [["x"]])])).toBe("a\nb\nx\n");
    });

    it("末尾改行なしのテキストの末尾に挿入すると区切りを補い、末尾改行なしを保つ", () => {
      expect(apply("a\nb", [replaceRows(2, 0, [["x"], ["y"]])])).toBe("a\nb\nx\ny");
    });
  });

  describe("削除", () => {
    it("先頭の行を削除する", () => {
      expect(apply("a\nb\nc", [replaceRows(0, 1)])).toBe("b\nc");
    });

    it("中間の行を削除する", () => {
      expect(apply("a\nb\nc\n", [replaceRows(1, 1)])).toBe("a\nc\n");
    });

    it("末尾改行ありのテキストで末尾の行を削除すると末尾改行を保つ", () => {
      expect(apply("a\nb\nc\n", [replaceRows(1, 2)])).toBe("a\n");
    });

    it("末尾改行なしのテキストで末尾の行を削除すると直前の区切りも消す", () => {
      expect(apply("a\nb\nc", [replaceRows(1, 2)])).toBe("a");
    });
  });

  describe("置換", () => {
    it("中間の行だけを置き換える", () => {
      const result = applyRowOpsToText(
        "a\nb\nc\n",
        [replaceRows(1, 1, [["x", "y"]])],
        DEFAULT_CSV_FORMAT
      );
      expect(result.edits).toEqual([{ start: 2, end: 4, text: "x,y\n" }]);
    });

    it("末尾改行なしのテキストで末尾の行を置き換える", () => {
      expect(apply("a\nb", [replaceRows(1, 1, [["x"]])])).toBe("a\nx");
    });

    it("ヘッダー行（先頭行）も同じ行番号で置き換える", () => {
      expect(apply("h1,h2\n1,2\n", [replaceRows(0, 1, [["x", "y"]])])).toBe("x,y\n1,2\n");
    });

    it("区切り文字・クォート・改行を含むセルはクォートして書き出す", () => {
      expect(apply("a\n", [replaceRows(0, 1, [["a,b", 'q"', "l\nm"]])])).toBe(
        '"a,b","q""","l\nm"\n'
      );
    });

    it("編集していない行は不揃いな列数のまま残す", () => {
      expect(apply("a\nb,c,d\ne\n", [replaceRows(2, 1, [["x"]])])).toBe("a\nb,c,d\nx\n");
    });
  });

  describe("改行コード", () => {
    it("CRLF のテキストでは CRLF で区切る", () => {
      expect(apply("a\r\nb\r\n", [replaceRows(1, 0, [["x"]])])).toBe("a\r\nx\r\nb\r\n");
    });

    it("CRLF・末尾改行なしのテキストの末尾に CRLF を補って挿入する", () => {
      expect(apply("a\r\nb", [replaceRows(2, 0, [["x"]])])).toBe("a\r\nb\r\nx");
    });

    it("CR のみのテキストでは書式の改行コード（LF）ではなく CR で区切る", () => {
      const text = "a\rb";
      const result = applyRowOpsToText(text, [replaceRows(2, 0, [["x"]])], detectCsvFormat(text));
      expect(applyTextEdits(text, result.edits)).toBe("a\rb\rx");
      expect(result.delimiter).toBe("\r");
    });

    it("改行の無いテキストでは書式の改行コードで区切る", () => {
      const format: CsvFormat = { ...DEFAULT_CSV_FORMAT, eol: "\r\n", trailingNewline: false };
      expect(apply("a,b", [replaceRows(1, 0, [["x"]])], format)).toBe("a,b\r\nx");
    });
  });

  describe("BOM", () => {
    it("BOM を保ったまま先頭に挿入する", () => {
      const text = `${BOM}a\nb\n`;
      const { edits } = applyRowOpsToText(
        text,
        [replaceRows(0, 0, [["x"]])],
        detectCsvFormat(text)
      );
      expect(applyTextEdits(text, edits)).toBe(`${BOM}x\na\nb\n`);
      edits.forEach((edit) => expect(edit.start).toBeGreaterThanOrEqual(BOM.length));
    });
  });

  describe("全体置換", () => {
    it("全行を削除すると BOM の後ろをすべて置き換える", () => {
      const text = `${BOM}a\nb\n`;
      const result = applyRowOpsToText(text, [replaceRows(0, 2)], detectCsvFormat(text));
      expect(result.edits).toEqual([{ start: 1, end: text.length, text: "" }]);
      expect(result.rowCount).toBe(0);
    });

    it("全行を置き換えると末尾改行の有無を保つ", () => {
      expect(apply("a\nb\n", [replaceRows(0, 2, [["x"]])])).toBe("x\n");
      expect(apply("a\nb", [replaceRows(0, 2, [["x"]])])).toBe("x");
    });

    it("空ファイルに挿入すると書式の末尾改行（空テキストは既定であり）に従う", () => {
      expect(apply("", [replaceRows(0, 0, [["h"], ["1"]])])).toEqual("h\n1\n");
    });

    it("BOM のみのファイルに挿入すると BOM を保ち、書式の末尾改行（なし）に従う", () => {
      const text = BOM;
      const result = applyRowOpsToText(
        text,
        [replaceRows(0, 0, [["h"], ["1"]])],
        detectCsvFormat(text)
      );
      expect(result.edits).toEqual([{ start: 1, end: 1, text: "h\n1" }]);
    });

    it("空ファイルに何もしなければ置換は無い", () => {
      expect(applyRowOpsToText("", [], DEFAULT_CSV_FORMAT).edits).toEqual([]);
    });
  });

  describe("複数の op の連続適用", () => {
    it("離れた位置への op は重ならない複数の置換になる", () => {
      const text = "a\nb\nc\n";
      // 先頭に挿入した後の行番号 3 は元の行 2（"c"）
      const { edits } = applyRowOpsToText(
        text,
        [replaceRows(0, 0, [["x"]]), replaceRows(3, 1, [["z"]])],
        DEFAULT_CSV_FORMAT
      );
      expect(edits).toEqual([
        { start: 0, end: 0, text: "x\n" },
        { start: 4, end: 6, text: "z\n" },
      ]);
      expect(applyTextEdits(text, edits)).toBe("x\na\nb\nz\n");
    });

    it("前の op で挿入した行と元の行にまたがる op を適用する", () => {
      const ops = [replaceRows(1, 0, [["x"], ["y"]]), replaceRows(2, 2, [["z"]])];
      expect(apply("a\nb\nc\n", ops)).toBe("a\nx\nz\nc\n");
    });

    it("挿入した行を後の op で削除すると置換は無い", () => {
      const ops = [replaceRows(1, 0, [["x"]]), replaceRows(1, 1)];
      expect(applyRowOpsToText("a\nb\n", ops, DEFAULT_CSV_FORMAT).edits).toEqual([]);
    });

    it("適用後の行数と使った区切りを返す", () => {
      const ops = [replaceRows(0, 1), replaceRows(1, 0, [["x"], ["y"]])];
      expect(applyRowOpsToText("a\r\nb\r\n", ops, DEFAULT_CSV_FORMAT)).toMatchObject({
        rowCount: 3,
        delimiter: "\r\n",
      });
    });
  });

  describe("範囲外の op", () => {
    it("開始位置が行数を超えると RangeError を投げる", () => {
      expect(() =>
        applyRowOpsToText("a\n", [replaceRows(2, 0, [["x"]])], DEFAULT_CSV_FORMAT)
      ).toThrow(RangeError);
    });

    it("削除範囲が前の op 適用後の行数を超えると RangeError を投げる", () => {
      const ops = [replaceRows(0, 1), replaceRows(0, 2)];
      expect(() => applyRowOpsToText("a\nb\n", ops, DEFAULT_CSV_FORMAT)).toThrow(RangeError);
    });
  });
});

describe("applyTextEdits", () => {
  it("元テキスト基準の複数の置換を順不同で適用する", () => {
    const edits = [
      { start: 4, end: 5, text: "Z" },
      { start: 0, end: 1, text: "X" },
    ];
    expect(applyTextEdits("a,b,c", edits)).toBe("X,b,Z");
  });

  it("重なる置換は Error を投げる", () => {
    const edits = [
      { start: 0, end: 3, text: "" },
      { start: 2, end: 4, text: "" },
    ];
    expect(() => applyTextEdits("abcdef", edits)).toThrow();
  });
});

describe("verifyAppliedRows", () => {
  it("行数と区切りが期待どおりなら true", () => {
    expect(verifyAppliedRows("a\r\nb\r\n", 2, "\r\n")).toBe(true);
  });

  it("行数が違えば false（末尾改行なしの末尾に空行を足すと行が消える）", () => {
    expect(apply("a\nb", [replaceRows(2, 0, [[""]])])).toBe("a\nb\n");
    expect(verifyAppliedRows("a\nb\n", 3, "\n")).toBe(false);
  });

  it("区切りが変われば false（改行コード混在で最初の改行を消す）", () => {
    // LF 区切りの4行（a / b\r / c\r / d）。先頭行を消すと CRLF 区切りの3行になり、行数は期待どおりでも区切りが変わる
    const newText = apply("a\nb\r\nc\r\nd", [replaceRows(0, 1)]);
    expect(newText).toBe("b\r\nc\r\nd");
    expect(verifyAppliedRows(newText, 3, "\n")).toBe(false);
  });

  it("改行の無いテキストは行数が1以下なら区切りを問わない", () => {
    expect(verifyAppliedRows("a,b", 1, "\r\n")).toBe(true);
    expect(verifyAppliedRows(BOM, 0, "\n")).toBe(true);
  });
});
