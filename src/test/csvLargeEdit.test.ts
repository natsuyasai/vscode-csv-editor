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
 * 大きなCSV(1万行)の編集結果の反映 (issue #90)
 *
 * webviewのデータ管理(行ID・状態の一本化)は内部実装のため直接観測できない。
 * 観測可能な範囲として、1万行のCSVでwebviewから送られる `update` / `save` が
 * 1セルだけ変更された内容でドキュメントとディスクへ正しく反映されることを検証する。
 */
suite("大きなCSVの編集結果の反映 (issue #90)", () => {
  const ROWS = 10_000;
  const COLS = 20;
  const LF = "\n";
  const header = Array.from({ length: COLS }, (_, c) => "h" + String(c)).join(",");
  const bodyLines = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => `r${String(r)}c${String(c)}`).join(",")
  );
  const ORIGINAL = [header, ...bodyLines].join(LF) + LF;
  const EDITED_ROW = 5000;
  const editedLines = [...bodyLines];
  editedLines[EDITED_ROW] = editedLines[EDITED_ROW].replace("r5000c3", "edited");
  const EDITED = [header, ...editedLines].join(LF) + LF;

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-"));
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
    const filePath = path.join(tempDir, "large.csv");
    fs.writeFileSync(filePath, ORIGINAL, "utf8");
    return {
      filePath,
      document: await vscode.workspace.openTextDocument(vscode.Uri.file(filePath)),
    };
  }

  test("1万行のCSVで1セルを編集したupdateがその1セルだけ変更してドキュメントへ反映される", async function () {
    this.timeout(30000);
    const { document } = await openDocument();
    assert.strictEqual(document.lineCount - 1, ROWS + 1);
    const harness = createHarness(document);

    await harness.send({ type: "init" });
    await harness.send({ type: "update", payload: EDITED });
    await sleep(200);

    assert.strictEqual(document.getText(), EDITED);
    assert.ok(document.isDirty);
    assert.strictEqual(document.lineAt(EDITED_ROW + 1).text.split(",")[3], "edited");
  });

  test("1万行のCSVを保存すると編集内容がディスクへ書き込まれる", async function () {
    this.timeout(30000);
    const { filePath, document } = await openDocument();
    const harness = createHarness(document);

    await harness.send({ type: "init" });
    await harness.send({ type: "update", payload: EDITED });
    await sleep(200);
    await harness.send({ type: "save", payload: EDITED });
    await sleep(500);

    assert.strictEqual(document.isDirty, false);
    assert.strictEqual(fs.readFileSync(filePath, "utf8"), EDITED);
  });
});
