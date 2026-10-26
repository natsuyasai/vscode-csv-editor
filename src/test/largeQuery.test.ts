/* global __dirname */
import * as assert from "assert";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import type { LargeCsvDocument } from "../large/largeCsvDocument";
import type { LargeCsvEditorProviderOptions } from "../large/largeCsvEditorProvider";
import { PendingEncodings } from "../large/pendingEncodings";
import type { LargeOp } from "../message/largeMessages";
import { ControlledRowIndex } from "./helpers/controlledRowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { openLargeEditor, settle, waitUntil } from "./helpers/largeProviderHarness";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードでの検索・ソート・フィルタ（largeQuery.feature）。
 *
 * - 走査は実物のワーカー（dist/largeCsvWorker.js）で行う。`node esbuild.js`（pretest の compile）でビルドしておく
 * - ほとんどのシナリオはモックの webview / panel で provider を直接駆動し、webview と同じ形のメッセージを渡す
 * - 最後のシナリオは実際に読み込まれた拡張機能（dist）を `vscode.openWith` で開き、実際の webview とのやり取りを
 *   WebviewTap で観測する（webview の DOM は操作できないので、ソートの要求は tap から渡す）
 */

const LARGE = "csv-editor.largeEditor";
const workerPath = path.resolve(__dirname, "../../dist/largeCsvWorker.js");

/** 10行のファイル（列: id, city, score） */
const CITY_ROWS: string[][] = [
  ["r1", "Tokyo", "30"],
  ["r2", "osaka", "5"],
  ["r3", "tokyo east", "12"],
  ["r4", "Nagoya", "7"],
  ["r5", "TOKYO", "30"],
  ["r6", "Kyoto", "100"],
  ["r7", "osaka", "12"],
  ["r8", "tokyo", "9"],
  ["r9", "Sapporo", "30"],
  ["r10", "kobe", "2"],
];
const CITY_CSV = "id,city,score\n" + CITY_ROWS.map((row) => row.join(",") + "\n").join("");

/** 12行のファイル（列: id, item）。11行目以降に数字があるので、通常モードは alphanumeric で比べる */
const ITEM_ROWS: string[][] = [
  ["r1", "item2"],
  ["r2", "item10"],
  ["r3", "Item1"],
  ["r4", "item9"],
  ["r5", "b"],
  ["r6", "A"],
  ["r7", "item10"],
  ["r8", "item3"],
  ["r9", "a"],
  ["r10", "B"],
  ["r11", "item20"],
  ["r12", "item1"],
];
const ITEM_CSV = "id,item\n" + ITEM_ROWS.map((row) => row.join(",") + "\n").join("");

/** 大きなファイル（キャンセル・保存との競合を確かめる。ワーカーは少しずつ読むように調整する） */
const bigCsv = (n: number) =>
  "id,name\n" +
  Array.from({ length: n }, (_, i) => `r${String(i)},n${String((i * 7919) % n)}\n`).join("");
const BIG_ROWS = 20000;
/** 1回に読む行数を小さくして、走査の途中で進捗が届きキャンセルできるようにする */
const SLOW_TUNING = { batchRows: 5, progressIntervalMs: 0 };

const ids = (rows: string[][]) => rows.map((row) => row[0]);

async function getApi(): Promise<CsvEditorTestingApi> {
  const extension = vscode.extensions.getExtension<CsvEditorTestingApi | undefined>(
    "natsuyasai.csv-editor"
  );
  assert.ok(extension, "csv-editor 拡張機能が読み込まれている");
  const api = await extension.activate();
  assert.ok(api, "テストモードでは API が公開される");
  return api;
}

async function closeAllEditorsAndWait() {
  if (vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => tab.isDirty))) {
    await vscode.commands.executeCommand("workbench.action.files.revert");
  }
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await waitFor(
    () => vscode.window.tabGroups.all.every((group) => group.tabs.length === 0),
    "全タブが閉じる"
  );
}

