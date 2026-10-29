/* global console, __dirname */
import * as assert from "assert";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import { performance } from "perf_hooks";
import * as process from "process";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import { writeLargeBackup } from "../large/largeBackup";
import { LargeCsvDocument } from "../large/largeCsvDocument";
import { MAX_ROWS_PER_REQUEST } from "../message/largeMessages";
import type { LargeEncoding } from "../large/largeEncoding";
import { QueryWorkerClient } from "../large/queryWorkerClient";
import type { ViewJobResult } from "../large/queryProtocol";
import { RowIndex } from "../large/rowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードの性能計測（プランの性能目標: 500MB・約500万行で、先頭行の表示まで3秒以内、
 * スクロール時の行取得200ms以内、拡張ホストのメモリ増加がファイルサイズ未満）。
 *
 * 通常の `npm test` では実行しない。`CSV_EDITOR_BENCH=1` のときだけ実行する:
 *   CSV_EDITOR_BENCH=1 npx vscode-test --grep "大容量モードの性能計測"
 * `CSV_EDITOR_BENCH_SIZE`（既定 500MB）・`CSV_EDITOR_BENCH_COLS`（既定 8）で生成する大きさを変えられる。
 * `CSV_EDITOR_BENCH_ENCODING`（utf-8 | shift_jis。既定 utf-8）で文字コードを変えられる（生成も同じ文字コード）。
 * `CSV_EDITOR_BENCH_FILE` に CSV のパスを渡すとそれを使う（消さない）。無ければ
 * `scripts/bench/generate-large-csv.mjs` で 500MB を一時ディレクトリに生成し、計測後に消す。
 * 生成した直後のファイルは OS のページキャッシュに載っているので、計測値はウォームキャッシュの値。
 */

const LARGE = "csv-editor.largeEditor";
const MiB = 1024 * 1024;
const BENCH_SIZE = process.env.CSV_EDITOR_BENCH_SIZE ?? "500MB";
/** 列数（generate-large-csv.mjs の既定は 10 列で約400万行。8 列で約500万行） */
const BENCH_COLS = process.env.CSV_EDITOR_BENCH_COLS ?? "8";
/** 文字コード（shift_jis を指定すると生成するファイルも Shift_JIS にする） */
const BENCH_ENCODING: LargeEncoding =
  process.env.CSV_EDITOR_BENCH_ENCODING === "shift_jis" ? "shift_jis" : "utf-8";
const benchSuite = process.env.CSV_EDITOR_BENCH === "1" ? suite : suite.skip;

/** webview が中ほどを表示したときの要求と同じ大きさ（表示中のページと前後の先読み1ページずつ） */
const REQUEST_ROWS = 1500;
const SAMPLES = 10;

const mib = (bytes: number) => Math.round((bytes / MiB) * 10) / 10;
const ms = (value: number) => Math.round(value * 10) / 10;

function memory() {
  const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, external, arrayBuffers };
}

function memoryDelta(after: ReturnType<typeof memory>, before: ReturnType<typeof memory>) {
  return {
    rssMiB: mib(after.rss - before.rss),
    heapUsedMiB: mib(after.heapUsed - before.heapUsed),
    externalMiB: mib(after.external - before.external),
    arrayBuffersMiB: mib(after.arrayBuffers - before.arrayBuffers),
  };
}

function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    medianMs: ms(sorted[Math.floor(sorted.length / 2)]),
    maxMs: ms(sorted[sorted.length - 1]),
    minMs: ms(sorted[0]),
  };
}

