import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import type { LargeCsvDocument } from "../large/largeCsvDocument";
import type { LargeCsvEditorProviderOptions } from "../large/largeCsvEditorProvider";
import type { LargeEncoding } from "../large/largeEncoding";
import { PendingEncodings } from "../large/pendingEncodings";
import type { LargeOp } from "../message/largeMessages";
import { ControlledRowIndex } from "./helpers/controlledRowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { openLargeEditor, settle, waitUntil } from "./helpers/largeProviderHarness";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードでの編集と保存（largeEdit.feature）。
 *
 * - VSCode の保存・Undo/Redo との連動は、実際に読み込まれた拡張機能（dist）を `vscode.openWith` で開き、
 *   実際の webview（webview-ui/build）とのやり取りを WebviewTap で観測して確かめる。
 *   webview の DOM は操作できないので、編集は webview と同じ形の `large/applyOps` を tap から渡して模擬する
 * - それ以外（保存の失敗・保存中の編集・別名で保存・revert など）は、モックの webview / panel で provider を直接駆動する
 *   （保存ダイアログや rename の失敗は実際の画面では起こせないため）
 */

const LARGE = "csv-editor.largeEditor";

/** ヘッダー＋データ n 行の CSV（データ行 i は "r{i},v{i}"） */
const csvWithRows = (n: number) =>
  "h1,h2\n" + Array.from({ length: n }, (_, i) => `r${String(i)},v${String(i)}\n`).join("");

type Message = { type?: unknown; [key: string]: unknown };

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
  // 未保存の大容量モードのタブがあると閉じるときに確認が出るので、先に元に戻す（未保存のまま終わるのはアクティブなタブだけ）
  if (vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => tab.isDirty))) {
    await vscode.commands.executeCommand("workbench.action.files.revert");
  }
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await waitFor(
    () => vscode.window.tabGroups.all.every((group) => group.tabs.length === 0),
    "全タブが閉じる"
  );
}

