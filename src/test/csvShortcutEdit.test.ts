import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import type { RowOp } from "../shared/csv/ops";
import { createProviderHarness, replaceRows } from "./helpers/providerHarness";

/**
 * ショートカットによる行・列の挿入/削除 (issue #87)
 *
 * Ctrl/Cmd+Shift+D/I/B/L/R のキー処理自体は webview 内部（DOMのkeydown）で行われるため、
 * 拡張機能テストからは観測できない（webview側は vitest の結合テストで検証）。
 * ここでは観測可能な部分として、ショートカット操作の結果として webview から送られる
 * 差分の操作（applyOps）がドキュメントへ反映・保存されることを検証する。
 * 操作は webview が diffRows で作るものと同じ形にする（列の構造変更は全行の置換になる）。
 */
suite("ショートカット操作結果の反映 (issue #87)", () => {
  const ORIGINAL = "name,num\na,3\nb,1\nc,2\n";
  // 行 b を Ctrl+Shift+D で削除
  const ROW_DELETED = "name,num\na,3\nc,2\n";
  // 行 b の下に Ctrl+Shift+B で挿入
  const ROW_INSERTED = "name,num\na,3\nb,1\n,\nc,2\n";
  // 列 num の左に Ctrl+Shift+L で挿入
  const COL_INSERTED = "name,new column,num\na,,3\nb,,1\nc,,2\n";
  // 列 name を Ctrl+Shift+D で削除
  const COL_DELETED = "num\n3\n1\n2\n";

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-shortcut-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function openDocument() {
    const filePath = path.join(tempDir, "shortcut.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  const ROW_DELETE_OPS: RowOp[] = [replaceRows(2, 1, [])];
  const cases: Array<[string, RowOp[], string]> = [
    ["行削除 (Ctrl+Shift+D)", ROW_DELETE_OPS, ROW_DELETED],
    ["行挿入 (Ctrl+Shift+I/B)", [replaceRows(3, 0, [["", ""]])], ROW_INSERTED],
    [
      "列挿入 (Ctrl+Shift+L/R)",
      [
        replaceRows(0, 4, [
          ["name", "new column", "num"],
          ["a", "", "3"],
          ["b", "", "1"],
          ["c", "", "2"],
        ]),
      ],
      COL_INSERTED,
    ],
    ["列削除 (Ctrl+Shift+D)", [replaceRows(0, 4, [["num"], ["3"], ["1"], ["2"]])], COL_DELETED],
  ];

  for (const [name, ops, edited] of cases) {
    test(`${name} の結果の操作がドキュメントへ反映される`, async () => {
      const { document } = await openDocument();
      const harness = createProviderHarness(document);

      await harness.send({ type: "init" });
      await harness.sendOps(ops);
      await sleep(100);

      assert.strictEqual(document.getText(), edited);
    });
  }

  test("ショートカット操作後に保存するとディスクへ書き込まれる", async function () {
    this.timeout(10000);
    const { filePath, document } = await openDocument();
    const harness = createProviderHarness(document);

    await harness.send({ type: "init" });
    await harness.sendOps(ROW_DELETE_OPS);
    await sleep(100);
    await harness.send({ type: "save" });
    await sleep(300);

    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(fs.readFileSync(filePath, "utf8"), ROW_DELETED);
  });
});
