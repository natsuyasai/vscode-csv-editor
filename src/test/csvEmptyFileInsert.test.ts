import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { createProviderHarness, replaceRows } from "./helpers/providerHarness";

/**
 * 空ファイルからの行・列追加 (issue #83)
 *
 * 挿入位置の計算・ヘッダー無視時の空文字挿入は webview 内部(useUpdateCsvArray)の挙動のため、
 * 拡張機能テストからは直接観測できない（webview側は vitest で検証）。
 * ここでは観測可能な部分として、0バイトのファイルを開いても例外・ダーティ化せず、
 * 行/列追加後にwebviewが送る差分の操作（applyOps）が期待どおりドキュメントへ反映・保存されることを検証する。
 */
// 空ファイルは書式を持たないため、編集時にVSCodeの files.eol (Windowsでは CRLF) が適用され得る。
// 改行コードの差は本テストの対象外なので正規化して比較する
const normalizeEol = (text: string) => text.split(String.fromCharCode(13)).join("");

suite("空ファイルへの行・列追加 (issue #83)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-empty-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function openEmptyDocument() {
    const filePath = path.join(tempDir, "empty.csv");
    fs.writeFileSync(filePath, "", "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  test("0バイトのファイルを開いても例外にならず、ダーティ化せず空のinitが送られる", async () => {
    const { document } = await openEmptyDocument();
    const harness = createProviderHarness(document);

    await harness.send({ type: "init" });
    await sleep(100);

    assert.strictEqual(document.getText(), "");
    assert.strictEqual(document.isDirty, false);
    assert.ok(
      harness.posted.some(
        (m) =>
          (m as { type: string; payload?: unknown }).type === "update" &&
          (m as { payload?: unknown }).payload === ""
      )
    );
  });

  test("列追加後の操作(ヘッダーのみ)がドキュメントへ反映され保存できる", async function () {
    this.timeout(10000);
    const { filePath, document } = await openEmptyDocument();
    const harness = createProviderHarness(document);
    const expected = "new column\n";

    await harness.send({ type: "init" });
    await harness.sendOps([replaceRows(0, 0, [["new column"]])]);
    await sleep(100);
    assert.strictEqual(normalizeEol(document.getText()), expected);
    assert.strictEqual(document.isDirty, true);

    await harness.send({ type: "save" });
    await sleep(300);
    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(normalizeEol(fs.readFileSync(filePath, "utf8")), expected);
  });

  test("行追加後の操作(ヘッダー+空データ行)がドキュメントへ反映され保存できる", async function () {
    this.timeout(10000);
    const { filePath, document } = await openEmptyDocument();
    const harness = createProviderHarness(document);
    // 空ファイルで行追加: ヘッダー "new column" + 空セルの1行
    const expected = "new column\n\n";

    await harness.send({ type: "init" });
    await harness.sendOps([replaceRows(0, 0, [["new column"], [""]])]);
    await sleep(100);
    assert.strictEqual(normalizeEol(document.getText()), expected);

    await harness.send({ type: "save" });
    await sleep(300);
    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(normalizeEol(fs.readFileSync(filePath, "utf8")), expected);
  });
});
