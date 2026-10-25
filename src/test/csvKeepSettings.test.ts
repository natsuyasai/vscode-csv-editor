import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message } from "../message/messageTypeToExtension";

/**
 * 列・行の挿入/削除/移動の結果の反映 (issue #86)
 *
 * 列幅・文字寄せ・行の高さは webview 内部のReact状態でありドキュメントへ保存されない
 * （webviewとの通信は init/update/reload/save のみ）。そのため拡張機能テストからは
 * 「設定が同じ列・行に付いたままか」を観測できず、その検証は webview 側の vitest 結合テスト
 * (EditableTable.keepSettings.spec.tsx) で行う。
 * ここでは観測可能な部分として、列・行の構造変更の結果として webview から送られる
 * `update` がドキュメントへ正しく反映されることを検証する。
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
    const filePath = path.join(tempDir, "keep-settings.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  const cases: Array<[string, string]> = [
    ["列の左に挿入", "name,new column,num\na,,3\nb,,1\nc,,2\n"],
    ["列の削除", "num\n3\n1\n2\n"],
    ["列の移動", "num,name\n3,a\n1,b\n2,c\n"],
    ["行の上に挿入", "name,num\n,\na,3\nb,1\nc,2\n"],
    ["行の削除", "name,num\nb,1\nc,2\n"],
    ["行の移動", "name,num\nb,1\nc,2\na,3\n"],
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
});
