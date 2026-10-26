import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";

import { MAX_ROWS_PER_REQUEST } from "../message/largeMessages";
import { FileRowReader } from "../large/fileRowReader";
import { skipsBom, type LargeEncoding } from "../large/largeEncoding";
import { RowIndex } from "../large/rowIndex";

/**
 * Shift_JIS のバイト列（Node の TextDecoder で確認済み）
 * 日本 = 93 FA 96 7B / 表 = 95 5C / ソ = 83 5C（2バイト目が 0x5C）/ ｱ = B1（半角カナ）
 */
const SJIS = {
  nihon: [0x93, 0xfa, 0x96, 0x7b],
  hyo: [0x95, 0x5c],
  so: [0x83, 0x5c],
  kanaA: [0xb1],
};

/** EUC-JP のバイト列（同上）。日本 = C6 FC CB DC / 表 = C9 BD / ソ = A5 BD / ｱ = 8E B1 */
const EUC = {
  nihon: [0xc6, 0xfc, 0xcb, 0xdc],
  hyo: [0xc9, 0xbd],
  so: [0xa5, 0xbd],
  kanaA: [0x8e, 0xb1],
};

/** ASCII の文字列はそのまま、数値配列はバイトとして連結する */
const bytesOf = (...parts: (string | number[])[]): Buffer =>
  Buffer.concat(
    parts.map((part) =>
      typeof part === "string" ? Buffer.from(part, "latin1") : Buffer.from(part)
    )
  );