benchSuite("大容量モードの性能計測", function () {
  this.timeout(20 * 60 * 1000);
  let api: CsvEditorTestingApi;
  let dir: string | undefined;
  let file = "";

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension<CsvEditorTestingApi | undefined>(
      "natsuyasai.csv-editor"
    );
    assert.ok(extension);
    const activated = await extension.activate();
    assert.ok(activated, "テストモードでは API が公開される");
    api = activated;

    const given = process.env.CSV_EDITOR_BENCH_FILE;
    if (given) {
      file = given;
      return;
    }
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-bench-"));
    file = path.join(dir, "bench.csv");
    const script = path.resolve(__dirname, "../../scripts/bench/generate-large-csv.mjs");
    const started = performance.now();
    const result = spawnSync(
      "node",
      [
        script,
        "--size",
        BENCH_SIZE,
        "--cols",
        BENCH_COLS,
        "--encoding",
        BENCH_ENCODING === "shift_jis" ? "shift_jis" : "utf8",
        "--out",
        file,
      ],
      {
        encoding: "utf8",
      }
    );
    assert.strictEqual(result.status, 0, result.stderr);
    console.log(`[bench] generated ${BENCH_SIZE} in ${String(ms(performance.now() - started))}ms`);
  });

  suiteTeardown(async () => {
    api.setLargeEditorForTesting(undefined);
    api.setPickerForTesting(undefined);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      console.log(`[bench] removed ${dir}: exists=${String(fs.existsSync(dir))}`);
    }
  });

  test("500MBのファイルを開いて先頭行・任意位置の行の取得時間とメモリを計測する", async () => {
    const size = fs.statSync(file).size;
    const tap = new WebviewTap();
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
    api.setPickerForTesting(new ScriptedPicker(BENCH_ENCODING));
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    const before = memory();
    const t0 = performance.now();
    await vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(file), LARGE);

    // (a) 開いてから、実際の webview が要求した先頭の行が届くまで
    const webviewInit = await tap.waitFor("toExtension", (m) => m.type === "init", "init", 60000);
    const largeInit = await tap.waitFor("toWebview", (m) => m.type === "large/init", "large/init");
    const firstRequest = await tap.waitFor(
      "toExtension",
      (m) => m.type === "large/getRows" && m.start === 0,
      "先頭行の要求"
    );
    const firstRows = await tap.waitFor(
      "toWebview",
      (m) => m.type === "large/rows" && m.reqId === firstRequest.message.reqId,
      "先頭行の応答"
    );

    // 行インデックスの作成完了（init の時点で終わっていれば large/init が indexing: false）
    await waitFor(
      () =>
        largeInit.message.indexing === false ||
        tap.messagesOf("toWebview", "large/progress").some((m) => m.ratio === 1),
      "行インデックスの作成完了",
      10 * 60 * 1000
    );
    const indexedAt = performance.now();
    const afterIndex = memory();
    const rowCount =
      (tap.messagesOf("toWebview", "large/invalidate").at(-1)?.rowCount as number | undefined) ??
      (largeInit.message.rowCount as number);

    // (b) 任意位置（中ほど・末尾付近）の getRows → rows の往復。位置は毎回変える
    let reqId = 1_000_000;
    const roundTrip = async (start: number) => {
      const id = reqId++;
      const began = performance.now();
      await tap.deliver({ type: "large/getRows", reqId: id, start, count: REQUEST_ROWS });
      const response = tap.messagesOf("toWebview", "large/rows").find((m) => m.reqId === id);
      assert.ok(response, `start=${String(start)} の行が届く`);
      assert.ok((response.rows as unknown[]).length > 0);
      return performance.now() - began;
    };
    const middle: number[] = [];
    const tail: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      middle.push(await roundTrip(Math.floor(rowCount / 2) + i * 7919));
      tail.push(await roundTrip(Math.max(0, rowCount - REQUEST_ROWS - i * 7919)));
    }
    const afterReads = memory();

    const report = {
      file: { sizeMiB: mib(size), rowCount },
      openToWebviewInitMs: ms(webviewInit.at - t0),
      openToLargeInitMs: ms(largeInit.at - t0),
      initIndexing: largeInit.message.indexing,
      firstRequest: { start: firstRequest.message.start, count: firstRequest.message.count },
      openToFirstRowsMs: ms(firstRows.at - t0),
      firstRequestRoundTripMs: ms(firstRows.at - firstRequest.at),
      openToIndexDoneMs: ms(indexedAt - t0),
      progressMessages: tap.messagesOf("toWebview", "large/progress").length,
      invalidateMessages: tap.messagesOf("toWebview", "large/invalidate").length,
      middle: summarize(middle),
      tail: summarize(tail),
      memoryAfterIndex: memoryDelta(afterIndex, before),
      memoryAfterReads: memoryDelta(afterReads, before),
    };
    console.log(`[bench] ${JSON.stringify({ encoding: BENCH_ENCODING, ...report }, null, 2)}`);

    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
  test("500MBのファイルで検索・ソート・フィルタの時間とメモリを計測する", async () => {
    const tap = new WebviewTap();
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
    api.setPickerForTesting(new ScriptedPicker(BENCH_ENCODING));
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(file), LARGE);
    const largeInit = await tap.waitFor(
      "toWebview",
      (m) => m.type === "large/init",
      "large/init",
      60000
    );
    await waitFor(
      () =>
        largeInit.message.indexing === false ||
        tap
          .messagesOf("toWebview", "large/progress")
          .some((m) => m.kind === "index" && m.ratio === 1),
      "行インデックスの作成完了",
      10 * 60 * 1000
    );
    const before = memory();
    let jobId = 1_000_000;
    let reqId = 2_000_000;
    /** ジョブを渡し、ratio: 1 の進捗（終わり）までの時間 */
    const job = async (message: Record<string, unknown>) => {
      const id = jobId++;
      const began = performance.now();
      await tap.deliver({ ...message, jobId: id });
      await waitFor(
        () =>
          tap
            .messagesOf("toWebview", "large/progress")
            .some((m) => m.jobId === id && m.ratio === 1),
        `ジョブ ${String(message.type)} の終わり`,
        10 * 60 * 1000
      );
      const errors = tap.messagesOf("toWebview", "large/error").filter((m) => m.jobId === id);
      assert.deepStrictEqual(errors, []);
      const rowCount = tap.messagesOf("toWebview", "large/invalidate").at(-1)?.rowCount;
      return { ms: ms(performance.now() - began), rowCount, memory: memoryDelta(memory(), before) };
    };
    const roundTrips = async (rowCount: number) => {
      const samples: number[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        const id = reqId++;
        const began = performance.now();
        const start = Math.max(0, Math.floor(rowCount / 2) + i * 7919 - REQUEST_ROWS);
        await tap.deliver({ type: "large/getRows", reqId: id, start, count: REQUEST_ROWS });
        assert.ok(tap.messagesOf("toWebview", "large/rows").some((m) => m.reqId === id));
        samples.push(performance.now() - began);
      }
      return summarize(samples);
    };

    const filter = await job({ type: "large/filter", filters: [{ column: 2, text: "tokyo" }] });
    const filterSort = await job({ type: "large/sort", column: 3, direction: "asc" });
    const clearFilter = await job({ type: "large/filter", filters: [] });
    const sortedRowCount = clearFilter.rowCount as number;
    const sortedRows = await roundTrips(sortedRowCount);
    const searchSorted = await job({
      type: "large/search",
      query: "not-found",
      from: 0,
      direction: "forward",
    });
    const sortMixed = await job({ type: "large/sort", column: 1, direction: "desc" });
    const unsort = await job({ type: "large/sort", column: 1, direction: null });
    const searchFileOrder = await job({
      type: "large/search",
      query: "not-found",
      from: 0,
      direction: "forward",
    });
    const searchNear = await job({
      type: "large/search",
      query: "tokyo",
      from: 1000,
      direction: "forward",
    });

    // ワーカーのヒープ（拡張ホストの rss はプロセス全体なので、ワーカーを直接動かして測る）
    const index = RowIndex.build(file, { skipBom: true });
    const summary = await index.done;
    const client = new QueryWorkerClient(path.resolve(__dirname, "../../dist/largeCsvWorker.js"));
    const order = Float64Array.from({ length: summary.rowCount - 1 }, (_, i) => i + 1);
    const workerSort = async (column: number) => {
      const result = (await client.run({
        kind: "view",
        source: {
          filePath: file,
          encoding: BENCH_ENCODING === "shift_jis" ? "shift_jis" : "utf-8",
          starts: index.offsets(),
          summary,
        },
        rows: { order: order.slice(), edits: [] },
        filters: [],
        sort: { column, direction: "asc" },
      }).result) as ViewJobResult;
      return {
        sortKind: result.sortKind,
        readMs: ms(result.stats.readMs),
        totalMs: ms(result.stats.totalMs),
        peakHeapUsedMiB: mib(result.stats.peakHeapUsed),
      };
    };
    const workerMixed = await workerSort(1);
    const workerNumeric = await workerSort(3);
    await client.dispose();

    const report = {
      rowCount: sortedRowCount,
      filter,
      filterThenSort: filterSort,
      sortAllNumeric: clearFilter,
      sortedViewGetRows: sortedRows,
      searchNotFoundSorted: searchSorted,
      sortAllMixed: sortMixed,
      unsort,
      searchNotFoundFileOrder: searchFileOrder,
      searchNear,
      worker: { mixed: workerMixed, numeric: workerNumeric },
      memoryAtEnd: memoryDelta(memory(), before),
    };
    console.log(`[bench-query] ${JSON.stringify(report, null, 2)}`);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("500MBのファイルで範囲コピー・編集・保存・バックアップの時間とメモリを計測する", async () => {
    const tap = new WebviewTap();
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
    api.setPickerForTesting(new ScriptedPicker(BENCH_ENCODING));
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(file), LARGE);
    const largeInit = await tap.waitFor(
      "toWebview",
      (m) => m.type === "large/init",
      "large/init",
      60000
    );
    await waitFor(
      () =>
        largeInit.message.indexing === false ||
        tap
          .messagesOf("toWebview", "large/progress")
          .some((m) => m.kind === "index" && m.ratio === 1),
      "行インデックスの作成完了",
      10 * 60 * 1000
    );
    const cols = Number(BENCH_COLS);
    const rowCount =
      (tap.messagesOf("toWebview", "large/invalidate").at(-1)?.rowCount as number | undefined) ??
      (largeInit.message.rowCount as number);
    const before = memory();
    let reqId = 3_000_000;
    let revision = 0;
    for (const m of tap.messagesOf("toWebview", "large/init")) {
      revision = Math.max(revision, (m.revision as number | undefined) ?? 0);
    }

    // (a) 範囲コピー。10万セル（rows 行 x cols 列）を中ほど・末尾で各5回。
    //     1回の読み取りは MAX_ROWS_PER_REQUEST 行までなので、10万セルが1回で読めるかも記録する
    const getRange = async (startRow: number, rows: number) => {
      const id = reqId++;
      const began = performance.now();
      await tap.deliver({
        type: "large/getRange",
        reqId: id,
        range: { startRow, endRow: startRow + rows, startCol: 0, endCol: cols },
      });
      const elapsed = performance.now() - began;
      const response = tap.messagesOf("toWebview", "large/range").find((m) => m.reqId === id);
      const failure = tap.messagesOf("toWebview", "large/error").find((m) => m.reqId === id);
      if (!response) {
        return { error: String(failure?.message) };
      }
      assert.strictEqual((response.rows as unknown[]).length, rows);
      return { elapsed };
    };
    const measureRange = async (rows: number) => {
      const middle: number[] = [];
      const tail: number[] = [];
      for (let i = 0; i < 5; i++) {
        for (const [start, samples] of [
          [Math.floor(rowCount / 2) + i * 7919, middle],
          [rowCount - rows - i * 7919, tail],
        ] as const) {
          const result = await getRange(start, rows);
          if (result.error !== undefined) {
            return { rows, cells: rows * cols, error: result.error };
          }
          samples.push(result.elapsed);
        }
      }
      return { rows, cells: rows * cols, middle: summarize(middle), tail: summarize(tail) };
    };
    const rangeRows = Math.min(MAX_ROWS_PER_REQUEST, Math.floor(100_000 / cols));
    const rangeFull = await measureRange(Math.floor(100_000 / cols));
    const rangeCapped = await measureRange(rangeRows);
    const afterRange = memory();

    // (b) 編集1件 -> 保存（VSCode の保存コマンド。一時ファイルへ全体を書き出して置き換える）
    const id = reqId++;
    const target = Math.floor(rowCount / 2);
    await tap.deliver({ type: "large/getRows", reqId: id, start: target, count: 1 });
    const fetched = tap.messagesOf("toWebview", "large/rows").find((m) => m.reqId === id);
    assert.ok(fetched);
    const handle = (fetched.handles as number[])[0];
    const row = [...(fetched.rows as string[][])[0]];
    row[0] = "ベンチ編集";
    const activeTab = () => vscode.window.tabGroups.activeTabGroup.activeTab;
    const editBegan = performance.now();
    await tap.deliver({
      type: "large/applyOps",
      revision,
      ops: [{ type: "setRow", handle, row }],
    });
    const editMs = performance.now() - editBegan;
    await waitFor(() => activeTab()?.isDirty === true, "未保存になる");
    const saveBegan = performance.now();
    await vscode.commands.executeCommand("workbench.action.files.save");
    await waitFor(() => activeTab()?.isDirty === false, "保存が終わる", 10 * 60 * 1000);
    const saveMs = performance.now() - saveBegan;
    const afterSave = memory();
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");

    // (c) バックアップの書き出し（文書を直接開き、編集1件と、10万セル貼り付け相当の setRow を書き出す）
    const document = LargeCsvDocument.open(vscode.Uri.file(file), BENCH_ENCODING);
    await document.indexDone;
    const backupFile = path.join(path.dirname(file), "bench-backup.json");
    const backupOnce = async (ops: { type: "setRow"; handle: number; row: string[] }[]) => {
      assert.ok(await document.applyOps(ops));
      const began = performance.now();
      const data = await document.backupData();
      const dataMs = performance.now() - began;
      await writeLargeBackup(backupFile, data);
      return {
        ops: data.ops.length,
        backupDataMs: ms(dataMs),
        totalMs: ms(performance.now() - began),
        fileMiB: mib(fs.statSync(backupFile).size),
      };
    };
    const rows = await document.readDataRows(0, rangeRows);
    const backupSingle = await backupOnce([
      { type: "setRow", handle: rows.handles[0], row: ["a", ...rows.rows[0].slice(1)] },
    ]);
    const backupPaste = await backupOnce(
      rows.rows.map((r, i) => ({
        type: "setRow" as const,
        handle: rows.handles[i],
        row: r.map((cell) => `${cell}-p`),
      }))
    );
    document.dispose();
    fs.rmSync(backupFile, { force: true });

    const report = {
      encoding: BENCH_ENCODING,
      rowCount,
      getRangeFull100kCells: rangeFull,
      getRangeCappedAtRequestRows: rangeCapped,
      editOneRowMs: ms(editMs),
      saveAfterOneEditMs: ms(saveMs),
      backupAfterOneEdit: backupSingle,
      backupAfterPaste100kCells: backupPaste,
      memoryAfterRange: memoryDelta(afterRange, before),
      memoryAfterSave: memoryDelta(afterSave, before),
      memoryAtEnd: memoryDelta(memory(), before),
    };
    console.log(`[bench-edit] ${JSON.stringify(report, null, 2)}`);
  });
});
