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
import { ScriptedPicker } from "./helpers/fakePicker";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードの性能計測（プランの性能目標: 500MB・約500万行で、先頭行の表示まで3秒以内、
 * スクロール時の行取得200ms以内、拡張ホストのメモリ増加がファイルサイズ未満）。
 *
 * 通常の `npm test` では実行しない。`CSV_EDITOR_BENCH=1` のときだけ実行する:
 *   CSV_EDITOR_BENCH=1 npx vscode-test --grep "大容量モードの性能計測"
 * `CSV_EDITOR_BENCH_SIZE`（既定 500MB）・`CSV_EDITOR_BENCH_COLS`（既定 8）で生成する大きさを変えられる。
 * `CSV_EDITOR_BENCH_FILE` に CSV のパスを渡すとそれを使う（消さない）。無ければ
 * `scripts/bench/generate-large-csv.mjs` で 500MB を一時ディレクトリに生成し、計測後に消す。
 * 生成した直後のファイルは OS のページキャッシュに載っているので、計測値はウォームキャッシュの値。
 */

const LARGE = "csv-editor.largeEditor";
const MiB = 1024 * 1024;
const BENCH_SIZE = process.env.CSV_EDITOR_BENCH_SIZE ?? "500MB";
/** 列数（generate-large-csv.mjs の既定は 10 列で約400万行。8 列で約500万行） */
const BENCH_COLS = process.env.CSV_EDITOR_BENCH_COLS ?? "8";
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
      [script, "--size", BENCH_SIZE, "--cols", BENCH_COLS, "--out", file],
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
    api.setPickerForTesting(new ScriptedPicker("utf-8"));
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
    console.log(`[bench] ${JSON.stringify(report, null, 2)}`);

    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
});
