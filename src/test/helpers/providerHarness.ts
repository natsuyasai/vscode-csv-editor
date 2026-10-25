import * as assert from "assert";
import { afterEach, beforeEach } from "mocha";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { CSVEditorProvider } from "../../editor/csvEditorProvider";
import { Message } from "../../message/messageTypeToExtension";

/** webviewへ送られたメッセージ */
export interface PostedMessage {
  type: string;
  payload?: unknown;
}

/**
 * resolveCustomTextEditor をモックの webview / panel で駆動するハーネス。
 * webview→拡張のメッセージ送信、拡張→webviewの postMessage 捕捉、パネル dispose を模擬できる。
 */
export function createProviderHarness(document: vscode.TextDocument) {
  let messageHandler: ((message: unknown) => unknown) | undefined;
  const disposeHandlers: Array<() => void> = [];
  const posted: PostedMessage[] = [];

  const mockWebview = {
    html: "",
    cspSource: "vscode-resource:",
    asWebviewUri: (uri: vscode.Uri) => uri,
    postMessage: (message: PostedMessage) => {
      posted.push(message);
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
    onDidDispose: (handler: () => void) => {
      disposeHandlers.push(handler);
      return { dispose: () => {} };
    },
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
    send: async (message: Message) => {
      assert.ok(messageHandler, "Message handler should be registered");
      await messageHandler(message);
    },
    /** webviewパネルが閉じられたことを模擬する */
    disposePanel: () => {
      for (const handler of disposeHandlers) {
        handler();
      }
    },
    /** 種別ごとの送信済みメッセージ */
    postedOf: (type: string) => posted.filter((m) => m.type === type),
  };
}

/** 一時ファイルパスのドキュメントを開く */
export async function openCsv(filePath: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
}

/**
 * suite 内で呼び出し、テストごとに一時ディレクトリを用意/後始末する。
 * afterEach で全エディタも閉じる。
 */
export function useTempDir(tag: string) {
  let tempDir = "";
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `csv-editor-${tag}-`));
  });
  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
  return {
    writeCsv: (name: string, content: string): string => {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, content, "utf8");
      return filePath;
    },
  };
}

/** ドキュメント全体を置換する（外部拡張による変更の模擬） */
export async function replaceAll(document: vscode.TextDocument, text: string): Promise<boolean> {
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);
  return vscode.workspace.applyEdit(edit);
}
