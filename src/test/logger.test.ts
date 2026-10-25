import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, afterEach } from "mocha";
import { disposeLogger, logWarning, loggerDisposable } from "../util/logger";

suite("logger (issue #89)", () => {
  const original = vscode.window.createOutputChannel;
  let created: number;
  let disposed: number;

  function stub() {
    created = 0;
    disposed = 0;
    (vscode.window as { createOutputChannel: unknown }).createOutputChannel = () => {
      created++;
      return { appendLine: () => {}, dispose: () => { disposed++; } };
    };
  }

  afterEach(() => {
    disposeLogger();
    (vscode.window as { createOutputChannel: unknown }).createOutputChannel = original;
  });

  test("チャンネルは遅延生成され、Disposable の dispose で破棄される", () => {
    stub();
    disposeLogger();
    assert.strictEqual(created, 0);
    logWarning("a");
    logWarning("b");
    assert.strictEqual(created, 1);
    loggerDisposable().dispose();
    assert.strictEqual(disposed, 1);
  });

  test("dispose 後に再度ログすると再生成される", () => {
    stub();
    disposeLogger();
    logWarning("a");
    loggerDisposable().dispose();
    logWarning("b");
    assert.strictEqual(created, 2);
  });
});
