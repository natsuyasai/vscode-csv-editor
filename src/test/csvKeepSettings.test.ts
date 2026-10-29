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
 * 列・行の挿入/削除/移動の結果の反映 (issue #86)
 *
 * 列幅・文字寄せ・行の高さは webview 内部のReact状態でありドキュメントへ保存されない
 * （webviewとの通信は init/applyOps/reload/save 等で、設定は含まない）。そのため拡張機能テストからは
 * 「設定が同じ列・行に付いたままか」を観測できず、その検証は webview 側の vitest 結合テスト
 * (EditableTable.keepSettings.spec.tsx) で行う。
 * ここでは観測可能な部分として、列・行の構造変更の結果として webview から送られる
 * 差分の操作（applyOps）がドキュメントへ正しく反映されることを検証する。
 * 操作は webview が diffRows で作るものと同じ形にする（列の構造変更は全行が変わるため全行の置換になる）。
 */
suite("列・行の構造変更の反映 (issue #86)", () => {
  const ORIGINAL = "name,num\na,3\nb,1\nc,2\n";
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-keep-settings-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function openDocument() {
    const filePath = path.join(tempDir, "keep-settings.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  /** 全行を置き換える操作（列の構造変更） */
  const replaceAllRows = (rows: string[][]): RowOp[] => [replaceRows(0, 4, rows)];

  const cases: Array<[string, RowOp[], string]> = [
    [
      "列の左に挿入",
      replaceAllRows([
        ["name", "new column", "num"],
        ["a", "", "3"],
        ["b", "", "1"],
        ["c", "", "2"],
      ]),
      "name,new column,num\na,,3\nb,,1\nc,,2\n",
    ],
    ["列の削除", replaceAllRows([["num"], ["3"], ["1"], ["2"]]), "num\n3\n1\n2\n"],
    [
      "列の移動",
      replaceAllRows([
        ["num", "name"],
        ["3", "a"],
        ["1", "b"],
        ["2", "c"],
      ]),
      "num,name\n3,a\n1,b\n2,c\n",
    ],
    ["行の上に挿入", [replaceRows(1, 0, [["", ""]])], "name,num\n,\na,3\nb,1\nc,2\n"],
    ["行の削除", [replaceRows(1, 1, [])], "name,num\nb,1\nc,2\n"],
    [
      "行の移動",
      [
        replaceRows(1, 3, [
          ["b", "1"],
          ["c", "2"],
          ["a", "3"],
        ]),
      ],
      "name,num\nb,1\nc,2\na,3\n",
    ],
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
});
