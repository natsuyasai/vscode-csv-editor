import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { createProviderHarness, replaceRows } from "./helpers/providerHarness";

/**
 * ソート・フィルター中の編集 (issue #79)
 *
 * 選択・コピー/ペースト・オートフィル等の位置計算はwebview内部の挙動のため、
 * 拡張機能テストからは直接観測できない（webview側は vitest の結合テストで検証）。
 * ここでは観測可能な部分として、ソート表示中の操作結果としてwebviewから送られる
 * 差分の操作（applyOps）が、データ順を保ったままドキュメントへ反映・保存されることを検証する。
 *   （c と a の間の b は参照が変わらないが、diffRows は先頭・末尾の一致だけを除くので b も含めた置換になる）
 *   データ順: a,3 / b,1 / c,2  (num昇順の表示順: b, c, a)
 *   表示上 c の行から "x\ny" を貼り付けた結果 → c(data2)=x, a(data0)=y
 */
suite("ソート中の編集結果の反映 (issue #79)", () => {
  const ORIGINAL = "name,num\na,3\nb,1\nc,2\n";
  const EDITED_BY_WEBVIEW = "name,num\ny,3\nb,1\nx,2\n";

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-sorted-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function openDocument() {
    const filePath = path.join(tempDir, "sorted.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  test("表示順ではなくデータ順を保った操作がドキュメントへ反映される", async () => {
    const { document } = await openDocument();
    const harness = createProviderHarness(document);

    await harness.send({ type: "init" });
    await harness.sendOps([
      replaceRows(1, 3, [
        ["y", "3"],
        ["b", "1"],
        ["x", "2"],
      ]),
    ]);
    await sleep(100);

    assert.strictEqual(document.getText(), EDITED_BY_WEBVIEW);
    // 行の並びはデータ順のまま（ソート表示の順序がドキュメントに書き込まれない）
    const names = document
      .getText()
      .split("\n")
      .slice(1)
      .filter((l) => l)
      .map((l) => l.split(",")[0]);
    assert.deepStrictEqual(names, ["y", "b", "x"]);
  });

  test("保存するとデータ順のままディスクへ書き込まれる", async function () {
    this.timeout(10000);
    const { filePath, document } = await openDocument();
    const harness = createProviderHarness(document);

    await harness.send({ type: "init" });
    await harness.sendOps([
      replaceRows(1, 3, [
        ["y", "3"],
        ["b", "1"],
        ["x", "2"],
      ]),
    ]);
    await sleep(100);
    await harness.send({ type: "save" });
    await sleep(300);

    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(fs.readFileSync(filePath, "utf8"), EDITED_BY_WEBVIEW);
  });
});
