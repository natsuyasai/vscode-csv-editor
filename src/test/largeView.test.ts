import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import { LARGE_MODE_RESTRICTIONS } from "../large/largeRestrictions";
import { ControlledRowIndex } from "./helpers/controlledRowIndex";
import { ScriptedPicker } from "./helpers/fakePicker";
import { WebviewTap, waitFor } from "./helpers/webviewTap";

/**
 * 大容量モードでの閲覧（largeView.feature）。
 * 実際に読み込まれた拡張機能（dist）の大容量モードを `vscode.openWith` で開き、
 * 実際の webview（`npm run build:webview` 済みの webview-ui/build）とのやり取りを観測する。
 * - 「画面が要求した行」は、実際の webview の RemoteRowSource / LargeTable が送った `large/getRows`
 * - webview の DOM は拡張ホストから見えないため、表示の確認は webview へ届いたメッセージまで。
 *   届いた内容を表示すること（バナー・表・スクロール）は webview 側のテスト（LargeTable.feature 等）で確かめる
 * - スクロールは拡張ホストから操作できないため、末尾付近の要求は webview と同じ形の `large/getRows` を渡して模擬する
 */

const LARGE = "csv-editor.largeEditor";

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
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await waitFor(
    () => vscode.window.tabGroups.all.every((group) => group.tabs.length === 0),
    "全タブが閉じる"
  );
}

/** ヘッダー＋データ n 行の CSV（データ行 i は "r{i},v{i}"） */
const csvWithRows = (n: number, eol = "\n", trailingEol = true) =>
  "h1,h2" +
  eol +
  Array.from({ length: n }, (_, i) => `r${String(i)},v${String(i)}`).join(eol) +
  (trailingEol ? eol : "");

type Message = { type?: unknown; [key: string]: unknown };

