/* global AbortController, process */
import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";

import { RowIndex, RowIndexLimitError, type RowIndexProgress } from "../large/rowIndex";

/** 大容量モードの行インデックス（元ファイルの行開始バイトオフセット表）。vscode API には依存しない */
suite("RowIndex（行インデックスの非同期作成）", () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-large-index-"));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writeFile = (name: string, data: Uint8Array | string): string => {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, data);
    return filePath;
  };

  /** すべての行の範囲 */
  const allRanges = (index: RowIndex) =>
    Array.from({ length: index.rowCount }, (_, i) => index.getRowRange(i));

  suite("行の範囲", () => {
    test("LF 区切りの各行の開始・終了・次の行の開始を返す", async () => {
      const index = RowIndex.build(writeFile("lf.csv", "a,b\nc,d\n"), { skipBom: true });
      const summary = await index.done;
      assert.deepStrictEqual(allRanges(index), [
        { start: 0, end: 3, next: 4 },
        { start: 4, end: 7, next: 8 },
      ]);
      assert.deepStrictEqual(summary, {
        delimiter: "\n",
        contentStart: 0,
        byteLength: 8,
        hasTrailingNewline: true,
        rowCount: 2,
      });
    });

    test("CRLF 区切りでは行の終了が CRLF の手前になる", async () => {
      const index = RowIndex.build(writeFile("crlf.csv", "a\r\nb\r\n"), { skipBom: true });
      const summary = await index.done;
      assert.deepStrictEqual(allRanges(index), [
        { start: 0, end: 1, next: 3 },
        { start: 3, end: 4, next: 6 },
      ]);
      assert.strictEqual(summary.delimiter, "\r\n");
    });

    test("CR 区切りでは行の終了が CR の手前になる", async () => {
      const index = RowIndex.build(writeFile("cr.csv", "a\rb\rc"), { skipBom: true });
      const summary = await index.done;
      assert.deepStrictEqual(allRanges(index), [
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 3, next: 4 },
        { start: 4, end: 5, next: 5 },
      ]);
      assert.strictEqual(summary.delimiter, "\r");
    });

    test("末尾に改行が無ければ最終行の終了はファイルの末尾", async () => {
      const index = RowIndex.build(writeFile("noeol.csv", "a\nbc"), { skipBom: true });
      const summary = await index.done;
      assert.deepStrictEqual(index.getRowRange(1), { start: 2, end: 4, next: 4 });
      assert.strictEqual(summary.hasTrailingNewline, false);
    });

    test("クォート内の改行は行を分けない", async () => {
      const index = RowIndex.build(writeFile("quoted.csv", 'h\n"x\ny",z\nlast'), {
        skipBom: true,
      });
      await index.done;
      assert.deepStrictEqual(allRanges(index), [
        { start: 0, end: 1, next: 2 },
        { start: 2, end: 9, next: 10 },
        { start: 10, end: 14, next: 14 },
      ]);
    });

    test("UTF-8 の BOM を飛ばすと1行目は BOM の後から始まる", async () => {
      const data = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("h\nv\n")]);
      const index = RowIndex.build(writeFile("bom.csv", data), { skipBom: true });
      const summary = await index.done;
      assert.deepStrictEqual(index.getRowRange(0), { start: 3, end: 4, next: 5 });
      assert.strictEqual(summary.contentStart, 3);
    });

    test("BOM を飛ばさない指定では先頭の EF BB BF を1行目に含める", async () => {
      const data = Buffer.from([0xef, 0xbb, 0xbf, 0x0a]);
      const index = RowIndex.build(writeFile("nobom.csv", data), { skipBom: false });
      const summary = await index.done;
      assert.deepStrictEqual(index.getRowRange(0), { start: 0, end: 3, next: 4 });
      assert.strictEqual(summary.contentStart, 0);
    });

    test("空ファイルは0行で、末尾改行なし・行区切りなし", async () => {
      const index = RowIndex.build(writeFile("empty.csv", ""), { skipBom: true });
      assert.deepStrictEqual(await index.done, {
        delimiter: null,
        contentStart: 0,
        byteLength: 0,
        hasTrailingNewline: false,
        rowCount: 0,
      });
      assert.strictEqual(index.rowCount, 0);
    });

    test("確定していない行の範囲は RangeError", async () => {
      const index = RowIndex.build(writeFile("one.csv", "a\n"), { skipBom: true });
      await index.done;
      assert.throws(() => index.getRowRange(1), RangeError);
      assert.throws(() => index.getRowRange(-1), RangeError);
    });

    test("チャンクの境界が行・CRLF・クォートの途中にあっても一括と同じ範囲になる", async () => {
      const text = 'h1,h2\r\n"a\r\nb",c\r\n,\r\n"""q""",x\r\nend';
      const filePath = writeFile("chunks.csv", text);
      const whole = RowIndex.build(filePath, { skipBom: true });
      await whole.done;
      for (const highWaterMark of [1, 2, 3, 5, 7]) {
        const chunked = RowIndex.build(filePath, { skipBom: true, highWaterMark });
        await chunked.done;
        assert.deepStrictEqual(
          allRanges(chunked),
          allRanges(whole),
          `highWaterMark=${String(highWaterMark)}`
        );
      }
    });

    test("行数が多くても（配列の伸長をまたいでも）すべての行の範囲を返す", async () => {
      const rowCount = 200_000;
      const index = RowIndex.build(writeFile("many.csv", "x\n".repeat(rowCount)), {
        skipBom: true,
      });
      await index.done;
      assert.strictEqual(index.rowCount, rowCount);
      assert.deepStrictEqual(index.getRowRange(rowCount - 1), {
        start: (rowCount - 1) * 2,
        end: (rowCount - 1) * 2 + 1,
        next: rowCount * 2,
      });
    });
  });

  suite("作成中の通知と先頭行", () => {
    test("読んだバイト数とファイルサイズで進捗を通知し、最後は 1 になる", async () => {
      const progress: RowIndexProgress[] = [];
      const text = "row1\nrow2\nrow3\nrow4\n";
      const index = RowIndex.build(writeFile("progress.csv", text), {
        skipBom: true,
        highWaterMark: 5,
        onProgress: (p) => progress.push(p),
      });
      await index.done;
      assert.ok(progress.length >= 4, `通知が ${String(progress.length)} 回しかない`);
      const ratios = progress.map((p) => p.ratio);
      assert.deepStrictEqual(
        ratios,
        [...ratios].sort((a, b) => a - b),
        "進捗は単調増加"
      );
      assert.deepStrictEqual(progress[progress.length - 1], {
        bytesRead: text.length,
        totalBytes: text.length,
        ratio: 1,
        rowCount: 4,
      });
    });

    test("作成が終わる前に1行目（ヘッダー）が確定し、その範囲を取れる", async () => {
      const text = "header\n" + "data\n".repeat(1000);
      const index = RowIndex.build(writeFile("first.csv", text), {
        skipBom: true,
        highWaterMark: 16,
      });
      const hasFirstRow = await index.firstRow;
      assert.strictEqual(hasFirstRow, true);
      assert.strictEqual(index.completed, false, "先頭行の時点ではまだ作成中");
      assert.ok(index.rowCount >= 1);
      assert.deepStrictEqual(index.getRowRange(0), { start: 0, end: 6, next: 7 });
      await index.done;
      assert.strictEqual(index.completed, true);
      assert.strictEqual(index.rowCount, 1001);
    });

    test("行が無いファイルでは先頭行の通知は false で決着する", async () => {
      const index = RowIndex.build(writeFile("bomonly.csv", Buffer.from([0xef, 0xbb, 0xbf])), {
        skipBom: true,
      });
      assert.strictEqual(await index.firstRow, false);
    });

    test("改行の無い1行だけのファイルでは完了時に先頭行が確定する", async () => {
      const index = RowIndex.build(writeFile("single.csv", "only"), { skipBom: true });
      assert.strictEqual(await index.firstRow, true);
      assert.deepStrictEqual(index.getRowRange(0), { start: 0, end: 4, next: 4 });
    });
  });

  suite("キャンセルとエラー", () => {
    test("中断すると done は AbortError で reject され、完了しない", async () => {
      const controller = new AbortController();
      const index = RowIndex.build(writeFile("abort.csv", "x\n".repeat(10_000)), {
        skipBom: true,
        highWaterMark: 64,
        signal: controller.signal,
        onProgress: () => {
          controller.abort();
        },
      });
      await assert.rejects(index.done, (error: Error) => error.name === "AbortError");
      assert.ok(index.rowCount < 10_000);
      assert.strictEqual(index.completed, false);
    });

    test("開始前に中断済みの signal ならすぐ reject され、先頭行は false で決着する", async () => {
      const controller = new AbortController();
      controller.abort();
      const index = RowIndex.build(writeFile("aborted.csv", "a\nb\n"), {
        skipBom: true,
        signal: controller.signal,
      });
      await assert.rejects(index.done, (error: Error) => error.name === "AbortError");
      assert.strictEqual(await index.firstRow, false);
    });

    test("存在しないファイルは done が reject される", async () => {
      const index = RowIndex.build(path.join(tempDir, "missing.csv"), { skipBom: true });
      await assert.rejects(
        index.done,
        (error: Error & { code?: string }) => error.code === "ENOENT"
      );
      assert.strictEqual(await index.firstRow, false);
    });

    test("行数が上限を超えると RowIndexLimitError で止まる", async () => {
      const index = RowIndex.build(writeFile("limit.csv", "x\n".repeat(100)), {
        skipBom: true,
        maxRows: 10,
      });
      await assert.rejects(index.done, RowIndexLimitError);
      assert.ok(index.rowCount <= 10);
    });

    test("done を待たずに失敗しても unhandled rejection にならない", async () => {
      const unhandled: unknown[] = [];
      const listener = (reason: unknown) => unhandled.push(reason);
      process.on("unhandledRejection", listener);
      try {
        RowIndex.build(path.join(tempDir, "missing2.csv"), { skipBom: true });
        await sleep(100);
      } finally {
        process.off("unhandledRejection", listener);
      }
      assert.deepStrictEqual(unhandled, []);
    });
  });
});
