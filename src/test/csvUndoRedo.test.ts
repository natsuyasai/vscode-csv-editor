import * as assert from "assert";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, useTempDir } from "./helpers/providerHarness";

suite("VSCodeのUndo/Redoとwebviewの同期", () => {
  const temp = useTempDir("undo-redo");
  const ORIGINAL = "a,b\n1,2\n";
  const EDITED = "a,b\n1,2\n3,4\n";

  async function waitFor(predicate: () => boolean, timeoutMs = 3000) {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("待機がタイムアウトしました");
      }
      await sleep(25);
    }
  }

  async function setup(name: string) {
    const document = await openCsv(temp.writeCsv(name, ORIGINAL));
    await vscode.window.showTextDocument(document);
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    await harness.send({ type: "update", payload: EDITED });
    await sleep(50);
    assert.strictEqual(document.getText(), EDITED);
    return { document, harness };
  }

  test("webviewからのupdate適用後にundoするとドキュメントが戻り、webviewへ通知される", async () => {
    const { document, harness } = await setup("undo.csv");
    const before = harness.postedOf("update").length;

    await vscode.commands.executeCommand("undo");
    await waitFor(() => harness.postedOf("update").length > before);

    assert.strictEqual(document.getText(), ORIGINAL);
    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, ORIGINAL);
  });

  test("undo後にredoするとドキュメントが再度進み、webviewへ通知される", async () => {
    const { document, harness } = await setup("redo.csv");
    await vscode.commands.executeCommand("undo");
    await waitFor(() => document.getText() === ORIGINAL);
    const before = harness.postedOf("update").length;

    await vscode.commands.executeCommand("redo");
    await waitFor(() => harness.postedOf("update").length > before);

    assert.strictEqual(document.getText(), EDITED);
    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, EDITED);
  });
});
