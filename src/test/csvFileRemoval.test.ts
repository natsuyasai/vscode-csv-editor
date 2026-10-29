import * as assert from "assert";
import * as fs from "fs";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import {
  createProviderHarness,
  openCsv,
  replaceAll,
  replaceRows,
  useTempDir,
} from "./helpers/providerHarness";

suite("エディタを閉じた後・ファイル削除後の挙動", () => {
  const temp = useTempDir("removal");

  test("エディタを閉じた後のdisposeでリスナーが解除され、以降の変更は通知されない", async () => {
    const document = await openCsv(temp.writeCsv("close.csv", "a,b\n1,2\n"));
    await vscode.window.showTextDocument(document);
    const harness = createProviderHarness(document);

    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    harness.disposePanel();
    await replaceAll(document, "a,b\n9,9\n");
    await sleep(50);

    assert.strictEqual(harness.posted.length, 0);
  });

  test("ディスク上のファイル削除後に編集を送っても未処理例外にならずドキュメントへ反映される", async () => {
    const filePath = temp.writeCsv("deleted-update.csv", "a,b\n1,2\n");
    const document = await openCsv(filePath);
    const harness = createProviderHarness(document);
    fs.rmSync(filePath);

    await harness.send({ type: "init" });
    await harness.sendOps([replaceRows(1, 1, [["3", "4"]])]);

    assert.strictEqual(document.getText(), "a,b\n3,4\n");
    assert.ok(document.isDirty);
  });

  test("ディスク上のファイル削除後にsaveを送っても未処理例外にならない", async () => {
    const filePath = temp.writeCsv("deleted-save.csv", "a,b\n1,2\n");
    const document = await openCsv(filePath);
    const harness = createProviderHarness(document);
    fs.rmSync(filePath);

    // reject しないことを確認する。保存結果は環境依存のため内容のみ検証
    await harness.send({ type: "init" });
    await harness.sendOps([replaceRows(1, 1, [["3", "4"]])]);
    await harness.send({ type: "save" });

    assert.strictEqual(document.getText(), "a,b\n3,4\n");
    if (fs.existsSync(filePath)) {
      assert.strictEqual(fs.readFileSync(filePath, "utf8"), "a,b\n3,4\n");
    } else {
      assert.ok(document.isDirty);
    }
  });

  test("ファイル削除後もreloadが動作する", async () => {
    const filePath = temp.writeCsv("deleted-reload.csv", "a,b\n1,2\n");
    const document = await openCsv(filePath);
    const harness = createProviderHarness(document);
    fs.rmSync(filePath);

    await harness.send({ type: "reload" });

    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, document.getText());
  });
});
