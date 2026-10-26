/* global __dirname */
import * as assert from "assert";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import type { LargeCsvDocument } from "../large/largeCsvDocument";
import type { LargeCsvEditorProviderOptions } from "../large/largeCsvEditorProvider";
import { PendingEncodings } from "../large/pendingEncodings";
import { MAX_RANGE_CELLS, type LargeOp, type LargeRange } from "../message/largeMessages";
import { ControlledRowIndex } from "./helpers/controlledRowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { openLargeEditor, settle, waitUntil } from "./helpers/largeProviderHarness";

/**
 * 大容量モードでの範囲コピーと貼り付け（largeRange.feature）。
 *
 * モックの webview / panel で provider を直接駆動し、webview と同じ形の `large/getRange` / `large/applyOps` を渡す。
 * コピー・貼り付けのキー操作と TSV への変換は webview 側（LargeTableClipboard.feature）で確かめる。
 * ソートは実物のワーカー（dist/largeCsvWorker.js）で行う。`node esbuild.js`（pretest の compile）でビルドしておく
 */

const workerPath = path.resolve(__dirname, "../../dist/largeCsvWorker.js");

/** ヘッダー＋データ10行（データ行 i は "r{i}", "a{i}", "b{i}"。i は 1 始まり） */
const TEN_ROWS: string[][] = Array.from({ length: 10 }, (_, i) => [
  `r${String(i + 1)}`,
  `a${String(i + 1)}`,
  `b${String(i + 1)}`,
]);
const TEN_CSV = "id,a,b\n" + TEN_ROWS.map((row) => row.join(",") + "\n").join("");

