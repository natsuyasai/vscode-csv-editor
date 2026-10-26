/* global __dirname */
import * as assert from "assert";
import * as fs from "fs";
import * as iconv from "iconv-lite";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import type { LargeCsvDocument } from "../large/largeCsvDocument";
import type { LargeCsvEditorProviderOptions } from "../large/largeCsvEditorProvider";
import type { LargeEncoding } from "../large/largeEncoding";
import { PendingEncodings } from "../large/pendingEncodings";
import type { LargeOp } from "../message/largeMessages";
import { ScriptedPicker } from "./helpers/fakePicker";
import { openLargeEditor, settle, waitUntil } from "./helpers/largeProviderHarness";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードの未保存変更とファイルの外部変更（largeBackup.feature）。
 *
 * - バックアップと復元: provider の backupCustomDocument で書き出し、新しい provider の openCustomDocument に
 *   backupId を渡して開き直す（Hot Exit・ウィンドウの再読み込みは実際には起こせないため。実際の復元は手動で確認する）
 * - 外部変更: 実ファイルを書き換え・削除し、provider が張った FileSystemWatcher のイベントで反応するのを待つ
 * - 未保存の変更を破棄して再読み込みしたときにタブが未保存でなくなることは、実際の拡張機能（dist）と webview で確かめる
 */

const LARGE = "csv-editor.largeEditor";
const workerPath = path.resolve(__dirname, "../../dist/largeCsvWorker.js");

/** ヘッダー＋データ n 行の CSV（データ行 i は "{prefix}{i},v{i}"） */
const csvWithRows = (n: number, prefix = "r", header = "h1,h2") =>
  header +
  "\n" +
  Array.from({ length: n }, (_, i) => `${prefix}${String(i)},v${String(i)}\n`).join("");

/** 大きなファイル（実行中のジョブを取り消す。ワーカーは1行ずつ読み、ソートに数秒かかるように調整する） */
const bigCsv = (n: number) =>
  "id,name\n" +
  Array.from({ length: n }, (_, i) => `r${String(i)},n${String((i * 7919) % n)}\n`).join("");
const BIG_ROWS = 100000;
const SLOW_TUNING = { batchRows: 1, progressIntervalMs: 0 };

/** FileSystemWatcher が監視を始めるまでの猶予 */
const WATCH_READY_MS = 1000;
/** 反応しないことを確かめるときに待つ時間 */
const QUIET_MS = 1500;

const token: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

async function getApi(): Promise<CsvEditorTestingApi> {
  const extension = vscode.extensions.getExtension<CsvEditorTestingApi | undefined>(
    "natsuyasai.csv-editor"
  );
  assert.ok(extension, "csv-editor 拡張機能が読み込まれている");
  const api = await extension.activate();
  assert.ok(api, "テストモードでは API が公開される");
  return api;
}

const activeTab = () => vscode.window.tabGroups.activeTabGroup.activeTab;

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