suite("大容量モードでの閲覧", function () {
  this.timeout(60000);
  let api: CsvEditorTestingApi;
  let dir = "";
  let tap: WebviewTap;
  let picker: ScriptedPicker;

  const writeFile = (name: string, data: string | Uint8Array): vscode.Uri => {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, data);
    return vscode.Uri.file(filePath);
  };

  /**
   * 文字コードを選んで大容量モードで開き、実際の webview が先頭の行を要求して受け取るまで待つ。
   * 返すのは provider が webview へ送った large/init と、webview の先頭行の要求への応答。
   */
  const openInWebview = async (uri: vscode.Uri, encoding: string) => {
    picker = new ScriptedPicker(encoding);
    api.setPickerForTesting(picker);
    await vscode.commands.executeCommand("vscode.openWith", uri, LARGE);

    // webview-ui のビルドが読み込まれ、起動時の init を送ってくる
    await tap.waitFor("toExtension", (m) => m.type === "init", "webview の init");
    const init = (await tap.waitFor("toWebview", (m) => m.type === "large/init", "large/init"))
      .message;
    // 大容量モードの画面（LargeTable）が表示範囲を測り、先頭の行を要求する
    const request = (
      await tap.waitFor(
        "toExtension",
        (m) => m.type === "large/getRows" && m.start === 0,
        "webview の先頭行の要求"
      )
    ).message;
    const rows = (
      await tap.waitFor(
        "toWebview",
        (m) => m.type === "large/rows" && m.reqId === request.reqId,
        "先頭行の応答"
      )
    ).message;
    return { init, request, rows };
  };

  const rowsOf = (message: Message) => message.rows as string[][];

  suiteSetup(async () => {
    api = await getApi();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-view-"));
  });

  setup(async () => {
    await closeAllEditorsAndWait();
    tap = new WebviewTap();
    picker = new ScriptedPicker();
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap });
  });

  teardown(async () => {
    assert.deepStrictEqual(picker.mismatches, [], "答えはすべて選択肢にある");
    api.setPickerForTesting(new ScriptedPicker());
    await closeAllEditorsAndWait();
    api.setLargeEditorForTesting(undefined);
  });

  suiteTeardown(() => {
    api.setPickerForTesting(undefined);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  test("インデックス作成中でも先頭行を表示できる", async () => {
    const uri = writeFile("building.csv", csvWithRows(3000));
    const { build, created } = await ControlledRowIndex.factory(uri.fsPath);
    api.setLargeEditorForTesting({ wrapWebview: tap.wrap, document: { buildIndex: build } });
    // 開いた直後にファイルの半分まで作成が進んだ状態にする（完了はさせない）
    const opening = openInWebview(uri, "utf-8");
    await waitFor(() => created.length === 1, "行インデックスの作成開始");
    created[0].reveal(1500);

    const { init, request, rows } = await opening;

    assert.strictEqual(init.indexing, true);
    assert.strictEqual(init.rowCount, 1499);
    assert.deepStrictEqual(init.header, ["h1", "h2"]);
    assert.strictEqual(created[0].completed, false, "作成はまだ終わっていない");
    assert.ok((request.count as number) > 0, "表示範囲の分を要求する");
    assert.ok((request.count as number) < 1499, "確定済みの全体は要求しない");
    assert.deepStrictEqual(rowsOf(rows)[0], ["r0", "v0"]);
    assert.strictEqual(rowsOf(rows).length, request.count);
  });

  test("末尾までスクロールすると最終行が表示される", async () => {
    const uri = writeFile("tail.csv", csvWithRows(3000, "\n", false));
    const { init } = await openInWebview(uri, "utf-8");
    // 作成が init の後に終わったときは、最終の行数が invalidate で届く
    await waitFor(
      () =>
        init.rowCount === 3000 ||
        tap.messagesOf("toWebview", "large/invalidate").some((m) => m.rowCount === 3000),
      "最終の行数"
    );

    // LargeTable が末尾付近を表示したときと同じく、ページ境界から先読みを含めて要求する
    await tap.deliver({ type: "large/getRows", reqId: 10_001, start: 2500, count: 500 });

    const tail = tap.messagesOf("toWebview", "large/rows").find((m) => m.reqId === 10_001);
    assert.ok(tail, "末尾付近の行が届く");
    const rows = rowsOf(tail);
    assert.strictEqual(rows.length, 500);
    assert.deepStrictEqual(rows.at(-1), ["r2999", "v2999"]);
    assert.strictEqual((tail.handles as number[]).at(-1), 3000);
  });

  test("Shift_JISのファイルを文字化けせずに表示できる", async () => {
    // 1行目 "あ,漢\n"、2行目 "表ソ,①ｱ\n"（表=95 5C・ソ=83 5C は2バイト目が "\"、① は NEC 特殊文字、ｱ は半角カナ）
    const sjis = Buffer.from([
      0x82, 0xa0, 0x2c, 0x8a, 0xbf, 0x0a, 0x95, 0x5c, 0x83, 0x5c, 0x2c, 0x87, 0x40, 0xb1, 0x0a,
    ]);
    const uri = writeFile("sjis.csv", sjis);

    const { init, rows } = await openInWebview(uri, "shift_jis");

    assert.strictEqual(init.encoding, "shift_jis");
    assert.deepStrictEqual(init.header, ["あ", "漢"]);
    assert.deepStrictEqual(rowsOf(rows), [["表ソ", "①ｱ"]]);
  });

  test("EUC-JPのファイルを文字化けせずに表示できる", async () => {
    // 1行目 "あ,漢\n"、2行目 "漢あ,ｱ\n"（ｱ は 8E B1）
    const eucjp = Buffer.from([
      0xa4, 0xa2, 0x2c, 0xb4, 0xc1, 0x0a, 0xb4, 0xc1, 0xa4, 0xa2, 0x2c, 0x8e, 0xb1, 0x0a,
    ]);
    const uri = writeFile("eucjp.csv", eucjp);

    const { init, rows } = await openInWebview(uri, "euc-jp");

    assert.strictEqual(init.encoding, "euc-jp");
    assert.deepStrictEqual(init.header, ["あ", "漢"]);
    assert.deepStrictEqual(rowsOf(rows), [["漢あ", "ｱ"]]);
  });

  test("UTF-8(BOM付き)のファイルでBOMが先頭の列名に混入しない", async () => {
    const uri = writeFile(
      "bom.csv",
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("名前,値\nあ,1\n")])
    );

    const { init, rows } = await openInWebview(uri, "utf-8-bom");

    assert.strictEqual(init.encoding, "utf-8-bom");
    assert.deepStrictEqual(init.header, ["名前", "値"]);
    const [firstHeader] = init.header;
    assert.notStrictEqual(firstHeader.codePointAt(0), 0xfeff, "先頭に BOM（U+FEFF）が無い");
    assert.deepStrictEqual(rowsOf(rows), [["あ", "1"]]);
  });

  test("改行コードがCRLFのファイルでもセルに改行文字が残らない", async () => {
    const uri = writeFile("crlf.csv", csvWithRows(3, "\r\n"));

    const { init, rows } = await openInWebview(uri, "utf-8");

    assert.deepStrictEqual(init.header, ["h1", "h2"]);
    assert.deepStrictEqual(rowsOf(rows), [
      ["r0", "v0"],
      ["r1", "v1"],
      ["r2", "v2"],
    ]);
  });

  test("クォート内の改行を含む行は1行として表示される", async () => {
    const uri = writeFile("multiline.csv", 'h1,h2\n"x\ny",1\n"p\r\nq",2\nz,3\n');

    const { init, rows } = await openInWebview(uri, "utf-8");
    await waitFor(
      () =>
        init.rowCount === 3 ||
        tap.messagesOf("toWebview", "large/invalidate").some((m) => m.rowCount === 3),
      "最終の行数"
    );

    assert.ok(
      tap.messagesOf("toWebview", "large/invalidate").every((m) => m.rowCount === 3),
      "行数はクォート内の改行を数えない"
    );
    assert.deepStrictEqual(rowsOf(rows), [
      ["x\ny", "1"],
      ["p\r\nq", "2"],
      ["z", "3"],
    ]);
  });

  test("機能制限中であることが表示される", async () => {
    const uri = writeFile("small.csv", "a,b\n" + "1,2\n".repeat(200));

    const { init } = await openInWebview(uri, "shift_jis");

    // 定数どうしの比較では一覧の中身を確かめられないため、表示する一覧を書き下して比べる
    assert.deepStrictEqual(init.restrictions, [
      "列の挿入・削除",
      "行・列のドラッグ&ドロップによる並び替え",
      "オートフィル",
      "列の配置（左・中央・右揃え）",
      "行の高さ・列幅の変更",
      "ヘッダー行を無視する設定（Ignore Header Row）",
      "行・列の全体選択",
      "一括編集",
      "検索の一致件数の表示・すべての一致の強調",
    ]);
    assert.deepStrictEqual(init.restrictions, [...LARGE_MODE_RESTRICTIONS]);
    assert.strictEqual(init.encoding, "shift_jis");
  });
});
