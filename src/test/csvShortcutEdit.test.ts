import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message } from "../message/messageTypeToExtention";

/**
 * ショートカットによる行・列の挿入/削除 (issue #87)
 *
 * Ctrl/Cmd+Shift+D/I/B/L/R のキー処理自体は webview 内部（DOMのkeydown）で行われるため、
 * 拡張機能テストからは観測できない（webview側は vitest の結合テストで検証）。
 * ここでは観測可能な部分として、ショートカット操作の結果として webview から送られる
 * `update` がドキュメントへ反映・保存されることを検証する。
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

  function createHarness(document: vscode.TextDocument) {
    let messageHandler: ((message: Message) => unknown) | undefined;
    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
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
      send: async (message: Message) => {
        assert.ok(messageHandler, "Message handler should be registered");
        await messageHandler(message);
      },
    };
  }

  async function openDocument() {
    const filePath = path.join(tempDir, "shortcut.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  const cases: Array<[string, string]> = [
    ["行削除 (Ctrl+Shift+D)", ROW_DELETED],
    ["行挿入 (Ctrl+Shift+I/B)", ROW_INSERTED],
    ["列挿入 (Ctrl+Shift+L/R)", COL_INSERTED],
    ["列削除 (Ctrl+Shift+D)", COL_DELETED],
  ];

  for (const [name, edited] of cases) {
    test(`${name} の結果のupdateがドキュメントへ反映される`, async () => {
      const { document } = await openDocument();
      const harness = createHarness(document);

      await harness.send({ type: "init" });
      await harness.send({ type: "update", payload: edited });
      await sleep(100);

      assert.strictEqual(document.getText(), edited);
    });
  }

  test("ショートカット操作後に保存するとディスクへ書き込まれる", async function () {
    this.timeout(10000);
    const { filePath, document } = await openDocument();
    const harness = createHarness(document);

    await harness.send({ type: "init" });
    await harness.send({ type: "update", payload: ROW_DELETED });
    await sleep(100);
    await harness.send({ type: "save", payload: ROW_DELETED });
    await sleep(300);

    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(fs.readFileSync(filePath, "utf8"), ROW_DELETED);
  });
});
