import * as assert from "assert";
import { Buffer } from "buffer";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message } from "../message/messageTypeToExtention";

const BOM_BYTES = Buffer.from([0xef, 0xbb, 0xbf]);

interface FormatCase {
  label: string;
  /** ディスク上のバイト列（元ファイル） */
  original: Buffer;
  /** webviewが検出した書式で生成する想定の、セル変更後テキスト（BOMはVSCodeがエンコーディングとして扱うため含まれない） */
  editedFromWebview: string;
  /** 保存後に期待するディスク上のバイト列 */
  expected: Buffer;
}

// 元: a,b / 1,2 の2行。webviewは(b列の2→9)に編集して送信する想定（issue #82）
const CASES: FormatCase[] = [
  {
    label: "CRLF・末尾改行あり",
    original: Buffer.from("a,b\r\n1,2\r\n", "utf8"),
    editedFromWebview: "a,b\r\n1,9\r\n",
    expected: Buffer.from("a,b\r\n1,9\r\n", "utf8"),
  },
  {
    label: "CRLF・末尾改行なし",
    original: Buffer.from("a,b\r\n1,2", "utf8"),
    editedFromWebview: "a,b\r\n1,9",
    expected: Buffer.from("a,b\r\n1,9", "utf8"),
  },
  {
    label: "LF・末尾改行なし",
    original: Buffer.from("a,b\n1,2", "utf8"),
    editedFromWebview: "a,b\n1,9",
    expected: Buffer.from("a,b\n1,9", "utf8"),
  },
  {
    label: "BOM付きUTF-8・CRLF・末尾改行なし",
    original: Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,2", "utf8")]),
    editedFromWebview: "a,b\r\n1,9",
    expected: Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,9", "utf8")]),
  },
  {
    label: "BOM付きUTF-8・LF・末尾改行あり",
    original: Buffer.concat([BOM_BYTES, Buffer.from("a,b\n1,2\n", "utf8")]),
    editedFromWebview: "a,b\n1,9\n",
    expected: Buffer.concat([BOM_BYTES, Buffer.from("a,b\n1,9\n", "utf8")]),
  },
];

suite("CSV書式(改行コード・BOM・末尾改行)の保持", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-format-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

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

  for (const c of CASES) {
    test(`${c.label}: updateとsave後もディスク上のバイト列で書式が保持される`, async function () {
      this.timeout(10000);
      const filePath = path.join(tempDir, "format.csv");
      fs.writeFileSync(filePath, c.original);
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      const harness = createHarness(document);

      await harness.send({ type: "init" });
      await harness.send({ type: "update", payload: c.editedFromWebview });
      await sleep(100);
      await harness.send({ type: "save", payload: c.editedFromWebview });
      await sleep(300);

      assert.strictEqual(document.isDirty, false, "保存済み");
      const actual = fs.readFileSync(filePath);
      assert.deepStrictEqual(
        actual.toString("hex"),
        c.expected.toString("hex"),
        `ディスク上のバイト列が一致する (actual=${JSON.stringify(actual.toString("utf8"))})`
      );
    });
  }

  test("BOM付きファイルでwebviewへ送るテキストにBOM文字が含まれない", async () => {
    const filePath = path.join(tempDir, "bom.csv");
    fs.writeFileSync(filePath, Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,2", "utf8")]));
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const harness = createHarness(document);

    await harness.send({ type: "init" });

    const update = harness.sentMessages.find((m) => m.type === "update");
    assert.ok(update?.payload !== undefined);
    assert.strictEqual(update.payload.includes("﻿"), false);
    assert.strictEqual(update.payload, "a,b\r\n1,2");
  });
});
