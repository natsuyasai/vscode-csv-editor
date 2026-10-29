/* global AbortController, process */
import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import { TextDecoder } from "util";

import { MAX_ROWS_PER_REQUEST } from "../message/largeMessages";
import { FileRowReader } from "../large/fileRowReader";
import {
  writeLargeCsv,
  type WriteLargeCsvOptions,
  type WriteSegment,
} from "../large/largeCsvWriter";
import { skipsBom, type LargeEncoding } from "../large/largeEncoding";
import { encodeText } from "../large/largeTextEncoder";
import { RowIndex, type RowIndexSummary } from "../large/rowIndex";
import type { RecordDelimiter } from "../shared/csv/rowScanner";
import type { RowSegment } from "../shared/large/rowStore";

/** RowStore.segments() の区間をそのまま渡せること（型の互換性をコンパイル時に確かめる） */
const _rowStoreSegmentsAreWritable: Iterable<WriteSegment> = [] as RowSegment[];

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex").toUpperCase();

interface Opened {
  filePath: string;
  encoding: LargeEncoding;
  index: RowIndex;
  summary: RowIndexSummary;
}

/** 元ファイル全体を1つの区間で書き出す（未編集） */
const all = (opened: Opened): WriteSegment[] =>
  opened.summary.rowCount === 0
    ? []
    : [{ kind: "original", start: 0, end: opened.summary.rowCount }];
const original = (start: number, end: number): WriteSegment => ({
  kind: "original",
  start,
  end,
});
const row = (...cells: string[]): WriteSegment => ({ kind: "row", row: cells });

/**
 * 大容量モードの保存処理。
 * 元の行は元ファイルのバイト列をそのままコピーし、編集・追加した行だけをエンコードして、
 * 一時ファイルに書いてから元ファイルを置き換える。
 */
