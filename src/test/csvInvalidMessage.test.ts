import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";

/**
 * webview から届く不正なメッセージの無視 (issue #89)
 * webview は信頼境界の外側のため、型・payload が想定外のメッセージは無視する。
 */
suite("不正な webview メッセージの無視 (issue #89)", () => {
  const ORIGINAL = "name,num\na,3\nb,1\n";
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-invalid-msg-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function createHarness(document: vscode.TextDocument) {
    let messageHandler: ((message: unknown) => unknown) | undefined;
    const posted: unknown[] = [];
    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (m: unknown) => {
        posted.push(m);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: unknown) => unknown) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;
    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;
    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext;
    new CSVEditorProvider(context).resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });
    return {
      posted,
      send: async (message: unknown) => {
        assert.ok(messageHandler, "Message handler should be registered");
        await messageHandler(message);
      },
    };
  }

  const invalidMessages: Array<[string, unknown]> = [
    ["undefined", undefined],
    ["null", null],
    ["文字列", "update"],
    ["type 欠落", {}],
    ["未知の type", { type: "evil", payload: "x" }],
    ["type が文字列でない", { type: 1, payload: "x" }],
    ["update の payload 欠落", { type: "update" }],
    ["update の payload が number", { type: "update", payload: 123 }],
    ["update の payload が object", { type: "update", payload: { a: 1 } }],
    ["save の payload 欠落", { type: "save" }],
    ["save の payload が number", { type: "save", payload: 1 }],
    ["webview 向け type (updateTheme)", { type: "updateTheme", payload: "dark" }],
  ];

  invalidMessages.forEach(([name, message]) => {
    test(`${name} はドキュメントを変更せず例外にもならない`, async () => {
      const filePath = path.join(tempDir, "invalid.csv");
      fs.writeFileSync(filePath, ORIGINAL, "utf8");
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      const harness = createHarness(document);

      await harness.send(message);
      await sleep(100);

      assert.strictEqual(document.getText(), ORIGINAL);
      assert.strictEqual(document.isDirty, false);
      assert.strictEqual(fs.readFileSync(filePath, "utf8"), ORIGINAL);
      assert.strictEqual(harness.posted.length, 0, "何も送り返さない");
    });
  });

  test("不正メッセージの後でも正常な update は反映される", async () => {
    const filePath = path.join(tempDir, "valid-after.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const harness = createHarness(document);

    await harness.send({ type: "update", payload: 1 });
    await harness.send({ type: "update", payload: "name,num\na,3\nb,2\n" });
    await sleep(100);

    assert.strictEqual(document.getText(), "name,num\na,3\nb,2\n");
  });
});