/** 大容量モードのファイル範囲読み取り。vscode API には依存しない */
suite("FileRowReader（行範囲の読み取りとデコード）", () => {
  let tempDir: string;
  const readers: FileRowReader[] = [];

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-large-reader-"));
  });

  teardown(async () => {
    await Promise.all(readers.splice(0).map((reader) => reader.close()));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** ファイルを書いてインデックスを作り終え、リーダーを開く */
  const prepare = async (
    data: Uint8Array | string,
    encoding: LargeEncoding,
    fieldDelimiter?: string
  ) => {
    const filePath = path.join(tempDir, `data-${String(readers.length)}.csv`);
    fs.writeFileSync(filePath, data);
    const index = RowIndex.build(filePath, { skipBom: skipsBom(encoding) });
    await index.done;
    const reader = await FileRowReader.open(filePath, { encoding, fieldDelimiter });
    readers.push(reader);
    return { index, reader };
  };

  suite("文字コード", () => {
    test("UTF-8 の LF 区切りを行ごとにパースする", async () => {
      const { index, reader } = await prepare("名前,値\nあ,1\nい,2\n", "utf-8");
      const result = await reader.readRows(index, 0, 3);
      assert.deepStrictEqual(result, {
        start: 0,
        rows: [
          ["名前", "値"],
          ["あ", "1"],
          ["い", "2"],
        ],
        invalidRows: [],
      });
    });

    test("UTF-8(BOM) では BOM をセルに含めない", async () => {
      const data = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from("h1,h2\r\nv1,v2\r\n"),
      ]);
      const { index, reader } = await prepare(data, "utf-8-bom");
      const { rows } = await reader.readRows(index, 0, 2);
      assert.deepStrictEqual(rows, [
        ["h1", "h2"],
        ["v1", "v2"],
      ]);
    });

    test("行頭以外の U+FEFF はセルの内容として残す", async () => {
      const { index, reader } = await prepare("a\n﻿b\n", "utf-8");
      const { rows } = await reader.readRows(index, 1, 1);
      assert.deepStrictEqual(rows, [["﻿b"]]);
    });

    test("Shift_JIS（2バイト目が 0x5C の字・半角カナ・CRLF・クォート内改行）をデコードする", async () => {
      const data = bytesOf(
        SJIS.nihon,
        ",",
        SJIS.hyo,
        "\r\n",
        '"',
        SJIS.so,
        "\r\n",
        SJIS.kanaA,
        '",x\r\n',
        SJIS.hyo,
        ","
      );
      const { index, reader } = await prepare(data, "shift_jis");
      const { rows } = await reader.readRows(index, 0, 3);
      assert.deepStrictEqual(rows, [
        ["日本", "表"],
        ["ソ\r\nｱ", "x"],
        ["表", ""],
      ]);
    });

    test("EUC-JP（半角カナの 8E xx・LF・末尾改行なし）をデコードする", async () => {
      const data = bytesOf(EUC.nihon, ",", EUC.hyo, "\n", EUC.so, ",", EUC.kanaA);
      const { index, reader } = await prepare(data, "euc-jp");
      const { rows } = await reader.readRows(index, 0, 2);
      assert.deepStrictEqual(rows, [
        ["日本", "表"],
        ["ソ", "ｱ"],
      ]);
    });

    test("Shift_JIS では先頭の EF BB BF を BOM として捨てない", async () => {
      // EF BB BF は Shift_JIS では BOM ではない。捨てずにデコードした結果がセルに入る
      const data = bytesOf([0xef, 0xbb, 0xbf], ",a\n");
      const { index, reader } = await prepare(data, "shift_jis");
      const { rows } = await reader.readRows(index, 0, 1);
      assert.strictEqual(rows[0].length, 2);
      assert.notStrictEqual(rows[0][0], "");
      assert.strictEqual(rows[0][1], "a");
    });
  });

  suite("行区切りと範囲", () => {
    test("CR 区切りのファイルも CR をセルに含めずにパースする", async () => {
      const { index, reader } = await prepare("a,b\rc,d\r", "utf-8");
      const { rows, invalidRows } = await reader.readRows(index, 0, 2);
      assert.deepStrictEqual(rows, [
        ["a", "b"],
        ["c", "d"],
      ]);
      assert.deepStrictEqual(invalidRows, []);
    });

    test("途中の位置から指定した行数だけ読む", async () => {
      const text =
        Array.from({ length: 50 }, (_, i) => `r${String(i)},"q\n${String(i)}"`).join("\n") + "\n";
      const { index, reader } = await prepare(text, "utf-8");
      const { start, rows } = await reader.readRows(index, 20, 3);
      assert.strictEqual(start, 20);
      assert.deepStrictEqual(rows, [
        ["r20", "q\n20"],
        ["r21", "q\n21"],
        ["r22", "q\n22"],
      ]);
    });

    test("確定済みの行数を超える分は切り詰めて返す", async () => {
      const { index, reader } = await prepare("a\nb\nc", "utf-8");
      const result = await reader.readRows(index, 1, 10);
      assert.deepStrictEqual(result.rows, [["b"], ["c"]]);
      assert.deepStrictEqual((await reader.readRows(index, 3, 5)).rows, []);
    });

    test("区切り文字を指定できる", async () => {
      const { index, reader } = await prepare("a\tb\n", "utf-8", "\t");
      assert.deepStrictEqual((await reader.readRows(index, 0, 1)).rows, [["a", "b"]]);
    });

    test("空行は空セル1個になる", async () => {
      const { index, reader } = await prepare("a\n\nb\n", "utf-8");
      assert.deepStrictEqual((await reader.readRows(index, 0, 3)).rows, [["a"], [""], ["b"]]);
    });

    test("1回の要求の上限（MAX_ROWS_PER_REQUEST）を超える行数や負の位置は RangeError", async () => {
      const { index, reader } = await prepare("a\n", "utf-8");
      await assert.rejects(reader.readRows(index, 0, MAX_ROWS_PER_REQUEST + 1), RangeError);
      await assert.rejects(reader.readRows(index, -1, 1), RangeError);
    });

    test("上限ちょうどの行数を1回の読み取りで返す", async () => {
      const text = Array.from(
        { length: MAX_ROWS_PER_REQUEST + 10 },
        (_, i) => `${String(i)},v`
      ).join("\r\n");
      const { index, reader } = await prepare(text, "utf-8");
      const { rows } = await reader.readRows(index, 10, MAX_ROWS_PER_REQUEST);
      assert.strictEqual(rows.length, MAX_ROWS_PER_REQUEST);
      assert.deepStrictEqual(rows[0], ["10", "v"]);
      assert.deepStrictEqual(rows[MAX_ROWS_PER_REQUEST - 1], [
        String(MAX_ROWS_PER_REQUEST + 9),
        "v",
      ]);
    });
  });

  suite("パースできない行", () => {
    test("パースできない行は生テキストを1セルに入れ、invalidRows に行番号を入れる（表示を止めない）", async () => {
      // "a"b は閉じクォートの後に文字がある。"open はクォートが閉じないまま末尾まで続く
      const { index, reader } = await prepare('ok,1\n"a"b,2\nok,3\n"open\nx', "utf-8");
      const result = await reader.readRows(index, 0, 10);
      assert.deepStrictEqual(result.rows, [["ok", "1"], ['"a"b,2'], ["ok", "3"], ['"open\nx']]);
      assert.deepStrictEqual(result.invalidRows, [1, 3]);
    });
  });

  suite("作成中のインデックス", () => {
    test("インデックスの作成が終わる前に先頭行を読める", async () => {
      const filePath = path.join(tempDir, "building.csv");
      fs.writeFileSync(filePath, "h1,h2\n" + "v1,v2\n".repeat(2000));
      const index = RowIndex.build(filePath, { skipBom: true, highWaterMark: 32 });
      const reader = await FileRowReader.open(filePath, { encoding: "utf-8" });
      readers.push(reader);
      await index.firstRow;
      assert.strictEqual(index.completed, false);
      const { rows } = await reader.readRows(index, 0, 1);
      assert.deepStrictEqual(rows, [["h1", "h2"]]);
      await index.done;
    });
  });

  suite("ファイルハンドル", () => {
    test("close の後の読み取りは reject され、close は何度呼んでもよい", async () => {
      const { index, reader } = await prepare("a\n", "utf-8");
      await reader.close();
      await reader.close();
      await assert.rejects(reader.readRows(index, 0, 1));
    });
  });
});