suite("LargeCsvWriter（大容量CSVの保存）", () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-large-writer-"));
  });

  teardown(() => {
    for (const name of fs.readdirSync(tempDir)) {
      // 読み取り専用にしたファイルも消せるように戻す
      fs.chmodSync(path.join(tempDir, name), 0o666);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writeFile = (name: string, data: Uint8Array | string): string => {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, data);
    return filePath;
  };

  const open = async (filePath: string, encoding: LargeEncoding): Promise<Opened> => {
    const index = RowIndex.build(filePath, { skipBom: skipsBom(encoding) });
    const summary = await index.done;
    return { filePath, encoding, index, summary };
  };

  const openText = async (name: string, data: Uint8Array | string, encoding: LargeEncoding) =>
    open(writeFile(name, data), encoding);

  const save = (
    opened: Opened,
    segments: WriteLargeCsvOptions["segments"],
    options: Partial<WriteLargeCsvOptions> = {}
  ) =>
    writeLargeCsv({
      sourcePath: opened.filePath,
      targetPath: opened.filePath,
      index: opened.index,
      summary: opened.summary,
      segments,
      encoding: opened.encoding,
      renameRetry: { attempts: 3, delayMs: 1 },
      ...options,
    });

  /** 書き出したファイルを読み直した結果（行インデックスを作り直し、全行をパースする） */
  const reread = async (filePath: string, encoding: LargeEncoding) => {
    const opened = await open(filePath, encoding);
    const reader = await FileRowReader.open(filePath, { encoding });
    try {
      const rows: string[][] = [];
      for (let start = 0; start < opened.index.rowCount; start += MAX_ROWS_PER_REQUEST) {
        rows.push(...(await reader.readRows(opened.index, start, MAX_ROWS_PER_REQUEST)).rows);
      }
      const ranges = Array.from({ length: opened.index.rowCount }, (_, i) =>
        opened.index.getRowRange(i)
      );
      return { rows, ranges, summary: opened.summary };
    } finally {
      await reader.close();
    }
  };

  /** 書き出しが返したオフセット表が、書き出したファイルの行インデックスを作り直した結果と一致すること */
  const assertOffsetsMatch = async (
    filePath: string,
    encoding: LargeEncoding,
    result: Awaited<ReturnType<typeof writeLargeCsv>>
  ) => {
    const expected = await reread(filePath, encoding);
    const index = RowIndex.fromOffsets(result.starts, result.summary);
    const ranges = Array.from({ length: index.rowCount }, (_, i) => index.getRowRange(i));
    assert.deepStrictEqual(result.summary, expected.summary, "要約");
    assert.deepStrictEqual(ranges, expected.ranges, "行の範囲");
    return expected;
  };

  const listDir = () => fs.readdirSync(tempDir).sort();

  suite("未編集のまま保存するとバイト列が完全に一致する", () => {
    const sjis = (text: string) => encodeText(text, "shift_jis");
    const sjisBytes = (hexText: string) => Buffer.from(hexText, "hex");
    const cases: [string, Uint8Array | string, LargeEncoding][] = [
      ["UTF-8・LF・末尾改行あり", "h1,h2\na,b\nc,d\n", "utf-8"],
      ["UTF-8(BOM)・CRLF", "﻿h1,h2\r\nあ,い\r\n", "utf-8-bom"],
      ["UTF-8 として開いた BOM 付きファイル", "﻿h\r\nx\r\n", "utf-8"],
      ["CR 区切り・末尾改行なし", "h\ra\rb", "utf-8"],
      ["クォート内の改行と空行", 'h,x\n"a\nb","c""d"\n\n\nlast,"q\r\n"\n', "utf-8"],
      ["1行だけ・改行なし", "only,row", "utf-8"],
      ["空ファイル", "", "utf-8"],
      ["BOM だけ", "﻿", "utf-8-bom"],
      [
        // 﨑(ED95)・≒(8790)・Ⅰ(FA4A)・ユーザー定義文字(F040)・表(955C) は再エンコードすると別のバイト列になりうる
        "Shift_JIS・CRLF・重複定義の文字とユーザー定義文字",
        Buffer.concat([
          sjis("見出し,列\r\n"),
          sjisBytes("ED952C87902C"),
          sjisBytes("FA4A2CF0402C955C"),
          sjis("\r\nｱｲｳ,～\r\n"),
        ]),
        "shift_jis",
      ],
      [
        // ～ は 2バイト（A1C1）と JIS X 0212（8FA2B7）の両方がある
        "EUC-JP・LF・同じ文字の2バイトと3バイト",
        Buffer.concat([
          encodeText("見出し\n", "euc-jp"),
          Buffer.from("A1C12C8FA2B72CADE20A", "hex"),
        ]),
        "euc-jp",
      ],
    ];
    for (const [name, data, encoding] of cases) {
      test(name, async () => {
        const opened = await openText("src.csv", data, encoding);
        const before = fs.readFileSync(opened.filePath);

        const result = await save(opened, all(opened));

        assert.strictEqual(hex(fs.readFileSync(opened.filePath)), hex(before));
        await assertOffsetsMatch(opened.filePath, encoding, result);
        assert.deepStrictEqual(listDir(), ["src.csv"], "一時ファイルが残らない");
      });
    }

    test("小さなチャンクに分けてコピーしても一致する", async () => {
      const data = 'h,x\r\n"a\r\nb",c\r\n' + "0123456789,abcdefghij\r\n".repeat(50);
      const opened = await openText("src.csv", data, "utf-8");
      await save(opened, all(opened), { chunkSize: 7 });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), data);
    });

    test("区間を細かく分けても一致する", async () => {
      const data = "h\na\nb\nc\nd";
      const opened = await openText("src.csv", data, "utf-8");
      await save(opened, [original(0, 1), original(1, 3), original(3, 4), original(4, 5)]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), data);
    });
  });

  suite("編集した行だけが変わる", () => {
    test("1行編集すると、その行だけが変わり他の行のバイト列は変わらない", async () => {
      const sjis = (text: string) => encodeText(text, "shift_jis");
      const head = Buffer.concat([sjis("見出し,列\r\n"), Buffer.from("ED952C8790", "hex")]);
      const tail = Buffer.concat([sjis("\r\n"), Buffer.from("FA4A2C955C0D0A", "hex")]);
      const opened = await openText(
        "src.csv",
        Buffer.concat([head, sjis("\r\n古い,値"), tail]),
        "shift_jis"
      );

      const result = await save(opened, [original(0, 2), row("新しい", "値,表"), original(3, 4)]);

      const expected = Buffer.concat([head, sjis('\r\n新しい,"値,表"'), tail]);
      assert.strictEqual(hex(fs.readFileSync(opened.filePath)), hex(expected));
      const reread = await assertOffsetsMatch(opened.filePath, "shift_jis", result);
      assert.deepStrictEqual(reread.rows[2], ["新しい", "値,表"]);
    });

    test("編集した行に含まれる、編集していないセルのユーザー定義文字は元のバイト列のまま", async () => {
      const opened = await openText(
        "src.csv",
        Buffer.from("682C690D0AF0402C410D0A", "hex"),
        "shift_jis"
      );
      const decoded = new TextDecoder("shift_jis").decode(Buffer.from("F040", "hex"));
      await save(opened, [original(0, 1), row(decoded, "B")]);
      assert.strictEqual(hex(fs.readFileSync(opened.filePath)), "682C690D0AF0402C420D0A");
    });

    test("ヘッダーを編集できる", async () => {
      const opened = await openText("src.csv", "﻿a,b\r\n1,2\r\n", "utf-8-bom");
      const result = await save(opened, [row("x", "y"), original(1, 2)]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "﻿x,y\r\n1,2\r\n");
      await assertOffsetsMatch(opened.filePath, "utf-8-bom", result);
    });

    test("改行やクォートを含むセルはクォートして書き出し、区切り文字を指定できる", async () => {
      const opened = await openText("src.tsv", "a\tb\n", "utf-8");
      const result = await save(opened, [original(0, 1), row("x\ny", 'q"', "c,d")], {
        fieldDelimiter: "\t",
      });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), 'a\tb\n"x\ny"\t"q"""\tc,d\n');
      assert.strictEqual(result.summary.rowCount, 2);
    });
  });

  suite("行の挿入・削除", () => {
    const data = "h\nr1\nr2\nr3\n";

    for (const [name, segments, expected] of [
      ["先頭に挿入", [row("n"), original(0, 4)], "n\nh\nr1\nr2\nr3\n"],
      ["途中に挿入", [original(0, 2), row("n"), original(2, 4)], "h\nr1\nn\nr2\nr3\n"],
      ["末尾に追加", [original(0, 4), row("n"), row("m")], "h\nr1\nr2\nr3\nn\nm\n"],
      ["途中を削除", [original(0, 1), original(3, 4)], "h\nr3\n"],
      ["末尾を削除", [original(0, 2)], "h\nr1\n"],
      ["先頭を削除", [original(1, 4)], "r1\nr2\nr3\n"],
      ["並びを入れ替える", [original(2, 4), original(0, 2)], "r2\nr3\nh\nr1\n"],
    ] as [string, WriteSegment[], string][]) {
      test(name, async () => {
        const opened = await openText("src.csv", data, "utf-8");
        const result = await save(opened, segments);
        assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), expected);
        await assertOffsetsMatch(opened.filePath, "utf-8", result);
      });
    }

    test("末尾改行なしのファイルで最終行を削除すると、末尾改行なしのまま終わる", async () => {
      const opened = await openText("src.csv", "h\r\na\r\nb", "utf-8");
      const result = await save(opened, [original(0, 2)]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\r\na");
      await assertOffsetsMatch(opened.filePath, "utf-8", result);
    });

    test("末尾改行なしのファイルで最後に追加した行の後にも改行を付けない", async () => {
      const opened = await openText("src.csv", "h\r\na", "utf-8");
      const result = await save(opened, [original(0, 2), row("b")]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\r\na\r\nb");
      await assertOffsetsMatch(opened.filePath, "utf-8", result);
    });

    test("末尾改行なしで最終行が空行になるときは、行が消えないよう末尾に改行を付ける", async () => {
      const opened = await openText("src.csv", "h\na\n\nb", "utf-8");
      const result = await save(opened, [original(0, 3)]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\na\n\n");
      const reread = await assertOffsetsMatch(opened.filePath, "utf-8", result);
      assert.deepStrictEqual(reread.rows, [["h"], ["a"], [""]]);

      const appended = await save(await open(opened.filePath, "utf-8"), [original(0, 1), row("")]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\n\n");
      await assertOffsetsMatch(opened.filePath, "utf-8", appended);
    });

    test("行区切りが無いファイル（1行）に行を足すと、既定の改行（LF）を使う", async () => {
      const opened = await openText("src.csv", "h", "utf-8");
      const result = await save(opened, [original(0, 1), row("a")]);
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\na");
      await assertOffsetsMatch(opened.filePath, "utf-8", result);
    });

    test("行区切りが無いファイルの既定の改行を指定できる", async () => {
      const opened = await openText("src.csv", "", "utf-8");
      const result = await save(opened, [row("h"), row("a")], { defaultEol: "\r\n" });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\r\na");
      await assertOffsetsMatch(opened.filePath, "utf-8", result);
    });

    test("行区切りがあるファイルでは既定の改行の指定より元の行区切りを使う", async () => {
      const opened = await openText("src.csv", "h\ra\r", "utf-8");
      await save(opened, [original(0, 2), row("b")], { defaultEol: "\r\n" });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\ra\rb\r");
    });

    test("全行を削除すると空のファイルになる（BOM は残す）", async () => {
      const plain = await openText("plain.csv", "h\na\n", "utf-8");
      const result = await save(plain, []);
      assert.strictEqual(fs.readFileSync(plain.filePath).length, 0);
      await assertOffsetsMatch(plain.filePath, "utf-8", result);

      const bom = await openText("bom.csv", "﻿h\na\n", "utf-8-bom");
      const bomResult = await save(bom, []);
      assert.strictEqual(hex(fs.readFileSync(bom.filePath)), "EFBBBF");
      await assertOffsetsMatch(bom.filePath, "utf-8-bom", bomResult);
    });

    test("UTF-8(BOM) で BOM の無いファイルを保存すると BOM を付ける", async () => {
      const opened = await openText("src.csv", "h\na\n", "utf-8-bom");
      const result = await save(opened, all(opened));
      assert.strictEqual(hex(fs.readFileSync(opened.filePath)), "EFBBBF680A610A");
      await assertOffsetsMatch(opened.filePath, "utf-8-bom", result);
    });
  });

  suite("書き出し先と進捗", () => {
    test("別のパスへ保存（saveAs）すると元ファイルは変わらない", async () => {
      const opened = await openText("src.csv", "h\na\n", "utf-8");
      const target = path.join(tempDir, "out.csv");
      const result = await save(opened, [original(0, 2), row("b")], { targetPath: target });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\na\n");
      assert.strictEqual(fs.readFileSync(target, "utf8"), "h\na\nb\n");
      await assertOffsetsMatch(target, "utf-8", result);
      assert.deepStrictEqual(listDir(), ["out.csv", "src.csv"]);
    });

    test("別のパスへの保存で既存のファイルを上書きできる", async () => {
      const opened = await openText("src.csv", "h\na\n", "utf-8");
      const target = writeFile("out.csv", "old content");
      await save(opened, all(opened), { targetPath: target });
      assert.strictEqual(fs.readFileSync(target, "utf8"), "h\na\n");
    });

    test("非同期の区間列も受け付ける", async () => {
      const opened = await openText("src.csv", "h\na\n", "utf-8");
      async function* segments(): AsyncGenerator<WriteSegment> {
        yield original(0, 1);
        await Promise.resolve();
        yield row("x");
      }
      await save(opened, segments());
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\nx\n");
    });

    test("進捗は書いたバイト数が増えていき、最後はファイルサイズと書いた行数になる", async () => {
      const data = "h\n" + "0123456789\n".repeat(100);
      const opened = await openText("src.csv", data, "utf-8");
      const progress: { rowsWritten: number; bytesWritten: number }[] = [];
      await save(opened, [original(0, 101), row("end")], {
        chunkSize: 64,
        onProgress: (p) => progress.push({ ...p }),
      });
      assert.ok(progress.length >= 2, `進捗の回数: ${String(progress.length)}`);
      for (let i = 1; i < progress.length; i++) {
        assert.ok(progress[i].bytesWritten >= progress[i - 1].bytesWritten);
      }
      assert.deepStrictEqual(progress[progress.length - 1], {
        rowsWritten: 102,
        bytesWritten: data.length + 4,
      });
    });
  });

  suite("失敗しても元ファイルは壊れず、一時ファイルも残らない", () => {
    const data = "h\na\nb\n";

    const assertIntact = (filePath: string) => {
      assert.strictEqual(fs.readFileSync(filePath, "utf8"), data);
      assert.deepStrictEqual(listDir(), [path.basename(filePath)]);
    };

    test("区間列の途中で例外が起きる", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      function* segments(): Generator<WriteSegment> {
        yield original(0, 2);
        yield row("x");
        throw new Error("途中で失敗");
      }
      await assert.rejects(save(opened, segments()), /途中で失敗/);
      assertIntact(opened.filePath);
    });

    test("中断すると AbortError になる（開始前・書き出し中）", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      const before = new AbortController();
      before.abort();
      await assert.rejects(save(opened, all(opened), { signal: before.signal }), {
        name: "AbortError",
      });
      assertIntact(opened.filePath);

      const during = new AbortController();
      async function* segments(): AsyncGenerator<WriteSegment> {
        yield original(0, 1);
        during.abort();
        await Promise.resolve();
        yield original(1, 3);
      }
      await assert.rejects(save(opened, segments(), { signal: during.signal }), {
        name: "AbortError",
      });
      assertIntact(opened.filePath);
    });

    test("行インデックスの範囲外の区間は RangeError になる", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      await assert.rejects(save(opened, [original(0, 4)]), RangeError);
      await assert.rejects(save(opened, [original(2, 1)]), RangeError);
      await assert.rejects(save(opened, [original(-1, 1)]), RangeError);
      assertIntact(opened.filePath);
    });

    test("作成途中の行インデックスでは保存できない", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      const index = {
        rowCount: opened.index.rowCount,
        completed: false,
        getRowRange: (i: number) => opened.index.getRowRange(i),
      };
      await assert.rejects(save(opened, all(opened), { index }), /行インデックス/);
      assertIntact(opened.filePath);
    });

    test("置き換え（rename）が失敗し続けると、リトライした後に失敗し一時ファイルを消す", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      let calls = 0;
      const rename = () => {
        calls++;
        return Promise.reject(Object.assign(new Error("busy"), { code: "EBUSY" }));
      };
      await assert.rejects(save(opened, [original(0, 1)], { rename }), { code: "EBUSY" });
      assert.strictEqual(calls, 3);
      assertIntact(opened.filePath);
    });

    test("置き換えが一時的に失敗しても、リトライして成功する", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      let calls = 0;
      const rename = async (from: string, to: string) => {
        calls++;
        if (calls < 3) {
          throw Object.assign(new Error("perm"), { code: "EPERM" });
        }
        await fs.promises.rename(from, to);
      };
      await save(opened, [original(0, 1)], { rename });
      assert.strictEqual(fs.readFileSync(opened.filePath, "utf8"), "h\n");
      assert.deepStrictEqual(listDir(), ["src.csv"]);
    });

    test("リトライしない種類のエラーはすぐに失敗する", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      let calls = 0;
      const rename = () => {
        calls++;
        return Promise.reject(Object.assign(new Error("nope"), { code: "ENOSPC" }));
      };
      await assert.rejects(save(opened, [original(0, 1)], { rename }), { code: "ENOSPC" });
      assert.strictEqual(calls, 1);
      assertIntact(opened.filePath);
    });

    test("書き出し先のディレクトリが無ければ失敗する", async () => {
      const opened = await openText("src.csv", data, "utf-8");
      const target = path.join(tempDir, "missing", "out.csv");
      await assert.rejects(save(opened, all(opened), { targetPath: target }), {
        code: "ENOENT",
      });
      assertIntact(opened.filePath);
    });

    if (process.platform === "win32") {
      test("Windows: 読み取り専用のファイルは置き換えられない", async () => {
        const opened = await openText("src.csv", data, "utf-8");
        fs.chmodSync(opened.filePath, 0o444);
        await assert.rejects(save(opened, [original(0, 1)]), { code: "EPERM" });
        assertIntact(opened.filePath);
      });

      test("Windows: 元ファイルを開いたままのハンドルがあると置き換えられない（provider は保存前に閉じる）", async () => {
        const opened = await openText("src.csv", data, "utf-8");
        const reader = await FileRowReader.open(opened.filePath, { encoding: "utf-8" });
        try {
          await assert.rejects(save(opened, [original(0, 1)]), { code: "EPERM" });
          assertIntact(opened.filePath);
        } finally {
          await reader.close();
        }
      });
    }
  });

  suite("ランダムな編集（シード固定）", () => {
    test("書き出したファイルを読み直すと、区間列から組み立てた行と一致する", async function () {
      this.timeout(60_000);
      const random = createRandom(20261026);
      const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
      const pieces = [
        "a",
        "bc",
        ",",
        '"',
        "\n",
        "\r\n",
        " ",
        "あ",
        "漢",
        "表",
        "ｱ",
        "～",
        "①",
        "髙",
      ];
      const randomCell = () =>
        Array.from({ length: Math.floor(random() * 4) }, () => pick(pieces)).join("");
      const randomRow = () => Array.from({ length: 1 + Math.floor(random() * 3) }, randomCell);
      const encodings: LargeEncoding[] = ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"];
      const eols: RecordDelimiter[] = ["\n", "\r\n", "\r"];

      for (let n = 0; n < 200; n++) {
        const encoding = pick(encodings);
        const eol = pick(eols);
        const sourceRows = Array.from({ length: Math.floor(random() * 8) }, randomRow);
        const text =
          (encoding === "utf-8-bom" && random() < 0.5 ? "﻿" : "") +
          sourceRows.map((cells) => toCsvLine(cells)).join(eol) +
          (random() < 0.5 ? eol : "");
        const filePath = writeFile(`case${String(n)}.csv`, encodeText(text, encoding));
        const opened = await open(filePath, encoding);
        const sourceModel = (await reread(filePath, encoding)).rows;

        const segments: WriteSegment[] = [];
        const model: string[][] = [];
        for (let i = 0; i < sourceModel.length; i++) {
          const action = random();
          if (action < 0.15) {
            const inserted = randomRow();
            segments.push(row(...inserted));
            model.push(inserted);
          }
          if (action < 0.3) {
            continue; // 削除
          }
          if (action < 0.45) {
            const edited = randomRow();
            segments.push(row(...edited));
            model.push(edited);
            continue;
          }
          const last = segments[segments.length - 1] as WriteSegment | undefined;
          if (last?.kind === "original" && last.end === i) {
            last.end++;
          } else {
            segments.push(original(i, i + 1));
          }
          model.push(sourceModel[i]);
        }
        if (random() < 0.3) {
          const appended = randomRow();
          segments.push(row(...appended));
          model.push(appended);
        }

        const result = await save(opened, segments);
        const context = `case ${String(n)}: ${encoding} ${JSON.stringify(eol)} ${JSON.stringify(text)} ${JSON.stringify(segments)}`;
        const reread_ = await assertOffsetsMatch(filePath, encoding, result).catch((e: unknown) => {
          throw new Error(`${context}\n${String(e)}`);
        });
        assert.deepStrictEqual(reread_.rows, model, context);
      }
    });
  });
});

/** stringifyRow と同じ規則の1行（テスト側の独立した実装） */
function toCsvLine(cells: readonly string[]): string {
  return cells
    .map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
    .join(",");
}

/** シード固定の擬似乱数（mulberry32） */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