suite("大容量モードの未保存変更とファイルの外部変更", function () {
  this.timeout(60000);
  let api: CsvEditorTestingApi;
  let dir = "";
  let opened: { close: () => Promise<void> }[] = [];
  let backupSerial = 0;
  let jobId = 0;

  const filePath = (name: string) => path.join(dir, name);

  const writeFile = (name: string, data: string | Uint8Array): vscode.Uri => {
    fs.writeFileSync(filePath(name), data);
    return vscode.Uri.file(filePath(name));
  };

  const readText = (uri: vscode.Uri) => fs.readFileSync(uri.fsPath, "utf8");

  interface HarnessParams {
    /** 入口で選んだ文字コード（省略は utf-8。null なら保留オプションに入れない） */
    encoding?: LargeEncoding | null;
    /** 選択（文字コード・警告）への答え */
    answers?: unknown[];
    backupId?: string;
    extra?: Partial<LargeCsvEditorProviderOptions>;
  }

  /** モックの webview / panel で provider を直接駆動する（FileSystemWatcher は本物） */
  const openHarness = async (uri: vscode.Uri, params: HarnessParams = {}) => {
    const pending = new PendingEncodings();
    if (params.encoding !== null) {
      pending.set(uri, params.encoding ?? "utf-8");
    }
    const picker = new ScriptedPicker(...(params.answers ?? []));
    const warns: string[] = [];
    const errors: string[] = [];
    let revert: () => Promise<void> = () => Promise.resolve();
    const editor = await openLargeEditor(
      uri,
      {
        picker,
        pending,
        warn: (message) => warns.push(message),
        error: (message) => errors.push(message),
        info: () => {},
        // VSCode の revert の代わりに provider の revert を呼ぶ（モックの panel はタブを持たない）
        revertInEditor: () => revert(),
        externalChangeDelayMs: 50,
        ...params.extra,
        document: { workerPath, ...params.extra?.document },
      },
      { backupId: params.backupId, untitledDocumentData: undefined }
    );
    opened.push(editor);
    const document = editor.document as LargeCsvDocument;
    revert = () => editor.provider.revertCustomDocument(document, token);
    await editor.send({ type: "init" });
    await document.indexDone.catch(() => undefined);
    await settle();
    let reqId = 1000;
    /** 表示位置 [start, start + count) の行を webview と同じ要求で読む */
    const rows = async (start = 0, count = 100) => {
      const id = ++reqId;
      await editor.send({ type: "large/getRows", reqId: id, start, count });
      const response = editor.posted.find((m) => m.type === "large/rows" && m.reqId === id);
      assert.ok(response, "large/rows が返る");
      return response.rows as string[][];
    };
    const revision = () =>
      editor.posted
        .filter((m) => m.type === "large/init" || m.type === "large/invalidate")
        .map((m) => (m.revision as number | undefined) ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
    const apply = (ops: LargeOp[]) =>
      editor.send({ type: "large/applyOps", revision: revision(), ops });
    const backup = async () => {
      const destination = vscode.Uri.file(
        path.join(dir, "backups", `backup-${String(++backupSerial)}`)
      );
      return editor.provider.backupCustomDocument(document, { destination }, token);
    };
    const initCount = () => editor.posted.filter((m) => m.type === "large/init").length;
    /** 再読み込み（2回目以降の large/init）が送られ、作成が終わるまで待つ */
    const waitReloaded = async (count = 2) => {
      await waitUntil(() => initCount() >= count, 20000);
      await waitUntil(() => !document.indexing, 20000);
      await settle();
    };
    const save = () => editor.provider.saveCustomDocument(document, token);
    return {
      ...editor,
      document,
      picker,
      warns,
      errors,
      rows,
      apply,
      backup,
      initCount,
      waitReloaded,
      save,
    };
  };

  /** バックアップから開き直し、復元（作成完了後の op の適用）が済むまで待つ */
  const reopenFromBackup = async (
    uri: vscode.Uri,
    backupId: string,
    params: Omit<HarnessParams, "backupId"> = {}
  ) => {
    const editor = await openHarness(uri, { encoding: null, ...params, backupId });
    await waitUntil(() => editor.document.restoreSettled, 20000);
    await settle();
    return editor;
  };

  /** 5行のファイルを開き、2行目のセルを編集してバックアップする */
  const editAndBackup = async (name: string) => {
    const uri = writeFile(name, csvWithRows(5));
    const editor = await openHarness(uri);
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    const backup = await editor.backup();
    await editor.close();
    return { uri, backup };
  };

  suiteSetup(async () => {
    api = await getApi();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-backup-"));
  });

  setup(async () => {
    await closeAllEditorsAndWait();
    opened = [];
  });

  teardown(async () => {
    for (const editor of opened) {
      await editor.close();
    }
    await closeAllEditorsAndWait();
  });

  suiteTeardown(() => {
    api.setPickerForTesting(undefined);
    api.setLargeEditorForTesting(undefined);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  test("未保存の変更がHot Exit後に復元される", async () => {
    const uri = writeFile(
      "restore.csv",
      iconv.encode(csvWithRows(5, "名", "名前,値"), "shift_jis")
    );
    const editor = await openHarness(uri, { encoding: "shift_jis" });
    await editor.apply([{ type: "setRow", handle: 2, row: ["編集", "あ"] }]);
    await editor.apply([
      { type: "insertRows", beforeHandle: 4, handles: [-1], rows: [["新", "行"]] },
    ]);
    await editor.apply([{ type: "setHeader", header: ["名前", "値2"] }]);
    const before = await editor.rows();
    const backup = await editor.backup();
    await editor.close();

    const restored = await reopenFromBackup(uri, backup.id);

    assert.strictEqual(restored.picker.calls.length, 0, "文字コードは尋ねられない");
    assert.strictEqual(restored.document.encoding, "shift_jis");
    assert.deepStrictEqual(restored.errors, []);
    assert.deepStrictEqual(await restored.rows(), before);
    assert.deepStrictEqual(restored.document.currentHeader, ["名前", "値2"]);
    assert.strictEqual(
      restored.document.nextHandle,
      -2,
      "復元した追加行のハンドルと重ならないよう、次の追加行のハンドルが進む"
    );
  });

  test("復元した文書は未保存の状態になり、Undoで復元前に戻せる", async () => {
    const { uri, backup } = await editAndBackup("restore-undo.csv");

    const restored = await reopenFromBackup(uri, backup.id);

    assert.strictEqual(restored.edits.length, 1, "復元した変更は1件の編集");
    assert.strictEqual(restored.document.isDirty, true);
    assert.deepStrictEqual((await restored.rows(1, 1))[0], ["r1", "編集"]);

    await restored.edits[0].undo();
    await settle();
    assert.strictEqual(restored.document.isDirty, false);
    assert.deepStrictEqual((await restored.rows(1, 1))[0], ["r1", "v1"]);
  });

  test("元ファイルが変わっていたら復元前に警告する", async () => {
    const { uri, backup } = await editAndBackup("restore-changed.csv");
    writeFile("restore-changed.csv", csvWithRows(7, "x"));

    const restored = await reopenFromBackup(uri, backup.id, { answers: ["discard"] });

    assert.strictEqual(restored.picker.calls.length, 1, "警告で選択を求める");
    assert.deepStrictEqual(restored.picker.valuesOf(0), ["apply", "discard"]);
    const { title, placeHolder } = restored.picker.calls[0].options;
    assert.match(`${title ?? ""} ${placeHolder ?? ""}`, /別の行/, "行がずれるおそれを示す");
    assert.strictEqual(restored.document.isDirty, false);
    assert.strictEqual(restored.edits.length, 0);
    assert.deepStrictEqual((await restored.rows()).slice(0, 2), [
      ["x0", "v0"],
      ["x1", "v1"],
    ]);
    assert.strictEqual(restored.document.dataRowCount, 7);
  });

  test("元ファイルが変わっていても適用を選べば変更を当てて開く", async () => {
    const { uri, backup } = await editAndBackup("restore-apply.csv");
    writeFile("restore-apply.csv", csvWithRows(7, "x"));

    const restored = await reopenFromBackup(uri, backup.id, { answers: ["apply"] });

    assert.strictEqual(restored.picker.calls.length, 1);
    assert.strictEqual(restored.document.isDirty, true);
    assert.strictEqual(restored.edits.length, 1);
    assert.deepStrictEqual((await restored.rows()).slice(0, 3), [
      ["x0", "v0"],
      ["r1", "編集"],
      ["x2", "v2"],
    ]);
  });

  test("復元前の警告を閉じた場合は変更を適用して開く", async () => {
    const { uri, backup } = await editAndBackup("restore-esc.csv");
    writeFile("restore-esc.csv", csvWithRows(7, "x"));

    // 答えが無い ScriptedPicker は Esc（undefined）を返す
    const restored = await reopenFromBackup(uri, backup.id, { answers: [] });

    assert.strictEqual(restored.picker.calls.length, 1);
    assert.strictEqual(restored.document.isDirty, true);
    assert.deepStrictEqual((await restored.rows(1, 1))[0], ["r1", "編集"]);
  });

  test("別名で保存した文書は保存先のファイルから復元される", async () => {
    const uri = writeFile("saveas-src.csv", csvWithRows(5));
    const destination = vscode.Uri.file(filePath("saveas-dst.csv"));
    const editor = await openHarness(uri);
    await editor.provider.saveCustomDocumentAs(editor.document, destination, token);
    // 元のファイルは別の内容にする（保存先から読んでいることを確かめる）
    writeFile("saveas-src.csv", csvWithRows(3, "src"));
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    const backup = await editor.backup();
    await editor.close();

    const restored = await reopenFromBackup(uri, backup.id);

    assert.strictEqual(restored.picker.calls.length, 0, "保存先は変わっていないので警告しない");
    assert.strictEqual(restored.document.uri.fsPath, uri.fsPath, "uri は VSCode が開いたまま");
    assert.strictEqual(restored.document.fileUri.fsPath, destination.fsPath);
    assert.deepStrictEqual((await restored.rows()).slice(0, 3), [
      ["r0", "v0"],
      ["r1", "編集"],
      ["r2", "v2"],
    ]);
    assert.strictEqual(restored.document.isDirty, true);
  });

  test("バックアップが壊れていたら変更を破棄して開く", async () => {
    const uri = writeFile("broken.csv", csvWithRows(5));
    fs.mkdirSync(path.join(dir, "backups"), { recursive: true });
    const broken = path.join(dir, "backups", "broken.json");
    fs.writeFileSync(broken, '{"version": 1, "ops": [');

    const restored = await reopenFromBackup(uri, vscode.Uri.file(broken).toString(), {
      encoding: "utf-8",
    });

    assert.strictEqual(restored.errors.length, 1);
    assert.match(restored.errors[0], /バックアップ/);
    assert.strictEqual(restored.document.isDirty, false);
    assert.strictEqual(restored.edits.length, 0);
    assert.deepStrictEqual(
      await restored.rows(),
      csvWithRows(5)
        .trim()
        .split("\n")
        .slice(1)
        .map((l) => l.split(","))
    );
  });

  test("バックアップの変更を当てられなければ変更を破棄して開く", async () => {
    const uri = writeFile("unapplicable.csv", csvWithRows(5));
    const stat = fs.statSync(uri.fsPath);
    fs.mkdirSync(path.join(dir, "backups"), { recursive: true });
    const file = path.join(dir, "backups", "unapplicable.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        fileUri: uri.toString(),
        encoding: "utf-8",
        source: { mtimeMs: stat.mtimeMs, size: stat.size },
        ops: [
          { type: "setRow", handle: 2, row: ["当たる"] },
          { type: "setRow", handle: 99, row: ["存在しない行"] },
        ],
      })
    );

    const restored = await reopenFromBackup(uri, vscode.Uri.file(file).toString());

    assert.strictEqual(restored.picker.calls.length, 0);
    assert.strictEqual(restored.errors.length, 1);
    assert.match(restored.errors[0], /破棄/);
    assert.strictEqual(restored.document.isDirty, false);
    assert.strictEqual(restored.edits.length, 0);
    assert.deepStrictEqual(
      (await restored.rows(1, 1))[0],
      ["r1", "v1"],
      "途中まで当てた変更も残らない"
    );
  });

  test("バックアップを削除するとバックアップのファイルが消える", async () => {
    const { backup } = await editAndBackup("delete-backup.csv");
    const file = vscode.Uri.parse(backup.id).fsPath;
    assert.ok(fs.existsSync(file), "バックアップのファイルが書き出されている");

    backup.delete();
    await waitUntil(() => !fs.existsSync(file));
  });

  test("未保存の変更がなければ外部変更で再読み込みする", async () => {
    const uri = writeFile("external.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await sleep(WATCH_READY_MS);

    writeFile("external.csv", csvWithRows(8, "x", "c1,c2"));
    await editor.waitReloaded();

    assert.strictEqual(editor.picker.calls.length, 0, "選択は求めない");
    const init = editor.posted.filter((m) => m.type === "large/init").at(-1);
    assert.ok(init);
    assert.deepStrictEqual(init.header, ["c1", "c2"]);
    assert.deepStrictEqual(init.query, { sort: null, filters: [] });
    assert.strictEqual(editor.document.dataRowCount, 8);
    const rows = await editor.rows();
    assert.strictEqual(rows.length, 8);
    assert.deepStrictEqual(rows[7], ["x7", "v7"]);
    assert.strictEqual(editor.document.isDirty, false);
  });

  test("外部変更で再読み込みするとソート・フィルタを解除し、実行中のジョブを取り消す", async () => {
    const uri = writeFile("external-job.csv", bigCsv(BIG_ROWS));
    const editor = await openHarness(uri, {
      extra: { document: { workerPath, queryTuning: SLOW_TUNING } },
    });
    const progressOf = (id: number, done: boolean) =>
      waitUntil(
        () =>
          editor.posted.some(
            (m) =>
              m.type === "large/progress" &&
              m.jobId === id &&
              (done ? m.ratio === 1 : (m.ratio as number) < 1)
          ),
        20000
      );
    const first = ++jobId;
    await editor.send({ type: "large/sort", jobId: first, column: 1, direction: "asc" });
    await progressOf(first, true);
    assert.deepStrictEqual(editor.document.queryState.sort, { column: 1, direction: "asc" });
    await sleep(WATCH_READY_MS);
    const second = ++jobId;
    await editor.send({ type: "large/sort", jobId: second, column: 0, direction: "desc" });
    await progressOf(second, false);

    // 末尾に追記する（走査中のワーカーが読む範囲は変わらないので、ワーカー自身は失敗しない）
    fs.appendFileSync(uri.fsPath, "r20000,added\n");
    await editor.waitReloaded();
    await progressOf(second, true);

    const errors = editor.posted.filter((m) => m.type === "large/error" && m.jobId === second);
    assert.strictEqual(errors.length, 1, "実行中のソートは取り消されたことが伝えられる");
    assert.match(errors[0].message as string, /読み直/);
    const init = editor.posted.filter((m) => m.type === "large/init").at(-1);
    assert.deepStrictEqual(init?.query, { sort: null, filters: [] });
    assert.deepStrictEqual(editor.document.queryState, { sort: null, filters: [] });
    assert.strictEqual(editor.document.dataRowCount, BIG_ROWS + 1, "追記した行も読み直す");
    assert.deepStrictEqual(
      (await editor.rows(0, 3)).map((row) => row[0]),
      ["r0", "r1", "r2"],
      "ファイルの順"
    );
  });

  test("未保存の変更があれば外部変更時に選択を求める", async () => {
    // 実際の拡張機能と webview で、タブの未保存の状態が戻ることまで確かめる
    const tap = new WebviewTap();
    const picker = new ScriptedPicker("utf-8", "reload");
    api.setPickerForTesting(picker);
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
    try {
      const uri = writeFile("external-dirty.csv", csvWithRows(5));
      await vscode.commands.executeCommand("vscode.openWith", uri, LARGE);
      const init = (await tap.waitFor("toWebview", (m) => m.type === "large/init", "large/init"))
        .message;
      if (init.indexing === true) {
        await tap.waitFor(
          "toWebview",
          (m) => m.type === "large/progress" && m.ratio === 1,
          "行インデックスの作成完了"
        );
      }
      const request = (
        await tap.waitFor(
          "toExtension",
          (m) => m.type === "large/getRows" && m.start === 0,
          "webview の先頭行の要求"
        )
      ).message;
      await tap.waitFor(
        "toWebview",
        (m) => m.type === "large/rows" && m.reqId === request.reqId,
        "先頭行の応答"
      );
      const revision = tap
        .messagesOf("toWebview", "large/init")
        .concat(tap.messagesOf("toWebview", "large/invalidate"))
        .map((m) => (m.revision as number | undefined) ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
      await tap.deliver({
        type: "large/applyOps",
        revision,
        ops: [{ type: "setRow", handle: 2, row: ["r1", "編集"] }],
      });
      await waitFor(() => activeTab()?.isDirty === true, "タブが未保存になる");
      await sleep(WATCH_READY_MS);

      writeFile("external-dirty.csv", csvWithRows(6, "x"));
      await waitFor(() => picker.calls.length >= 2, "選択を求める");
      assert.deepStrictEqual(picker.valuesOf(1), ["reload", "keep"]);
      await waitFor(() => activeTab()?.isDirty === false, "タブが未保存でなくなる");
      await waitFor(
        () => tap.messagesOf("toWebview", "large/init").length >= 2,
        "画面に初期化が送り直される"
      );

      await waitFor(() => {
        const inits = tap.messagesOf("toWebview", "large/init");
        const progress = tap.messagesOf("toWebview", "large/progress");
        return inits.at(-1)?.indexing === false || progress.some((m) => m.ratio === 1);
      }, "読み直しの作成完了");
      const reqId = 987654;
      await tap.deliver({ type: "large/getRows", reqId, start: 0, count: 10 });
      const response = await tap.waitFor(
        "toWebview",
        (m) => m.type === "large/rows" && m.reqId === reqId,
        "読み直した行"
      );
      assert.deepStrictEqual(
        response.message.rows,
        csvWithRows(6, "x")
          .trim()
          .split("\n")
          .slice(1)
          .map((l) => l.split(",")),
        "変更は破棄され、変更後のファイルの内容になる"
      );
      assert.deepStrictEqual(picker.mismatches, []);
    } finally {
      api.setPickerForTesting(undefined);
      api.setLargeEditorForTesting(undefined);
    }
  });

  test("外部変更時に自分の変更を保持すると変更後のファイルに当て直す", async () => {
    const uri = writeFile("external-keep.csv", csvWithRows(5));
    const editor = await openHarness(uri, { answers: ["keep"] });
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await sleep(WATCH_READY_MS);

    writeFile("external-keep.csv", csvWithRows(6, "x"));
    await editor.waitReloaded();
    await waitUntil(() => editor.edits.length >= 2, 20000);
    await settle();

    assert.strictEqual(editor.picker.calls.length, 1);
    assert.deepStrictEqual(editor.picker.valuesOf(0), ["reload", "keep"]);
    assert.deepStrictEqual(editor.errors, []);
    assert.deepStrictEqual((await editor.rows()).slice(0, 3), [
      ["x0", "v0"],
      ["r1", "編集"],
      ["x2", "v2"],
    ]);
    assert.strictEqual(editor.document.isDirty, true);

    await editor.save();
    assert.strictEqual(readText(uri), csvWithRows(6, "x").replace("x1,v1", "r1,編集"));
  });

  test("外部変更で読み直した後は、読み直しより前の編集を元に戻せないことが知らされる", async () => {
    const uri = writeFile("external-undo.csv", csvWithRows(5));
    const infos: string[] = [];
    const editor = await openHarness(uri, {
      answers: ["keep"],
      extra: { info: (message) => infos.push(message) },
    });
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await sleep(WATCH_READY_MS);

    writeFile("external-undo.csv", csvWithRows(6, "x"));
    await editor.waitReloaded();
    await waitUntil(() => editor.edits.length >= 2, 20000);
    await settle();

    await editor.edits[0].undo();

    assert.deepStrictEqual((await editor.rows(1, 1))[0], ["r1", "編集"], "当て直した変更は残る");
    assert.strictEqual(editor.document.isDirty, true);
    assert.strictEqual(infos.length, 1);
    assert.match(infos[0], /ファイルの読み直しより前の編集は元に戻せません/);
  });

  test("自分の保存では再読み込みしない", async () => {
    const uri = writeFile("self-save.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await sleep(WATCH_READY_MS);

    await editor.save();
    await sleep(QUIET_MS);

    assert.strictEqual(editor.picker.calls.length, 0, "選択は求めない");
    assert.strictEqual(editor.initCount(), 1, "読み直さない");
    assert.deepStrictEqual((await editor.rows(1, 1))[0], ["r1", "編集"]);

    // 監視は続いている
    writeFile("self-save.csv", csvWithRows(7, "x"));
    await editor.waitReloaded();
    assert.strictEqual(editor.document.dataRowCount, 7);
  });

  test("外部で削除されたら警告する", async () => {
    const uri = writeFile("deleted.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await sleep(WATCH_READY_MS);

    fs.unlinkSync(uri.fsPath);
    await waitUntil(() => editor.warns.length > 0, 20000);
    await sleep(QUIET_MS);

    assert.strictEqual(editor.warns.length, 1, "一度だけ警告する");
    assert.match(editor.warns[0], /削除/);
    assert.strictEqual(editor.picker.calls.length, 0);
    assert.strictEqual(editor.initCount(), 1, "読み直さない");
    assert.match(editor.warns[0], /保存/, "保存できないことも伝える");

    // 元の行をコピーするファイルが無いので保存は失敗する（作り直さない。既知の制約）
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await assert.rejects(editor.save());
    assert.strictEqual(fs.existsSync(uri.fsPath), false);
    assert.strictEqual(editor.document.isDirty, true, "編集内容は残る");
  });
});