suite("大容量モードでの編集と保存", function () {
  this.timeout(60000);
  let api: CsvEditorTestingApi;
  let dir = "";
  let tap: WebviewTap;
  let picker: ScriptedPicker;
  let opened: { close: () => Promise<void> }[] = [];

  const filePath = (name: string) => path.join(dir, name);

  const writeFile = (name: string, data: string | Uint8Array): vscode.Uri => {
    fs.writeFileSync(filePath(name), data);
    return vscode.Uri.file(filePath(name));
  };

  const readText = (uri: vscode.Uri) => fs.readFileSync(uri.fsPath, "utf8");

  // ---- 実際の拡張機能と webview ----

  /** 大容量モードで開き、行インデックスの作成が終わり、webview が先頭行を受け取るまで待つ */
  const openInWebview = async (uri: vscode.Uri) => {
    picker = new ScriptedPicker("utf-8");
    api.setPickerForTesting(picker);
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
  };

  /** webview から届いたかのように編集を渡し、その後の invalidate を待つ */
  const deliverOps = async (ops: LargeOp[]) => {
    const from = tap.log.length;
    // webview と同じく、最後に受け取った large/init / large/invalidate の revision を添える
    const revision = tap.log
      .filter(
        (m) =>
          m.direction === "toWebview" &&
          (m.message.type === "large/init" || m.message.type === "large/invalidate")
      )
      .map((m) => (m.message.revision as number | undefined) ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);
    await tap.deliver({ type: "large/applyOps", revision, ops });
    await waitFor(
      () =>
        tap.log
          .slice(from)
          .some((m) => m.direction === "toWebview" && m.message.type === "large/invalidate"),
      "編集後の invalidate"
    );
  };

  /** log の from 以降に、実際の webview が取り直した先頭の行（large/rows）を待つ */
  const waitRefetchedRows = async (from: number, what: string) => {
    let rows: string[][] | undefined;
    await waitFor(() => {
      const invalidated = tap.log.findIndex(
        (m, i) => i >= from && m.direction === "toWebview" && m.message.type === "large/invalidate"
      );
      if (invalidated < 0) {
        return false;
      }
      const requests = tap.log
        .slice(invalidated)
        .filter((m) => m.direction === "toExtension" && m.message.type === "large/getRows")
        .map((m) => m.message.reqId);
      const response = tap.log
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
    }, what);
    return rows as string[][];
  };

  // ---- モックの webview / panel で provider を直接駆動する ----

  const openHarness = async (
    uri: vscode.Uri,
    encoding: LargeEncoding = "utf-8",
    extra: Partial<LargeCsvEditorProviderOptions> = {}
  ) => {
    const pending = new PendingEncodings();
    pending.set(uri, encoding);
    const editor = await openLargeEditor(uri, {
      picker: new ScriptedPicker(),
      pending,
      ...extra,
    });
    opened.push(editor);
    const document = editor.document as LargeCsvDocument;
    // 作成の進み方を制御するときは、1行目が確定するまで init の応答が返らないので待たない
    const initDone = editor.send({ type: "init" });
    if (!extra.document?.buildIndex) {
      await initDone;
      await document.indexDone;
      await settle();
    }
    let reqId = 1000;
    /** 表示位置 [start, start + count) の行を webview と同じ要求で読む */
    const rows = async (start = 0, count = 100) => {
      const id = ++reqId;
      await editor.send({ type: "large/getRows", reqId: id, start, count });
      const response = editor.posted.find((m) => m.type === "large/rows" && m.reqId === id);
      assert.ok(response, "large/rows が返る");
      return { rows: response.rows as string[][], handles: response.handles as number[] };
    };
    /** 画面が持っている revision（最後に受け取った large/init / large/invalidate の revision） */
    const revision = () =>
      editor.posted
        .filter((m) => m.type === "large/init" || m.type === "large/invalidate")
        .map((m) => (m.revision as number | undefined) ?? 0)
        .reduce((a, b) => Math.max(a, b), 0);
    /** webview と同じ形で編集を送る。revision はハンドルを得たときの値（省略は現在の値） */
    const apply = (ops: LargeOp[], at: number = revision()) =>
      editor.send({ type: "large/applyOps", revision: at, ops });
    const save = () => editor.provider.saveCustomDocument(document, editor.token);
    return { ...editor, document, pending, initDone, rows, apply, save, revision };
  };

  const lastOf = (posted: Message[], type: string) => posted.filter((m) => m.type === type).at(-1);

  suiteSetup(async () => {
    api = await getApi();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-edit-"));
  });

  setup(async () => {
    await closeAllEditorsAndWait();
    tap = new WebviewTap();
    picker = new ScriptedPicker();
    opened = [];
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
  });

  teardown(async () => {
    for (const editor of opened) {
      await editor.close();
    }
    assert.deepStrictEqual(picker.mismatches, [], "答えはすべて選択肢にある");
    api.setPickerForTesting(new ScriptedPicker());
    await closeAllEditorsAndWait();
    api.setLargeEditorForTesting(undefined);
  });

  suiteTeardown(() => {
    api.setPickerForTesting(undefined);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  test("セルを編集して保存すると該当行だけが変わる", async () => {
    const uri = writeFile("save.csv", csvWithRows(5));
    await openInWebview(uri);

    // 3行目（ファイル上の行3）のセルを編集する
    await deliverOps([{ type: "setRow", handle: 3, row: ["r2", "編集"] }]);
    await waitFor(() => activeTab()?.isDirty === true, "タブが未保存になる");
    assert.strictEqual(readText(uri), csvWithRows(5), "保存するまでファイルは変わらない");

    const from = tap.log.length;
    await vscode.commands.executeCommand("workbench.action.files.save");
    await waitFor(() => activeTab()?.isDirty === false, "保存してタブが未保存でなくなる");

    assert.strictEqual(
      readText(uri),
      "h1,h2\nr0,v0\nr1,v1\nr2,編集\nr3,v3\nr4,v4\n",
      "3行目だけが変わる"
    );
    const rows = await waitRefetchedRows(from, "保存後に webview が取り直した行");
    assert.deepStrictEqual(rows.slice(0, 5), [
      ["r0", "v0"],
      ["r1", "v1"],
      ["r2", "編集"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
  });

  test("編集していない行のバイト列は保存後も変わらない", async () => {
    const original = 'h1,h2\r\n"a",b\r\n,""\r\n"x""y",z\r\n"q",\r\n';
    const uri = writeFile("bytes.csv", original);
    const editor = await openHarness(uri);

    await editor.apply([{ type: "setRow", handle: 2, row: ["E", "F"] }]);
    await editor.save();

    assert.strictEqual(readText(uri), 'h1,h2\r\n"a",b\r\nE,F\r\n"x""y",z\r\n"q",\r\n');
  });

  test("ヘッダーを編集して保存できる", async () => {
    const uri = writeFile("header.csv", csvWithRows(5));
    const editor = await openHarness(uri);

    await editor.apply([{ type: "setHeader", header: ["h1", "列名"] }]);
    const invalidate = lastOf(editor.posted, "large/invalidate");
    assert.deepStrictEqual(invalidate?.header, ["h1", "列名"], "画面に新しい列名が伝えられる");
    await editor.save();

    assert.strictEqual(readText(uri), csvWithRows(5).replace("h1,h2", "h1,列名"));
    await editor.send({ type: "init" });
    assert.deepStrictEqual(lastOf(editor.posted, "large/init")?.header, ["h1", "列名"]);
  });

  test("行の挿入と削除を保存できる", async () => {
    const uri = writeFile("rows.csv", csvWithRows(5));
    const editor = await openHarness(uri);

    await editor.apply([
      { type: "insertRows", beforeHandle: 2, handles: [-1], rows: [["n1", "n2"]] },
    ]);
    // 挿入後の4行目は r2（ハンドル3）
    await editor.apply([{ type: "deleteRows", handles: [3] }]);
    await editor.save();

    assert.strictEqual(readText(uri), "h1,h2\nr0,v0\nn1,n2\nr1,v1\nr3,v3\nr4,v4\n");
    const { rows, handles } = await editor.rows();
    assert.deepStrictEqual(rows, [
      ["r0", "v0"],
      ["n1", "n2"],
      ["r1", "v1"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
    assert.deepStrictEqual(handles, [1, 2, 3, 4, 5], "保存後のハンドルは保存したファイルの行番号");
  });

  test("Undoで編集前に戻り、Redoでやり直せる", async () => {
    const uri = writeFile("undo.csv", csvWithRows(5));
    await openInWebview(uri);

    await deliverOps([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await waitFor(() => activeTab()?.isDirty === true, "タブが未保存になる");

    let from = tap.log.length;
    await vscode.commands.executeCommand("undo");
    let rows = await waitRefetchedRows(from, "Undo 後に webview が取り直した行");
    assert.deepStrictEqual(rows[1], ["r1", "v1"], "編集前に戻る");
    await waitFor(() => activeTab()?.isDirty === false, "Undo で未保存でなくなる");

    from = tap.log.length;
    await vscode.commands.executeCommand("redo");
    rows = await waitRefetchedRows(from, "Redo 後に webview が取り直した行");
    assert.deepStrictEqual(rows[1], ["r1", "編集"], "やり直す");
    await waitFor(() => activeTab()?.isDirty === true, "Redo で再び未保存になる");
    assert.strictEqual(readText(uri), csvWithRows(5), "ファイルは変わらない");
  });

  test("保存中に失敗しても元ファイルは壊れない", async () => {
    const uri = writeFile("fail.csv", csvWithRows(5));
    const editor = await openHarness(uri, "utf-8", {
      document: {
        writer: {
          rename: () => Promise.reject(new Error("置き換えに失敗しました（テスト）")),
        },
      },
    });
    await editor.apply([{ type: "setRow", handle: 1, row: ["r0", "編集"] }]);

    await assert.rejects(editor.save(), /置き換えに失敗しました（テスト）/);

    assert.strictEqual(readText(uri), csvWithRows(5), "元のファイルは変わらない");
    assert.strictEqual(
      fs.readdirSync(dir).filter((name) => name.endsWith(".tmp")).length,
      0,
      "一時ファイルは残らない"
    );
    assert.strictEqual(editor.document.isDirty, true, "未保存のまま");
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows, [
      ["r0", "編集"],
      ["r1", "v1"],
      ["r2", "v2"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
  });

  test("指定した文字コードで保存される", async () => {
    const cases: { encoding: LargeEncoding; kept: number[]; edited: string[]; bytes: number[] }[] =
      [
        {
          // 「あ」82 A0、「漢」8A BF、「①」87 40、「ｱ」B1
          encoding: "shift_jis",
          kept: [0x61, 0x2c, 0x82, 0xa0],
          edited: ["漢", "①ｱ"],
          bytes: [0x8a, 0xbf, 0x2c, 0x87, 0x40, 0xb1],
        },
        {
          // 「あ」A4 A2、「漢」B4 C1、「ｱ」8E B1
          encoding: "euc-jp",
          kept: [0x61, 0x2c, 0xa4, 0xa2],
          edited: ["漢", "ｱ"],
          bytes: [0xb4, 0xc1, 0x2c, 0x8e, 0xb1],
        },
      ];
    for (const { encoding, kept, edited, bytes } of cases) {
      const lf = [0x0a];
      const header = [...Buffer.from("h1,h2"), ...lf];
      const uri = writeFile(
        `${encoding}.csv`,
        Buffer.from([...header, ...kept, ...lf, ...Buffer.from("b,x"), ...lf])
      );
      const editor = await openHarness(uri, encoding);

      await editor.apply([{ type: "setRow", handle: 2, row: edited }]);
      await editor.save();

      assert.deepStrictEqual(
        [...fs.readFileSync(uri.fsPath)],
        [...header, ...kept, ...lf, ...bytes, ...lf],
        `${encoding} のバイト列で保存される`
      );
    }
  });

  test("インデックス作成中の編集は拒否される", async () => {
    const uri = writeFile("indexing.csv", csvWithRows(100));
    const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
    const editor = await openHarness(uri, "utf-8", { document: { buildIndex: build } });
    created[0].reveal(20);
    await editor.initDone;

    await editor.apply([{ type: "setRow", handle: 1, row: ["x", "y"] }]);

    assert.strictEqual(editor.postedOf("large/error").length, 1, "エラーが伝えられる");
    assert.strictEqual(editor.edits.length, 0, "編集として通知しない");
    assert.strictEqual(editor.document.isDirty, false);
    const { rows } = await editor.rows(0, 1);
    assert.deepStrictEqual(rows, [["r0", "v0"]]);
    created[0].finish();
  });

  test("存在しない行への編集はエラーになり文書は変わらない", async () => {
    const uri = writeFile("missing.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    const revision = lastOf(editor.posted, "large/invalidate")?.revision as number | undefined;

    // 2つ目の op が不正なら、1つ目も当てない
    await editor.apply([
      { type: "setRow", handle: 1, row: ["x", "y"] },
      { type: "setRow", handle: 999, row: ["x", "y"] },
    ]);

    assert.strictEqual(editor.postedOf("large/error").length, 1, "エラーが伝えられる");
    assert.strictEqual(editor.edits.length, 0, "編集として通知しない");
    assert.strictEqual(editor.document.isDirty, false);
    const invalidate = lastOf(editor.posted, "large/invalidate");
    assert.ok(invalidate, "楽観的に反映した画面を戻すため取り直させる");
    assert.ok((invalidate.revision as number) > (revision ?? -1));
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows[0], ["r0", "v0"]);
  });

  test("保存中に届いた編集は保存の完了後に保存した後の行へ当たる", async () => {
    const uri = writeFile("during.csv", csvWithRows(5));
    let renaming = false;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const editor = await openHarness(uri, "utf-8", {
      document: {
        writer: {
          rename: async (from, to) => {
            renaming = true;
            await gate;
            await fs.promises.rename(from, to);
          },
        },
      },
    });
    await editor.apply([
      { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["n", "n"]] },
    ]);

    const saving = editor.save();
    await waitUntil(() => renaming);
    // 保存前の並びで4行目は r2（ハンドル3）。保存後のファイルでは行4になる
    const editing = editor.apply([{ type: "setRow", handle: 3, row: ["r2", "保存中"] }]);
    await settle();
    assert.strictEqual(editor.edits.length, 1, "保存が終わるまで編集を当てない");

    release();
    await saving;
    await editing;

    assert.strictEqual(editor.edits.length, 2);
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows, [
      ["n", "n"],
      ["r0", "v0"],
      ["r1", "v1"],
      ["r2", "保存中"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
    assert.strictEqual(readText(uri), "h1,h2\nn,n\nr0,v0\nr1,v1\nr2,v2\nr3,v3\nr4,v4\n");
    await editor.save();
    assert.strictEqual(readText(uri), "h1,h2\nn,n\nr0,v0\nr1,v1\nr2,保存中\nr3,v3\nr4,v4\n");
  });

  test("保存より前の編集は保存後に元に戻せない", async () => {
    const uri = writeFile("before-save.csv", csvWithRows(5));
    const infos: string[] = [];
    const editor = await openHarness(uri, "utf-8", { info: (message) => infos.push(message) });
    await editor.apply([{ type: "setRow", handle: 1, row: ["r0", "一"] }]);
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "二"] }]);
    await editor.save();

    await editor.edits[1].undo();
    await editor.edits[0].undo();

    const { rows } = await editor.rows(0, 2);
    assert.deepStrictEqual(rows, [
      ["r0", "一"],
      ["r1", "二"],
    ]);
    assert.strictEqual(editor.document.isDirty, false, "保存した状態のまま");
    assert.strictEqual(infos.length, 1, "一度だけ知らせる");
    assert.match(infos[0], /保存より前の編集は元に戻せません/);
  });

  test("別名で保存すると以後はそのファイルを編集する", async () => {
    const uri = writeFile("source.csv", csvWithRows(5));
    const target = vscode.Uri.file(filePath("target.csv"));
    const editor = await openHarness(uri);

    await editor.apply([{ type: "setRow", handle: 1, row: ["r0", "別名"] }]);
    await editor.provider.saveCustomDocumentAs(editor.document, target, editor.token);

    assert.strictEqual(readText(target), csvWithRows(5).replace("r0,v0", "r0,別名"));
    assert.strictEqual(readText(uri), csvWithRows(5), "元のファイルは変わらない");
    assert.strictEqual(
      editor.document.fileUri.fsPath,
      target.fsPath,
      "以後は別名のファイルを読み書きする"
    );
    assert.strictEqual(
      editor.document.uri.fsPath,
      uri.fsPath,
      "VSCode が文書を引く URI は変えない"
    );
    assert.strictEqual(
      editor.pending.take(target),
      "utf-8",
      "別名のファイルを開き直すときに文字コードを尋ねない"
    );

    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "続き"] }]);
    await editor.save();

    assert.strictEqual(
      readText(target),
      csvWithRows(5).replace("r0,v0", "r0,別名").replace("r1,v1", "r1,続き")
    );
    assert.strictEqual(readText(uri), csvWithRows(5), "元のファイルは変わらない");
  });

  test("元に戻す（revert）と保存した状態に戻る", async () => {
    const uri = writeFile("revert.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await editor.apply([
      { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["n", "n"]] },
    ]);
    await editor.apply([{ type: "deleteRows", handles: [3] }]);
    await editor.apply([{ type: "setRow", handle: 2, row: ["r1", "編集"] }]);
    await editor.apply([{ type: "setHeader", header: ["x", "y"] }]);
    const revision = lastOf(editor.posted, "large/invalidate")?.revision as number;

    await editor.provider.revertCustomDocument(editor.document, editor.token);

    assert.strictEqual(editor.document.isDirty, false);
    const invalidate = lastOf(editor.posted, "large/invalidate");
    assert.ok(invalidate && (invalidate.revision as number) > revision, "取り直させる");
    assert.strictEqual(invalidate.rowCount, 5);
    assert.deepStrictEqual(invalidate.header, ["h1", "h2"], "元の列名が伝えられる");
    const { rows, handles } = await editor.rows();
    assert.deepStrictEqual(rows, [
      ["r0", "v0"],
      ["r1", "v1"],
      ["r2", "v2"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
    assert.deepStrictEqual(handles, [1, 2, 3, 4, 5]);
    assert.strictEqual(readText(uri), csvWithRows(5));
  });

  test("開き直した画面には次に使う追加行のハンドルが伝えられる", async () => {
    const uri = writeFile("next-handle.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    assert.strictEqual(lastOf(editor.posted, "large/init")?.nextHandle, -1);
    await editor.apply([
      { type: "insertRows", beforeHandle: null, handles: [-3], rows: [["n", "n"]] },
    ]);

    const revision = editor.revision();
    await editor.send({ type: "init" });

    const init = lastOf(editor.posted, "large/init");
    assert.strictEqual(init?.nextHandle, -4);
    assert.strictEqual(init.revision, revision, "画面はこの revision を起点に編集を送る");
  });

  test("保存をまたいで確定した編集は保存した後の同じ行に当たる", async () => {
    const uri = writeFile("across-save.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await editor.apply([
      { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["n", "n"]] },
    ]);
    // 画面はこの revision のときに4行目（r2、ハンドル3）のハンドルを得た
    const before = editor.revision();

    await editor.save();
    // 保存後のファイルでは r2 は行4。ハンドル3は r1 になっている
    await editor.apply([{ type: "setRow", handle: 3, row: ["r2", "またいだ"] }], before);

    assert.strictEqual(editor.postedOf("large/error").length, 0);
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows[3], ["r2", "またいだ"]);
    assert.deepStrictEqual(rows[2], ["r1", "v1"], "別の行には当たらない");
    await editor.save();
    assert.strictEqual(readText(uri), "h1,h2\nn,n\nr0,v0\nr1,v1\nr2,またいだ\nr3,v3\nr4,v4\n");
  });

  test("2回の保存をまたいだ古い編集は拒否される", async () => {
    const uri = writeFile("two-saves.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    const before = editor.revision();
    for (const handle of [-1, -2]) {
      await editor.apply([
        { type: "insertRows", beforeHandle: 1, handles: [handle], rows: [["n", "n"]] },
      ]);
      await editor.save();
    }
    const edits = editor.edits.length;
    const revision = editor.revision();

    await editor.apply([{ type: "setRow", handle: 3, row: ["x", "y"] }], before);

    assert.strictEqual(editor.postedOf("large/error").length, 1, "エラーが伝えられる");
    assert.strictEqual(editor.edits.length, edits, "編集として通知しない");
    assert.strictEqual(editor.document.isDirty, false, "文書は変わらない");
    assert.ok(editor.revision() > revision, "画面に取り直しが伝えられる");
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows, [
      ["n", "n"],
      ["n", "n"],
      ["r0", "v0"],
      ["r1", "v1"],
      ["r2", "v2"],
      ["r3", "v3"],
      ["r4", "v4"],
    ]);
  });

  test("revertをまたいだ古い編集は拒否される", async () => {
    const uri = writeFile("across-revert.csv", csvWithRows(5));
    const editor = await openHarness(uri);
    await editor.apply([
      { type: "insertRows", beforeHandle: 1, handles: [-1], rows: [["n", "n"]] },
    ]);
    const before = editor.revision();

    await editor.provider.revertCustomDocument(editor.document, editor.token);
    await editor.apply([{ type: "setRow", handle: 1, row: ["x", "y"] }], before);

    assert.strictEqual(editor.postedOf("large/error").length, 1, "エラーが伝えられる");
    assert.strictEqual(editor.document.isDirty, false, "文書は変わらない");
    const { rows } = await editor.rows();
    assert.deepStrictEqual(rows[0], ["r0", "v0"]);
  });
});
