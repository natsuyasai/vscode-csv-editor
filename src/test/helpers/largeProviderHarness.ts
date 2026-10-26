import * as assert from "assert";
import { setImmediate as nextTurn } from "timers/promises";
import * as vscode from "vscode";

import { LargeCsvDocument, type LargeEditorDocument } from "../../large/largeCsvDocument";
import {
  LargeCsvEditorProvider,
  type LargeCsvEditorProviderOptions,
} from "../../large/largeCsvEditorProvider";

/** webview へ送られたメッセージ（大容量モードと共通の updateTheme） */
export interface LargePosted {
  type: string;
  [key: string]: unknown;
}

const token: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

/**
 * LargeCsvEditorProvider の openCustomDocument → resolveCustomEditor を、
 * モックの webview / panel で駆動するハーネス。
 * openContext でバックアップからの復元（backupId）を渡せる。
 */
export async function openLargeEditor(
  uri: vscode.Uri,
  options: LargeCsvEditorProviderOptions,
  openContext: vscode.CustomDocumentOpenContext = {
    backupId: undefined,
    untitledDocumentData: undefined,
  }
) {
  let messageHandler: ((message: unknown) => unknown) | undefined;
  const disposeHandlers: Array<() => void> = [];
  const posted: LargePosted[] = [];
  let panelDisposed = false;

  const webview = {
    html: "",
    options: {},
    cspSource: "vscode-resource:",
    asWebviewUri: (u: vscode.Uri) => u,
    postMessage: (message: LargePosted) => {
      posted.push(message);
      return Promise.resolve(true);
    },
    onDidReceiveMessage: (handler: (message: unknown) => unknown) => {
      messageHandler = handler;
      return { dispose: () => {} };
    },
  };
  const firePanelDispose = () => {
    if (panelDisposed) {
      return;
    }
    panelDisposed = true;
    for (const handler of disposeHandlers) {
      handler();
    }
  };
  const panel = {
    webview,
    title: "CSV Editor (Large File)",
    onDidDispose: (handler: () => void) => {
      disposeHandlers.push(handler);
      return { dispose: () => {} };
    },
    onDidChangeViewState: () => ({ dispose: () => {} }),
    dispose: firePanelDispose,
  } as unknown as vscode.WebviewPanel;

  const provider = new LargeCsvEditorProvider(vscode.Uri.parse("file:///fake"), options);
  /** provider が通知した編集（VSCode の Undo/Redo の単位） */
  const edits: vscode.CustomDocumentEditEvent<LargeEditorDocument>[] = [];
  const editSubscription = provider.onDidChangeCustomDocument((event) => {
    edits.push(event);
  });
  const document: LargeEditorDocument = await provider.openCustomDocument(uri, openContext, token);
  provider.resolveCustomEditor(document, panel, token);

  const send = async (message: unknown) => {
    assert.ok(messageHandler, "メッセージの受け手が登録されている");
    await messageHandler(message);
  };

  return {
    provider,
    document,
    edits,
    token,
    posted,
    webview,
    send,
    get panelDisposed() {
      return panelDisposed;
    },
    /** 種別ごとの送信済みメッセージ */
    postedOf: (type: string) => posted.filter((m) => m.type === type),
    /** パネルを閉じる（VSCode が文書も破棄する） */
    close: async () => {
      editSubscription.dispose();
      firePanelDispose();
      document.dispose();
      if (document instanceof LargeCsvDocument) {
        await document.whenClosed();
      }
    },
  };
}

/** 条件を満たすまで待つ（上限付き。満たさなければ失敗） */
export async function waitUntil(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("待機がタイムアウトしました");
    }
    await nextTurn();
  }
}

/** 保留中の非同期処理（Promise の後続・ファイル読み取り）を進める */
export async function settle(turns = 20): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await nextTurn();
  }
}
