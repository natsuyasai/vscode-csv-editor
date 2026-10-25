import * as assert from "assert";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

suite("パネルdispose後のリスナー解除", () => {
  const temp = useTempDir("dispose");

  test("dispose前はドキュメント変更が通知され、dispose後は通知されない", async () => {
    const document = await openCsv(temp.writeCsv("dispose.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);

    await replaceAll(document, "a,b\n3,4\n");
    await sleep(50);
    assert.strictEqual(harness.postedOf("update").length, 1, "表示中は通知する");

    harness.disposePanel();
    await replaceAll(document, "a,b\n5,6\n");
    await sleep(50);

    assert.strictEqual(harness.postedOf("update").length, 1, "dispose後は通知しない");
  });

  test("dispose後はテーマ変更も通知されない", async () => {
    const document = await openCsv(temp.writeCsv("dispose-theme.csv", "a,b\n1,2\n"));
    const themeEmitter = new vscode.EventEmitter<vscode.ColorTheme>();
    const windowApi = vscode.window as {
      onDidChangeActiveColorTheme: vscode.Event<vscode.ColorTheme>;
    };
    const original = windowApi.onDidChangeActiveColorTheme;
    windowApi.onDidChangeActiveColorTheme = themeEmitter.event;
    try {
      const harness = createProviderHarness(document);
      themeEmitter.fire(vscode.window.activeColorTheme);
      assert.strictEqual(harness.postedOf("updateTheme").length, 1);

      harness.disposePanel();
      themeEmitter.fire(vscode.window.activeColorTheme);

      assert.strictEqual(harness.postedOf("updateTheme").length, 1);
    } finally {
      windowApi.onDidChangeActiveColorTheme = original;
      themeEmitter.dispose();
    }
  });

  test("dispose済みパネルと新しいパネルが共存しても、新しいパネルだけが通知を受ける", async () => {
    const document = await openCsv(temp.writeCsv("dispose-reopen.csv", "a,b\n1,2\n"));
    const first = createProviderHarness(document);
    first.disposePanel();
    const second = createProviderHarness(document);

    await replaceAll(document, "a,b\n7,8\n");
    await sleep(50);

    assert.strictEqual(first.posted.length, 0);
    assert.strictEqual(second.postedOf("update").length, 1);
  });
});