suite("大容量モードでの範囲コピーと貼り付け", function () {
  this.timeout(60000);
  let dir = "";
  let opened: { close: () => Promise<void> }[] = [];
  let reqId = 0;
  let jobId = 0;

  const writeFile = (name: string, data: string): vscode.Uri => {
    fs.writeFileSync(path.join(dir, name), data);
    return vscode.Uri.file(path.join(dir, name));
  };

  const openHarness = async (
    uri: vscode.Uri,
    extra: Partial<LargeCsvEditorProviderOptions> = {}
  ) => {
    const pending = new PendingEncodings();
    pending.set(uri, "utf-8");
    const editor = await openLargeEditor(uri, {
      picker: new ScriptedPicker(),
      pending,
      ...extra,
      document: { workerPath, ...extra.document },
    });
    opened.push(editor);
    const document = editor.document as LargeCsvDocument;
    const initDone = editor.send({ type: "init" });
    if (!extra.document?.buildIndex) {
      await initDone;
      await document.indexDone;
      await settle();
    }
    const revision = () =>
      editor.posted
        .filter((m) => m.type === "large/init" || m.type === "large/invalidate")
        .map((m) => (m.revision as number | undefined) ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
    const apply = (ops: LargeOp[]) =>
      editor.send({ type: "large/applyOps", revision: revision(), ops });
    /** 範囲を要求し、その応答（large/range か large/error）を返す（届かなければ undefined） */
    const requestRange = async (range: LargeRange) => {
      const id = ++reqId;
      await editor.send({ type: "large/getRange", reqId: id, range });
      return responseOf(id);
    };
    const responseOf = (id: number) =>
      editor.posted.find(
        (m) => (m.type === "large/range" || m.type === "large/error") && m.reqId === id
      );
    const rangeRows = async (range: LargeRange) => {
      const response = await requestRange(range);
      assert.strictEqual(response?.type, "large/range", "large/range が返る");
      return response.rows as string[][];
    };
    const rows = async (start = 0, count = 100) => {
      const id = ++reqId;
      await editor.send({ type: "large/getRows", reqId: id, start, count });
      const response = editor.posted.find((m) => m.type === "large/rows" && m.reqId === id);
      assert.ok(response, "large/rows が返る");
      return { rows: response.rows as string[][], handles: response.handles as number[] };
    };
    const sort = async (column: number, direction: "asc" | "desc") => {
      const id = ++jobId;
      await editor.send({ type: "large/sort", jobId: id, column, direction });
      await waitUntil(
        () =>
          editor.posted.some((m) => m.type === "large/progress" && m.jobId === id && m.ratio === 1),
        20000
      );
    };
    return {
      ...editor,
      document,
      initDone,
      apply,
      requestRange,
      responseOf,
      rangeRows,
      rows,
      sort,
      save: () => editor.provider.saveCustomDocument(document, editor.token),
    };
  };

  suiteSetup(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-range-"));
    assert.ok(fs.existsSync(workerPath), `${workerPath} が無い。node esbuild.js を先に実行する`);
  });

  setup(() => {
    opened = [];
  });

  teardown(async () => {
    for (const editor of opened) {
      await editor.close();
    }
  });

  suiteTeardown(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  test("範囲を要求すると指定した行と列のセルが返る", async () => {
    const editor = await openHarness(writeFile("range.csv", TEN_CSV));
    const rows = await editor.rangeRows({ startRow: 2, endRow: 5, startCol: 1, endCol: 3 });
    assert.deepStrictEqual(rows, [
      ["a3", "b3"],
      ["a4", "b4"],
      ["a5", "b5"],
    ]);
  });

  test("列が足りない行は空のセルで埋めて返る", async () => {
    const editor = await openHarness(writeFile("ragged.csv", "id,a,b\nr1,a1,b1\nr2\nr3,a3\n"));
    const rows = await editor.rangeRows({ startRow: 0, endRow: 3, startCol: 0, endCol: 3 });
    assert.deepStrictEqual(rows, [
      ["r1", "a1", "b1"],
      ["r2", "", ""],
      ["r3", "a3", ""],
    ]);
  });

  test("ソート後は表示順の範囲が返る", async () => {
    const editor = await openHarness(writeFile("sorted.csv", TEN_CSV));
    await editor.sort(1, "desc");
    const rows = await editor.rangeRows({ startRow: 0, endRow: 3, startCol: 0, endCol: 2 });
    // 画面が表示している（getRows で取る）ソート後の先頭3行と同じ
    const shown = (await editor.rows(0, 3)).rows.map((row) => row.slice(0, 2));
    assert.deepStrictEqual(rows, shown);
    assert.notDeepStrictEqual(
      rows,
      TEN_ROWS.slice(0, 3).map((row) => row.slice(0, 2)),
      "ファイルの順ではない"
    );
    assert.deepStrictEqual(rows[0], ["r9", "a9"], "降順の先頭");
  });

  test("編集と追加した行を反映した範囲が返る", async () => {
    const editor = await openHarness(writeFile("edited.csv", TEN_CSV));
    const { handles } = await editor.rows(0, 2);
    await editor.apply([{ type: "setRow", handle: handles[1], row: ["r2", "edited", "b2"] }]);
    await editor.apply([
      { type: "insertRows", beforeHandle: handles[0], handles: [-1], rows: [["new", "x", "y"]] },
    ]);
    const rows = await editor.rangeRows({ startRow: 0, endRow: 3, startCol: 0, endCol: 3 });
    assert.deepStrictEqual(rows, [
      ["new", "x", "y"],
      ["r1", "a1", "b1"],
      ["r2", "edited", "b2"],
    ]);
  });

  test("10万セルを超える範囲はコピーできない", async () => {
    const editor = await openHarness(writeFile("too-many.csv", TEN_CSV));
    const endRow = Math.floor(MAX_RANGE_CELLS / 2) + 1;
    const response = await editor.requestRange({ startRow: 0, endRow, startCol: 0, endCol: 2 });
    assert.strictEqual(response?.type, "large/error", "エラーが伝えられる");
    assert.match(String(response.message), /10万/);
    assert.strictEqual(editor.postedOf("large/range").length, 0, "範囲は返らない");
  });

  test("5000行を超える範囲も10万セル以内ならコピーできる", async () => {
    const values = Array.from({ length: 6000 }, (_, i) => `v${String(i)}`);
    const editor = await openHarness(writeFile("many-rows.csv", `h\n${values.join("\n")}\n`));
    const response = await editor.requestRange({
      startRow: 0,
      endRow: 6000,
      startCol: 0,
      endCol: 1,
    });
    assert.strictEqual(response?.type, "large/range", `範囲が返る: ${String(response?.message)}`);
    assert.deepStrictEqual(
      response.rows,
      values.map((v) => [v])
    );
  });

  test("ちょうど10万セルの範囲は要求できる", async () => {
    const editor = await openHarness(writeFile("exact.csv", TEN_CSV));
    const endRow = MAX_RANGE_CELLS / 2;
    const rows = await editor.rangeRows({ startRow: 8, endRow, startCol: 0, endCol: 2 });
    assert.deepStrictEqual(rows, [
      ["r9", "a9"],
      ["r10", "a10"],
    ]);
  });

  test("インデックス作成中でも確定済みの範囲は返る", async () => {
    const uri = writeFile("indexing.csv", TEN_CSV);
    const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
    const editor = await openHarness(uri, { document: { workerPath, buildIndex: build } });
    // ヘッダー＋データ5行まで確定させる
    created[0].reveal(6);
    await editor.initDone;
    assert.strictEqual(editor.document.indexing, true, "作成中");

    const rows = await editor.rangeRows({ startRow: 1, endRow: 4, startCol: 0, endCol: 1 });
    assert.deepStrictEqual(rows, [["r2"], ["r3"], ["r4"]]);
    created[0].finish();
  });

  test("保存中に要求した範囲は保存の後の内容で返る", async () => {
    const uri = writeFile("saving.csv", TEN_CSV);
    const editor = await openHarness(uri);
    const { handles } = await editor.rows(0, 1);
    await editor.apply([{ type: "setRow", handle: handles[0], row: ["r1", "saved", "b1"] }]);

    const saving = editor.save();
    const id = ++reqId;
    const requested = editor.send({
      type: "large/getRange",
      reqId: id,
      range: { startRow: 0, endRow: 2, startCol: 0, endCol: 2 },
    });
    await saving;
    await requested;
    const response = editor.responseOf(id);
    assert.strictEqual(response?.type, "large/range");
    assert.deepStrictEqual(response.rows, [
      ["r1", "saved"],
      ["r2", "a2"],
    ]);
    assert.ok(fs.readFileSync(uri.fsPath, "utf8").startsWith("id,a,b\nr1,saved,b1\n"), "保存された");
  });

  test("複数行への貼り付けは1回のUndoで元に戻る", async () => {
    const editor = await openHarness(writeFile("paste.csv", TEN_CSV));
    const { handles } = await editor.rows(2, 3);
    await editor.apply(
      handles.map((handle, i) => ({
        type: "setRow" as const,
        handle,
        row: [`p${String(i)}`, "x", "y"],
      }))
    );
    await settle();
    assert.strictEqual(editor.edits.length, 1, "Undo の単位は1つ");
    assert.deepStrictEqual((await editor.rows(2, 3)).rows, [
      ["p0", "x", "y"],
      ["p1", "x", "y"],
      ["p2", "x", "y"],
    ]);

    await editor.edits[0].undo();
    await settle();
    assert.deepStrictEqual((await editor.rows(2, 3)).rows, TEN_ROWS.slice(2, 5));
    assert.strictEqual(editor.document.isDirty, false);
  });

  test("範囲コピー&ペーストは制限中の機能に含まれない", async () => {
    const editor = await openHarness(writeFile("restrictions.csv", TEN_CSV));
    const init = editor.postedOf("large/init")[0];
    assert.ok(init, "large/init が届く");
    assert.ok(
      !(init.restrictions as string[]).includes("範囲コピー&ペースト"),
      "範囲コピー&ペーストは制限されていない"
    );
  });
});