suite("大容量モードでの検索・ソート・フィルタ", function () {
  this.timeout(60000);
  let api: CsvEditorTestingApi;
  let dir = "";
  let opened: { close: () => Promise<void> }[] = [];
  let jobId = 0;

  const writeFile = (name: string, data: string): vscode.Uri => {
    fs.writeFileSync(path.join(dir, name), data);
    return vscode.Uri.file(path.join(dir, name));
  };

  // ---- モックの webview / panel で provider を直接駆動する ----

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
    let reqId = 1000;
    const rows = async (start = 0, count = 100) => {
      const id = ++reqId;
      await editor.send({ type: "large/getRows", reqId: id, start, count });
      const response = editor.posted.find((m) => m.type === "large/rows" && m.reqId === id);
      assert.ok(response, "large/rows が返る");
      return { rows: response.rows as string[][], handles: response.handles as number[] };
    };
    const revision = () =>
      editor.posted
        .filter((m) => m.type === "large/init" || m.type === "large/invalidate")
        .map((m) => (m.revision as number | undefined) ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
    const apply = (ops: LargeOp[]) =>
      editor.send({ type: "large/applyOps", revision: revision(), ops });
    /** ジョブの終わり（ratio: 1 の進捗）を待つ */
    const jobEnd = (id: number) =>
      waitUntil(
        () =>
          editor.posted.some((m) => m.type === "large/progress" && m.jobId === id && m.ratio === 1),
        20000
      );
    /** ジョブの進捗（ratio < 1）が届くまで待つ */
    const jobProgress = (id: number) =>
      waitUntil(
        () =>
          editor.posted.some(
            (m) => m.type === "large/progress" && m.jobId === id && (m.ratio as number) < 1
          ),
        20000
      );
    const sort = async (column: number, direction: "asc" | "desc" | null, wait = true) => {
      const id = ++jobId;
      await editor.send({ type: "large/sort", jobId: id, column, direction });
      if (wait) {
        await jobEnd(id);
      }
      return id;
    };
    const filter = async (filters: { column: number; text: string }[]) => {
      const id = ++jobId;
      await editor.send({ type: "large/filter", jobId: id, filters });
      await jobEnd(id);
      return id;
    };
    const search = async (query: string, from: number, fromCol?: number, direction = "forward") => {
      const id = ++jobId;
      await editor.send({ type: "large/search", jobId: id, query, from, fromCol, direction });
      await jobEnd(id);
      const result = editor.posted.find((m) => m.type === "large/searchResult" && m.jobId === id);
      assert.ok(result, "large/searchResult が返る");
      return result.match as { row: number; col: number } | null;
    };
    const errorsOf = (id: number) =>
      editor.posted.filter((m) => m.type === "large/error" && m.jobId === id);
    const lastInvalidate = () => editor.posted.filter((m) => m.type === "large/invalidate").at(-1);
    return {
      ...editor,
      document,
      initDone,
      rows,
      apply,
      sort,
      filter,
      search,
      jobEnd,
      jobProgress,
      errorsOf,
      lastInvalidate,
      revision,
      save: () => editor.provider.saveCustomDocument(document, editor.token),
    };
  };

  suiteSetup(async () => {
    api = await getApi();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-query-"));
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

  test("検索でヒットした行へ移動する", async () => {
    const editor = await openHarness(writeFile("search.csv", CITY_CSV));
    assert.deepStrictEqual(await editor.search("  TOKYO ", 0), { row: 0, col: 1 });
    assert.deepStrictEqual(await editor.search("TOKYO", 0, 1), { row: 2, col: 1 });
  });

  test("検索は末尾まで行ったら先頭に折り返す", async () => {
    const editor = await openHarness(writeFile("wrap.csv", CITY_CSV));
    // r8（表示位置7）より後ろに tokyo は無い
    assert.deepStrictEqual(await editor.search("tokyo", 7, 1), { row: 0, col: 1 });
    assert.deepStrictEqual(await editor.search("tokyo", 0, 1, "backward"), { row: 7, col: 1 });
    assert.strictEqual(await editor.search("zzz", 0), null);
  });

  test("ソート後の表示で検索すると表示順の位置が伝えられる", async () => {
    const editor = await openHarness(writeFile("search-sorted.csv", CITY_CSV));
    await editor.sort(1, "asc");
    // 10行以下なので通常モードと同じく大文字小文字を区別して比べる（basic）: Kyoto, Nagoya, Sapporo, TOKYO, …
    assert.deepStrictEqual(ids((await editor.rows()).rows).slice(0, 4), ["r6", "r4", "r9", "r5"]);
    assert.deepStrictEqual(await editor.search("tokyo", 0), { row: 3, col: 1 });
  });

  test("ソートしてもファイルの行順は変わらない", async () => {
    const uri = writeFile("sort.csv", ITEM_CSV);
    const editor = await openHarness(uri);
    const id = await editor.sort(1, "desc");

    // alphanumeric（小文字にして数字の並びは数として比べる）の降順。同じ値は元の順
    assert.deepStrictEqual(ids((await editor.rows()).rows), [
      "r11",
      "r2",
      "r7",
      "r4",
      "r8",
      "r1",
      "r3",
      "r12",
      "r5",
      "r10",
      "r6",
      "r9",
    ]);
    assert.deepStrictEqual(editor.lastInvalidate()?.query, {
      sort: { column: 1, direction: "desc" },
      filters: [],
    });
    assert.deepStrictEqual(editor.errorsOf(id), []);
    assert.strictEqual(fs.readFileSync(uri.fsPath, "utf8"), ITEM_CSV, "ファイルは変わらない");
    assert.strictEqual(editor.document.isDirty, false, "ソートは編集ではない");
    assert.strictEqual(editor.edits.length, 0);
  });

  test("ソートを解除すると元の並びに戻る", async () => {
    const editor = await openHarness(writeFile("unsort.csv", CITY_CSV));
    await editor.filter([{ column: 1, text: "to" }]);
    await editor.sort(2, "desc");
    await editor.sort(2, null);
    assert.deepStrictEqual(ids((await editor.rows()).rows), ["r1", "r3", "r5", "r6", "r8"]);
    assert.deepStrictEqual(editor.lastInvalidate()?.query, {
      sort: null,
      filters: [{ column: 1, text: "to" }],
    });
    await editor.filter([{ column: 1, text: "" }]);
    assert.deepStrictEqual(ids((await editor.rows()).rows), ids(CITY_ROWS));
    assert.deepStrictEqual(editor.lastInvalidate()?.query, { sort: null, filters: [] });
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 10);
  });

  test("ソート後にセルを編集しても並び替えは再実行されない", async () => {
    const editor = await openHarness(writeFile("edit-sorted.csv", CITY_CSV));
    await editor.sort(1, "asc");
    const { rows, handles } = await editor.rows(0, 1);
    assert.deepStrictEqual(rows[0], ["r6", "Kyoto", "100"]);

    await editor.apply([{ type: "setRow", handle: handles[0], row: ["r6", "zzz", "100"] }]);
    await settle();
    assert.deepStrictEqual((await editor.rows(0, 1)).rows[0], ["r6", "zzz", "100"], "先頭のまま");

    await editor.sort(1, "asc");
    const after = (await editor.rows()).rows;
    assert.deepStrictEqual(after.at(-1), ["r6", "zzz", "100"], "当て直すと並び替えられる");
  });

  test("フィルタで条件に合う行だけが表示される", async () => {
    const editor = await openHarness(writeFile("filter.csv", CITY_CSV));
    await editor.filter([
      { column: 1, text: "tokyo" },
      { column: 2, text: "3" },
    ]);
    assert.deepStrictEqual((await editor.rows()).rows, [CITY_ROWS[0], CITY_ROWS[4]]);
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 2);
  });

  test("フィルタとソートを組み合わせられる", async () => {
    const editor = await openHarness(writeFile("filter-sort.csv", CITY_CSV));
    await editor.filter([{ column: 1, text: "TO" }]);
    await editor.sort(2, "desc");
    // フィルタ後の5行（10行以下）なので文字列のまま比べる（basic）: "9" > "30" = "30" > "12" > "100"
    assert.deepStrictEqual(ids((await editor.rows()).rows), ["r8", "r1", "r5", "r3", "r6"]);
    assert.deepStrictEqual(editor.lastInvalidate()?.query, {
      sort: { column: 2, direction: "desc" },
      filters: [{ column: 1, text: "TO" }],
    });
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 5);
  });

  test("フィルタ中に行を挿入すると表示に加わる", async () => {
    const editor = await openHarness(writeFile("filter-insert.csv", CITY_CSV));
    await editor.filter([{ column: 1, text: "to" }]);
    await editor.apply([
      { type: "insertRows", beforeHandle: 5, handles: [-1], rows: [["new", "none", "0"]] },
    ]);
    await settle();
    assert.deepStrictEqual(ids((await editor.rows()).rows), ["r1", "r3", "new", "r5", "r6", "r8"]);
    await editor.apply([
      { type: "insertRows", beforeHandle: null, handles: [-2], rows: [["tail", "none", "0"]] },
    ]);
    await settle();
    assert.deepStrictEqual(ids((await editor.rows()).rows), [
      "r1",
      "r3",
      "new",
      "r5",
      "r6",
      "r8",
      "tail",
    ]);
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 7);
  });

  test("ソート中に行を削除してUndoすると元の位置に戻る", async () => {
    const editor = await openHarness(writeFile("delete-undo.csv", CITY_CSV));
    await editor.sort(1, "asc");
    const before = ids((await editor.rows()).rows);
    assert.deepStrictEqual(before, ["r6", "r4", "r9", "r5", "r1", "r10", "r2", "r7", "r8", "r3"]);

    await editor.apply([{ type: "deleteRows", handles: [9, 2] }]);
    await settle();
    assert.deepStrictEqual(ids((await editor.rows()).rows), [
      "r6",
      "r4",
      "r5",
      "r1",
      "r10",
      "r7",
      "r8",
      "r3",
    ]);
    const edit = editor.edits.at(-1);
    assert.ok(edit, "削除が編集として通知される");
    await edit.undo();
    await settle();
    assert.deepStrictEqual(ids((await editor.rows()).rows), before);
  });

  test("実行中のソートをキャンセルできる", async () => {
    const editor = await openHarness(writeFile("cancel.csv", bigCsv(BIG_ROWS)), {
      document: { workerPath, queryTuning: SLOW_TUNING },
    });
    const invalidates = editor.posted.filter((m) => m.type === "large/invalidate").length;
    const id = await editor.sort(1, "asc", false);
    await editor.jobProgress(id);
    await editor.send({ type: "large/cancel", jobId: id });
    await editor.jobEnd(id);

    assert.deepStrictEqual(editor.errorsOf(id), [], "キャンセルはエラーではない");
    assert.strictEqual(
      editor.posted.filter((m) => m.type === "large/invalidate").length,
      invalidates,
      "表示順は変わらないので取り直させない"
    );
    assert.deepStrictEqual(ids((await editor.rows(0, 3)).rows), ["r0", "r1", "r2"]);
    assert.deepStrictEqual(editor.document.queryState, { sort: null, filters: [] });
  });

  test("新しいソートを始めると前のソートは取り消される", async () => {
    const editor = await openHarness(writeFile("supersede.csv", bigCsv(BIG_ROWS)), {
      document: { workerPath, queryTuning: SLOW_TUNING },
    });
    const first = await editor.sort(1, "asc", false);
    await editor.jobProgress(first);
    const second = await editor.sort(0, "desc", false);
    await editor.jobEnd(first);
    await editor.jobEnd(second);

    assert.deepStrictEqual(editor.errorsOf(first), []);
    assert.deepStrictEqual(editor.errorsOf(second), []);
    assert.deepStrictEqual(editor.document.queryState, {
      sort: { column: 0, direction: "desc" },
      filters: [],
    });
    // r9999 > r9998 > …（20000行は11行を超えるので alphanumeric）
    assert.deepStrictEqual(ids((await editor.rows(0, 2)).rows), ["r19999", "r19998"]);
  });

  test("保存の後もソート順が保たれる", async () => {
    const editor = await openHarness(writeFile("save-sorted.csv", CITY_CSV));
    await editor.apply([
      { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["r0", "Aomori", "1"]] },
    ]);
    await editor.apply([{ type: "deleteRows", handles: [4] }]);
    await editor.sort(1, "asc");
    const before = await editor.rows();

    await editor.save();
    await settle();
    const after = await editor.rows();
    assert.deepStrictEqual(after.rows, before.rows, "同じ行が同じ順で表示される");
    assert.ok(
      after.handles.every((h) => h > 0),
      "保存した後は保存したファイルの行番号で表す"
    );
    assert.deepStrictEqual(editor.document.queryState.sort, { column: 1, direction: "asc" });
  });

  test("保存の前にソートを実行中なら取り消される", async () => {
    const uri = writeFile("save-during-sort.csv", bigCsv(BIG_ROWS));
    const editor = await openHarness(uri, {
      document: { workerPath, queryTuning: SLOW_TUNING },
    });
    await editor.apply([{ type: "setRow", handle: 1, row: ["r0", "edited"] }]);
    const id = await editor.sort(1, "asc", false);
    await editor.jobProgress(id);

    // Windows ではワーカーがファイルを開いたままだと置き換えられない（EPERM）ので、保存が成功すること自体を確かめる
    await editor.save();
    await editor.jobEnd(id);

    assert.ok(fs.readFileSync(uri.fsPath, "utf8").startsWith("id,name\nr0,edited\n"), "保存された");
    const errors = editor.errorsOf(id);
    assert.strictEqual(errors.length, 1, "取り消しが伝えられる");
    assert.match(String(errors[0].message), /もう一度/);
    assert.deepStrictEqual(ids((await editor.rows(0, 3)).rows), ["r0", "r1", "r2"]);
    assert.deepStrictEqual(editor.document.queryState, { sort: null, filters: [] });
  });

  test("元に戻す（revert）とソート・フィルタが解除される", async () => {
    const editor = await openHarness(writeFile("revert.csv", CITY_CSV));
    await editor.filter([{ column: 1, text: "to" }]);
    await editor.sort(2, "desc");

    await editor.provider.revertCustomDocument(editor.document, editor.token);
    await settle();
    assert.deepStrictEqual(ids((await editor.rows()).rows), ids(CITY_ROWS));
    assert.deepStrictEqual(editor.lastInvalidate()?.query, { sort: null, filters: [] });
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 10);
  });

  test("開き直した画面には適用中のソートとフィルタが伝えられる", async () => {
    const editor = await openHarness(writeFile("reinit.csv", CITY_CSV));
    await editor.filter([{ column: 1, text: "to" }]);
    await editor.sort(2, "desc");

    await editor.send({ type: "init" });
    const init = editor.posted.filter((m) => m.type === "large/init").at(-1);
    assert.ok(init);
    assert.strictEqual(init.rowCount, 5);
    assert.deepStrictEqual(init.query, {
      sort: { column: 2, direction: "desc" },
      filters: [{ column: 1, text: "to" }],
    });
  });

  test("行数が上限を超えるとソートは拒否される", async () => {
    const editor = await openHarness(writeFile("too-many.csv", CITY_CSV), {
      document: { workerPath, maxSortRows: 9 },
    });
    const id = await editor.sort(1, "asc");
    assert.strictEqual(editor.errorsOf(id).length, 1, "エラーが伝えられる");
    assert.match(String(editor.errorsOf(id)[0].message), /上限/);
    assert.deepStrictEqual(editor.document.queryState, { sort: null, filters: [] });

    const filtered = await editor.filter([{ column: 1, text: "to" }]);
    assert.deepStrictEqual(editor.errorsOf(filtered), []);
    // フィルタ後は上限以下なのでソートできる
    const sorted = await editor.sort(1, "asc");
    assert.deepStrictEqual(editor.errorsOf(sorted), []);
    assert.strictEqual(editor.lastInvalidate()?.rowCount, 5);
  });

  test("インデックス作成中のソートは拒否される", async () => {
    const uri = writeFile("indexing.csv", CITY_CSV);
    const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
    const editor = await openHarness(uri, { document: { workerPath, buildIndex: build } });
    created[0].reveal(3);
    await editor.initDone;

    const id = await editor.sort(1, "asc");
    assert.strictEqual(editor.errorsOf(id).length, 1, "エラーが伝えられる");
    assert.deepStrictEqual(editor.document.queryState, { sort: null, filters: [] });
    created[0].finish();
  });

  suite("実際の画面", () => {
    let tap: WebviewTap;
    let picker: ScriptedPicker;

    setup(async () => {
      await closeAllEditorsAndWait();
      tap = new WebviewTap();
      picker = new ScriptedPicker("utf-8");
      api.setPickerForTesting(picker);
      api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
    });

    teardown(async () => {
      api.setPickerForTesting(undefined);
      api.setLargeEditorForTesting(undefined);
      await closeAllEditorsAndWait();
    });

    test("実際の画面でソートすると画面がソート後の行を取り直す", async () => {
      const uri = writeFile("real.csv", ITEM_CSV);
      await vscode.commands.executeCommand("vscode.openWith", uri, LARGE);
      await tap.waitFor("toWebview", (m) => m.type === "large/init", "large/init");
      await tap.waitFor(
        "toWebview",
        (m) => m.type === "large/rows" && m.start === 0,
        "先頭行の応答"
      );

      const from = tap.log.length;
      await tap.deliver({ type: "large/sort", jobId: 900001, column: 1, direction: "asc" });
      let rows: string[][] | undefined;
      await waitFor(() => {
        const after = tap.log.slice(from);
        const invalidated = after.findIndex(
          (m) => m.direction === "toWebview" && m.message.type === "large/invalidate"
        );
        if (invalidated < 0) {
          return false;
        }
        const requests = after
          .slice(invalidated)
          .filter((m) => m.direction === "toExtension" && m.message.type === "large/getRows")
          .map((m) => m.message.reqId);
        const response = after
          .slice(invalidated)
          .find(
            (m) =>
              m.direction === "toWebview" &&
              m.message.type === "large/rows" &&
              m.message.start === 0 &&
              requests.includes(m.message.reqId)
          );
        rows = response?.message.rows as string[][] | undefined;
        return rows !== undefined;
      }, "ソート後に webview が取り直した行");
      assert.deepStrictEqual(ids(rows ?? []).slice(0, 12), [
        "r6",
        "r9",
        "r5",
        "r10",
        "r3",
        "r12",
        "r1",
        "r8",
        "r4",
        "r2",
        "r7",
        "r11",
      ]);
      assert.deepStrictEqual(picker.mismatches, []);
    });
  });
});
