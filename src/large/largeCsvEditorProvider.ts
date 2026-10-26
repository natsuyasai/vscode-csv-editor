import * as path from "path";
import * as vscode from "vscode";

import { getWebviewHtml } from "../editor/webviewContent";
import { logWarning } from "../util/logger";

import {
  CancelledLargeCsvDocument,
  LargeCsvDocument,
  type LargeCsvDocumentOptions,
  type LargeEditorDocument,
} from "./largeCsvDocument";
import { LargeEditorSession } from "./largeEditorSession";
import { askLargeEncoding } from "./largePrompts";
import type { PendingEncodings } from "./pendingEncodings";
import type { Picker } from "./picker";

/** package.json の customEditors と一致させる */
export const LARGE_VIEW_TYPE = "csv-editor.largeEditor";

/** 進捗（large/progress）を送る最短の間隔 */
export const PROGRESS_INTERVAL_MS = 100;
/** 作成中の行数の増加（large/invalidate）を送る最短の間隔。webview はキャッシュを全部捨てるので頻度を低くする */
export const INVALIDATE_INTERVAL_MS = 1000;

/** 警告に載せるパースできない行の数 */
const MAX_REPORTED_INVALID_ROWS = 5;

export interface LargeCsvEditorProviderOptions {
  picker: Picker;
  pending: PendingEncodings;
  document?: LargeCsvDocumentOptions;
  progressIntervalMs?: number;
  invalidateIntervalMs?: number;
  /** 現在時刻（間引きの判定用。テストで差し替える） */
  now?: () => number;
  /** パースできない行があったときの通知（文書ごとに1回）。既定は出力チャンネルと警告の通知 */
  warn?: (message: string) => void;
}

const defaultWarn = (message: string) => {
  logWarning(message);
  void vscode.window.showWarningMessage(message);
};

/**
 * 大容量モード（`csv-editor.largeEditor`）の provider。2-1 は読み取り専用。
 * 2-2 で `CustomEditorProvider`（編集・保存・Undo/Redo・バックアップ）に拡張する。
 *
 * 文字コードは、入口（openRouting）が保留オプションに入れたものを使う。
 * 無ければ（「Reopen Editor With…」で直接開いたとき）ここで尋ねる。
 * キャンセルされたら CancelledLargeCsvDocument を返し、resolve でパネルを閉じる
 * （openCustomDocument で例外にするとエラー表示のタブが残るため）。
 */
export class LargeCsvEditorProvider implements vscode.CustomReadonlyEditorProvider<LargeEditorDocument> {
  /** パースできない行を警告済みの文書 */
  private readonly warnedDocuments = new WeakSet<LargeCsvDocument>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly options: LargeCsvEditorProviderOptions
  ) {}

  static register(
    context: vscode.ExtensionContext,
    options: LargeCsvEditorProviderOptions
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      LARGE_VIEW_TYPE,
      new LargeCsvEditorProvider(context.extensionUri, options),
      {
        webviewOptions: { enableFindWidget: false, retainContextWhenHidden: false },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<LargeEditorDocument> {
    const encoding =
      this.options.pending.take(uri) ??
      (await askLargeEncoding(this.options.picker, path.basename(uri.fsPath)));
    if (encoding === undefined) {
      return new CancelledLargeCsvDocument(uri);
    }
    return LargeCsvDocument.open(uri, encoding, this.options.document);
  }

  resolveCustomEditor(
    document: LargeEditorDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    if (document instanceof CancelledLargeCsvDocument) {
      webviewPanel.dispose();
      return;
    }
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, this.extensionUri);
    const session = new LargeEditorSession(document, webviewPanel.webview, {
      progressIntervalMs: this.options.progressIntervalMs ?? PROGRESS_INTERVAL_MS,
      invalidateIntervalMs: this.options.invalidateIntervalMs ?? INVALIDATE_INTERVAL_MS,
      now: this.options.now ?? Date.now,
      onInvalidRows: (rows) => {
        this.warnInvalidRows(document, rows);
      },
    });
    webviewPanel.onDidDispose(() => {
      session.dispose();
    });
  }

  private warnInvalidRows(document: LargeCsvDocument, rows: number[]): void {
    if (this.warnedDocuments.has(document)) {
      return;
    }
    this.warnedDocuments.add(document);
    const lines = rows
      .slice(0, MAX_REPORTED_INVALID_ROWS)
      .map((row) => String(row + 1))
      .join(", ");
    const more = rows.length > MAX_REPORTED_INVALID_ROWS ? " など" : "";
    (this.options.warn ?? defaultWarn)(
      `${path.basename(document.uri.fsPath)}: CSV として解析できない行があります（${lines} 行目${more}）。その行は1つのセルにそのまま表示します`
    );
  }
}
