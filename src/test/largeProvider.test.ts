import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { LargeCsvDocument, CancelledLargeCsvDocument } from "../large/largeCsvDocument";
import type { LargeCsvEditorProviderOptions } from "../large/largeCsvEditorProvider";
import { LARGE_MODE_RESTRICTIONS } from "../large/largeRestrictions";
import { PendingEncodings } from "../large/pendingEncodings";
import { RowIndexLimitError } from "../large/rowIndex";
import { ControlledRowIndex } from "./helpers/controlledRowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { openLargeEditor, settle } from "./helpers/largeProviderHarness";

/**
 * 大容量モードの provider の webview とのやり取り（読み込み・表示。編集と保存は largeEdit.test.ts）。
 * VSCode の画面は使わず、モックの webview / panel で openCustomDocument → resolveCustomEditor を駆動する。
 */
suite("大容量モードのprovider（LargeCsvEditorProvider）", () => {
  let tempDir = "";
  let opened: { close: () => Promise<void> }[] = [];

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-large-provider-"));
    opened = [];
  });

  teardown(async () => {
    for (const editor of opened) {
      await editor.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const writeFile = (name: string, data: string | Uint8Array): vscode.Uri => {
    const filePath = path.join(tempDir, name);
    fs.writeFileSync(filePath, data);
    return vscode.Uri.file(filePath);
  };

  /** ヘッダー＋データ n 行の CSV（データ行 i は "r{i},v{i}"） */
  const csvWithRows = (n: number) =>
    "h1,h2\n" + Array.from({ length: n }, (_, i) => `r${String(i)},v${String(i)}\n`).join("");

  /** 保留オプションに文字コードを入れてから開く */
  const open = async (
    uri: vscode.Uri,
    encoding: "utf-8" | "utf-8-bom" | "shift_jis" | "euc-jp" = "utf-8",
    extra: Partial<LargeCsvEditorProviderOptions> = {}
  ) => {
    const pending = new PendingEncodings();
    pending.set(uri, encoding);
    const editor = await openLargeEditor(uri, { picker: new ScriptedPicker(), pending, ...extra });
    opened.push(editor);
    return editor;
  };

  const dataRows = (from: number, to: number) =>
    Array.from({ length: to - from }, (_, k) => [`r${String(from + k)}`, `v${String(from + k)}`]);

  suite("文字コードの決定", () => {
    test("保留オプションに文字コードがあれば尋ねずにその文字コードで開く", async () => {
      const uri = writeFile("a.csv", csvWithRows(1));
      const picker = new ScriptedPicker();
      const pending = new PendingEncodings();
      pending.set(uri, "euc-jp");
      const editor = await openLargeEditor(uri, { picker, pending });
      opened.push(editor);

      assert.strictEqual(picker.calls.length, 0);
      assert.ok(editor.document instanceof LargeCsvDocument);
      assert.strictEqual(editor.document.encoding, "euc-jp");
      assert.strictEqual(pending.take(uri), undefined, "保留オプションは使ったら消す");
    });

    test("保留オプションが無ければ文字コードを尋ねる", async () => {
      const uri = writeFile("a.csv", csvWithRows(1));
      const picker = new ScriptedPicker("shift_jis");
      const editor = await openLargeEditor(uri, { picker, pending: new PendingEncodings() });
      opened.push(editor);

      assert.strictEqual(picker.calls.length, 1);
      assert.deepStrictEqual(picker.valuesOf(0), ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"]);
      assert.ok(editor.document instanceof LargeCsvDocument);
      assert.strictEqual(editor.document.encoding, "shift_jis");
    });

    test("文字コードの選択をキャンセルするとパネルを閉じ、webview を読み込まない", async () => {
      const uri = writeFile("a.csv", csvWithRows(1));
      const editor = await openLargeEditor(uri, {
        picker: new ScriptedPicker(),
        pending: new PendingEncodings(),
      });
      opened.push(editor);

      assert.ok(editor.document instanceof CancelledLargeCsvDocument);
      assert.strictEqual(editor.panelDisposed, true);
      assert.strictEqual(editor.webview.html, "");
    });
  });

  suite("初期化", () => {
    test("init を受けると updateTheme と large/init（ヘッダー・データ行数・文字コード・制限・次の追加行のハンドル・revision・ソートとフィルタの状態）を返す", async () => {
      const uri = writeFile("a.csv", csvWithRows(3));
      const editor = await open(uri, "utf-8");
      assert.ok(editor.document instanceof LargeCsvDocument);
      await editor.document.indexDone;

      await editor.send({ type: "init" });

      assert.deepStrictEqual(
        editor.posted.map((m) => m.type),
        ["updateTheme", "large/init"]
      );
      assert.deepStrictEqual(editor.postedOf("large/init")[0], {
        type: "large/init",
        header: ["h1", "h2"],
        rowCount: 3,
        indexing: false,
        encoding: "utf-8",
        restrictions: [...LARGE_MODE_RESTRICTIONS],
        nextHandle: -1,
        revision: 0,
        query: { sort: null, filters: [] },
      });
      assert.ok(editor.webview.html.includes("Content-Security-Policy"));
    });

    test("空のファイルはヘッダーが空でデータ行数が0になる", async () => {
      const uri = writeFile("empty.csv", "");
      const editor = await open(uri);

      await editor.send({ type: "init" });

      const init = editor.postedOf("large/init")[0];
      assert.deepStrictEqual(init.header, []);
      assert.strictEqual(init.rowCount, 0);
    });

    test("Shift_JIS のファイルのヘッダーと行をデコードして返す", async () => {
      // "あ,漢\n漢,あ\n"
      const sjis = Buffer.from([
        0x82, 0xa0, 0x2c, 0x8a, 0xbf, 0x0a, 0x8a, 0xbf, 0x2c, 0x82, 0xa0, 0x0a,
      ]);
      const uri = writeFile("sjis.csv", sjis);
      const editor = await open(uri, "shift_jis");

      await editor.send({ type: "init" });
      await editor.send({ type: "large/getRows", reqId: 1, start: 0, count: 1 });

      assert.deepStrictEqual(editor.postedOf("large/init")[0].header, ["あ", "漢"]);
      assert.deepStrictEqual(editor.postedOf("large/rows")[0].rows, [["漢", "あ"]]);
    });

    test("init を再び受けると現在の状態を返す（webview の作り直し）", async () => {
      const uri = writeFile("a.csv", csvWithRows(2));
      const editor = await open(uri);
      assert.ok(editor.document instanceof LargeCsvDocument);
      await editor.document.indexDone;
      await editor.send({ type: "init" });
      await editor.send({ type: "init" });

      const inits = editor.postedOf("large/init");
      assert.strictEqual(inits.length, 2);
      assert.strictEqual(inits[1].rowCount, 2);
      assert.strictEqual(inits[1].indexing, false);
    });
  });

  suite("行の取得", () => {
    test("表示位置をファイル上の行に変換して返し、ハンドルはファイル上の行番号になる", async () => {
      const uri = writeFile("a.csv", csvWithRows(10));
      const editor = await open(uri);
      await editor.send({ type: "init" });

      await editor.send({ type: "large/getRows", reqId: 7, start: 2, count: 3 });

      assert.deepStrictEqual(editor.postedOf("large/rows")[0], {
        type: "large/rows",
        reqId: 7,
        start: 2,
        rows: dataRows(2, 5),
        handles: [3, 4, 5],
      });
    });

    test("末尾を超える要求は最終行までに切り詰めて返す", async () => {
      const uri = writeFile("a.csv", csvWithRows(4));
      const editor = await open(uri);
      await editor.send({ type: "init" });

      await editor.send({ type: "large/getRows", reqId: 1, start: 2, count: 500 });

      const rows = editor.postedOf("large/rows")[0];
      assert.deepStrictEqual(rows.rows, dataRows(2, 4));
      assert.deepStrictEqual(rows.handles, [3, 4]);
    });

    test("読み取りに失敗すると reqId 付きの large/error を返す", async () => {
      const uri = writeFile("a.csv", csvWithRows(10));
      const editor = await open(uri);
      await editor.send({ type: "init" });
      // インデックスの作成後にファイルが短くなった
      fs.writeFileSync(uri.fsPath, "h1,h2\n");

      await editor.send({ type: "large/getRows", reqId: 3, start: 5, count: 5 });

      const errors = editor.postedOf("large/error");
      assert.strictEqual(errors.length, 1);
      assert.strictEqual(errors[0].reqId, 3);
      assert.strictEqual(typeof errors[0].message, "string");
      assert.strictEqual(editor.postedOf("large/rows").length, 0);
    });

    test("パースできない行があると文書ごとに一度だけ警告する", async () => {
      const uri = writeFile("bad.csv", 'h1,h2\n"a"b,1\nok,2\n"c"d,3\n');
      const warnings: string[] = [];
      const editor = await open(uri, "utf-8", { warn: (m) => warnings.push(m) });
      await editor.send({ type: "init" });

      await editor.send({ type: "large/getRows", reqId: 1, start: 0, count: 1 });
      await editor.send({ type: "large/getRows", reqId: 2, start: 2, count: 1 });

      assert.strictEqual(warnings.length, 1);
      assert.deepStrictEqual(editor.postedOf("large/rows")[0].rows, [['"a"b,1']]);
      assert.strictEqual(
        editor.postedOf("large/error").length,
        0,
        "webview にはエラーとして送らない"
      );
    });

    test("想定外のメッセージは無視する", async () => {
      const uri = writeFile("a.csv", csvWithRows(1));
      const editor = await open(uri);
      await editor.send({ type: "init" });
      const before = editor.posted.length;

      await editor.send({ type: "large/getRows", reqId: -1, start: 0, count: 1 });
      await editor.send("garbage");

      assert.strictEqual(editor.posted.length, before);
    });
  });

  suite("インデックスの作成中", () => {
    /** 作成の進み方を制御できるインデックスで開く */
    const openControlled = async (
      rows: number,
      extra: Partial<LargeCsvEditorProviderOptions> = {}
    ) => {
      const uri = writeFile("building.csv", csvWithRows(rows));
      const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
      const editor = await open(uri, "utf-8", { document: { buildIndex: build }, ...extra });
      return { editor, index: created[0] };
    };

    test("作成中に init を受けると確定済みの行数と indexing を返す", async () => {
      const { editor, index } = await openControlled(100);
      index.reveal(11);

      await editor.send({ type: "init" });

      const init = editor.postedOf("large/init")[0];
      assert.deepStrictEqual(init.header, ["h1", "h2"]);
      assert.strictEqual(init.rowCount, 10);
      assert.strictEqual(init.indexing, true);
    });

    test("1行目が確定するまで init の応答を待つ", async () => {
      const { editor, index } = await openControlled(100);
      const initDone = editor.send({ type: "init" });
      await settle();
      assert.strictEqual(editor.postedOf("large/init").length, 0);

      index.reveal(1);
      await initDone;

      assert.deepStrictEqual(editor.postedOf("large/init")[0].header, ["h1", "h2"]);
      assert.strictEqual(editor.postedOf("large/init")[0].rowCount, 0);
    });

    test("確定していない行の要求は、その行が確定するまで待って切り詰めずに返す", async () => {
      const { editor, index } = await openControlled(100);
      index.reveal(4);
      await editor.send({ type: "init" });

      const request = editor.send({ type: "large/getRows", reqId: 1, start: 0, count: 10 });
      await settle();
      assert.strictEqual(editor.postedOf("large/rows").length, 0, "確定するまで応答しない");

      index.reveal(20);
      await request;

      assert.deepStrictEqual(editor.postedOf("large/rows")[0].rows, dataRows(0, 10));
    });

    test("作成が完了すると、待っていた要求は最終行までで返す", async () => {
      const { editor, index } = await openControlled(5);
      index.reveal(2);
      await editor.send({ type: "init" });

      const request = editor.send({ type: "large/getRows", reqId: 1, start: 3, count: 10 });
      await settle();
      index.finish();
      await request;

      assert.deepStrictEqual(editor.postedOf("large/rows")[0].rows, dataRows(3, 5));
    });

    test("進捗は間引いて送る", async () => {
      let now = 0;
      const { editor, index } = await openControlled(100, {
        progressIntervalMs: 100,
        invalidateIntervalMs: 100_000,
        now: () => now,
      });
      index.reveal(1);
      await editor.send({ type: "init" });

      now = 100;
      index.reveal(10);
      now = 150;
      index.reveal(20);
      now = 200;
      index.reveal(30);

      const progress = editor.postedOf("large/progress");
      assert.strictEqual(progress.length, 2);
      assert.ok(progress.every((m) => m.kind === "index" && (m.ratio as number) < 1));
    });

    test("作成中の行数の増加は間引いて invalidate で送り、revision は増え続ける", async () => {
      let now = 0;
      const { editor, index } = await openControlled(100, {
        progressIntervalMs: 0,
        invalidateIntervalMs: 1000,
        now: () => now,
      });
      index.reveal(1);
      await editor.send({ type: "init" });

      now = 500;
      index.reveal(10);
      now = 1000;
      index.reveal(20);
      now = 1500;
      index.reveal(30);
      now = 2000;
      index.reveal(40);

      const invalidates = editor.postedOf("large/invalidate");
      assert.deepStrictEqual(
        invalidates.map((m) => m.rowCount),
        [19, 39]
      );
      assert.ok((invalidates[1].revision as number) > (invalidates[0].revision as number));
    });

    test("作成が完了すると ratio 1 の進捗と最終行数の invalidate を送る", async () => {
      const { editor, index } = await openControlled(50, { invalidateIntervalMs: 100_000 });
      index.reveal(5);
      await editor.send({ type: "init" });

      index.finish();
      await settle();

      const progress = editor.postedOf("large/progress");
      assert.deepStrictEqual(progress.at(-1), { type: "large/progress", kind: "index", ratio: 1 });
      const invalidate = editor.postedOf("large/invalidate").at(-1);
      assert.strictEqual(invalidate?.rowCount, 50);
    });

    test("init より前の進捗と行数の増加は送らない", async () => {
      const { editor, index } = await openControlled(30, {
        progressIntervalMs: 0,
        invalidateIntervalMs: 0,
      });
      index.reveal(10);
      index.finish();
      await settle();
      assert.strictEqual(editor.posted.length, 0);

      await editor.send({ type: "init" });

      assert.deepStrictEqual(
        editor.posted.map((m) => m.type),
        ["updateTheme", "large/init"]
      );
      assert.strictEqual(editor.postedOf("large/init")[0].indexing, false);
      assert.strictEqual(editor.postedOf("large/init")[0].rowCount, 30);
    });

    test("2回目の init の後の invalidate も revision が前より大きい", async () => {
      let now = 0;
      const { editor, index } = await openControlled(100, {
        progressIntervalMs: 0,
        invalidateIntervalMs: 10,
        now: () => now,
      });
      index.reveal(1);
      await editor.send({ type: "init" });
      now = 10;
      index.reveal(10);
      await editor.send({ type: "init" });
      now = 20;
      index.reveal(20);

      const revisions = editor.postedOf("large/invalidate").map((m) => m.revision as number);
      assert.strictEqual(revisions.length, 2);
      assert.ok(revisions[1] > revisions[0]);
    });

    test("パネルを閉じた後は待っていた要求に応答しない", async () => {
      const { editor, index } = await openControlled(100);
      index.reveal(2);
      await editor.send({ type: "init" });
      const request = editor.send({ type: "large/getRows", reqId: 1, start: 0, count: 10 });
      await settle();

      const closing = editor.close();
      index.reveal(50);
      await request;
      await settle();

      assert.strictEqual(editor.postedOf("large/rows").length, 0);
      assert.strictEqual(editor.postedOf("large/error").length, 0);
      await closing;
    });

    test("文書を破棄すると行インデックスの作成を中断し、ファイルを閉じる", async () => {
      const { editor, index } = await openControlled(10);
      assert.ok(editor.document instanceof LargeCsvDocument);
      const document = editor.document;
      index.reveal(5);

      const closing = editor.close();

      assert.strictEqual(index.signal?.aborted, true);
      await assert.rejects(document.readDataRows(0, 1));
      await closing;
    });
  });

  suite("エラー", () => {
    test("行数が上限を超えると large/error で知らせる", async () => {
      const uri = writeFile("many.csv", csvWithRows(10));
      const editor = await open(uri, "utf-8", { document: { maxRows: 3 } });
      assert.ok(editor.document instanceof LargeCsvDocument);
      await assert.rejects(editor.document.indexDone, RowIndexLimitError);

      await editor.send({ type: "init" });

      const errors = editor.postedOf("large/error");
      assert.strictEqual(errors.length, 1);
      assert.match(errors[0].message as string, /上限/);
    });

    test("init の後に作成が失敗したときも large/error で知らせる", async () => {
      const uri = writeFile("building.csv", csvWithRows(10));
      const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
      const editor = await open(uri, "utf-8", { document: { buildIndex: build } });
      created[0].reveal(2);
      await editor.send({ type: "init" });

      created[0].fail(new RowIndexLimitError(2));
      await settle();

      assert.strictEqual(editor.postedOf("large/error").length, 1);
    });
  });
});
