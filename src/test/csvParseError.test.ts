import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message } from "../message/messageTypeToExtension";

const VIEW_TYPE = "csv-editor.openEditor";

// 列数不揃い / 閉じていないクォート（issue #81）
const MALFORMED_CSVS: Record<string, string> = {
  列数不揃い: "a,b,c\n1,2\n",
  クォート不正: 'a,b\n"x,1\n',
};

suite("CSV解析エラー時の挙動", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-parse-error-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function createCsv(name: string, content: string): vscode.Uri {
    const csvPath = path.join(tempDir, name);
    fs.writeFileSync(csvPath, content, "utf8");
    return vscode.Uri.file(csvPath);
  }

  function createHarness(document: vscode.TextDocument) {
    const sentMessages: { type: string; payload?: string }[] = [];
    let messageHandler: ((message: Message) => unknown) | undefined;
    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        sentMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => unknown) => {
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
      sentMessages,
      send: async (message: Message) => {
        assert.ok(messageHandler, "Message handler should be registered");
        await messageHandler(message);
      },
    };
  }

  for (const [label, content] of Object.entries(MALFORMED_CSVS)) {
    test(`${label}のCSVをカスタムエディタで開いてもドキュメントは変更されない`, async function () {
      this.timeout(10000);
      const uri = createCsv("malformed.csv", content);

      await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
      await sleep(1000);

      const document = await vscode.workspace.openTextDocument(uri);
      assert.strictEqual(document.getText(), content, "内容が書き換えられていない");
      assert.strictEqual(document.isDirty, false, "ダーティ化されていない");
      assert.strictEqual(fs.readFileSync(uri.fsPath, "utf8"), content, "ファイルは未変更");
    });

    test(`${label}のCSVでinitしても拡張機能側はドキュメントを変更せず原文を送る`, async () => {
      const uri = createCsv("malformed.csv", content);
      const document = await vscode.workspace.openTextDocument(uri);
      const harness = createHarness(document);

      await harness.send({ type: "init" });
      await sleep(100);

      assert.strictEqual(document.isDirty, false);
      assert.strictEqual(document.getText(), content);
      const update = harness.sentMessages.find((m) => m.type === "update");
      assert.strictEqual(update?.payload, content, "原文がそのままwebviewへ送られる");
    });
  }

  test("openAsTextメッセージで既定のテキストエディタで開き直される", async function () {
    this.timeout(10000);
    const uri = createCsv("malformed.csv", MALFORMED_CSVS["クォート不正"]);

    await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
    await sleep(1000);
    const document = await vscode.workspace.openTextDocument(uri);
    const harness = createHarness(document);

    const before = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    assert.ok(before instanceof vscode.TabInputCustom, "カスタムエディタで開いている");
    assert.strictEqual(before.viewType, VIEW_TYPE);

    await harness.send({ type: "openAsText" });
    await sleep(1000);

    const after = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    assert.ok(after instanceof vscode.TabInputText, "既定のテキストエディタで開かれる");
    assert.strictEqual(after.uri.toString(), uri.toString());
    assert.strictEqual(document.isDirty, false, "開き直してもダーティ化されない");
  });
});
