/* global AbortController, AbortSignal */
import * as path from "path";
import * as vscode from "vscode";

import { getWebviewHtml } from "../editor/webviewContent";
import { logWarning } from "../util/logger";

import {
  CancelledLargeCsvDocument,
  LargeCsvDocument,
  type LargeCsvDocumentOptions,
  type LargeEditorDocument,
  type UndoRedoResult,
} from "./largeCsvDocument";
import { LargeEditorSession, type LargeWebview } from "./largeEditorSession";
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
  /** 情報メッセージ（保存より前の編集を元に戻せないとき）。既定は showInformationMessage */
  info?: (message: string) => void;
  /** セッションに渡す webview を包む（テストで実際の webview とのやり取りを観測する） */
  wrapWebview?: (webview: LargeWebview) => LargeWebview;
}

const defaultInfo = (message: string) => {
  void vscode.window.showInformationMessage(message);
};

/** CancellationToken を AbortSignal にして渡す */
async function withSignal<T>(
  token: vscode.CancellationToken,
  run: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const subscription = token.onCancellationRequested(() => {
    controller.abort();
  });
  try {
    return await run(controller.signal);
  } finally {
    subscription.dispose();
  }
}

const defaultWarn = (message: string) => {
  logWarning(message);
  void vscode.window.showWarningMessage(message);
};

/**
 * 大容量モード（`csv-editor.largeEditor`）の provider。
 *
 * - 編集: 文書が編集を当てるたびに `CustomDocumentEditEvent` を1件発火する。undo / redo コールバックは
 *   文書の Undo/Redo を呼ぶ（webview は Ctrl+Z / Ctrl+Y を処理せず、VSCode の Undo/Redo に委ねる）
 * - 保存・別名で保存・revert は文書に任せる（`LargeCsvDocument` の説明を参照）。
 *   保存より前の編集の Undo/Redo は何もせず、文書ごとに初回だけ情報メッセージで知らせる（既知の制約）。
 *   別名で保存すると VSCode が保存先を開き直すことがあるので、保存先の文字コードを保留オプションに入れる
 * - バックアップ: TODO(2-4) 本実装する。今は契約を満たすだけで何も書き出さず、復元（backupId 付きの
 *   openCustomDocument）でも無視するため、Hot Exit で未保存の変更は復元されない
 *
 * 文字コードは、入口（openRouting）が保留オプションに入れたものを使う。
 * 無ければ（「Reopen Editor With…」で直接開いたとき）ここで尋ねる。
 * キャンセルされたら CancelledLargeCsvDocument を返し、resolve でパネルを閉じる
 * （openCustomDocument で例外にするとエラー表示のタブが残るため）。
 */
export class LargeCsvEditorProvider implements vscode.CustomEditorProvider<LargeEditorDocument> {
  private readonly editEmitter = new vscode.EventEmitter<
    vscode.CustomDocumentEditEvent<LargeEditorDocument>
  >();
  /** 編集（webview の `large/applyOps` 1通）ごとに1件。VSCode の Undo/Redo とダーティ状態に連動する */
  readonly onDidChangeCustomDocument = this.editEmitter.event;
  /** 「保存より前の編集は元に戻せません」を知らせた文書 */
  private readonly staleNotified = new WeakSet<LargeCsvDocument>();

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
    // TODO(2-4): backupId があればバックアップから未保存の変更を復元する（今は無視する）
    const document = LargeCsvDocument.open(uri, encoding, {
      // 検索・ソート・フィルタのワーカー（esbuild の2つ目のエントリ）
      workerPath: path.join(this.extensionUri.fsPath, "dist", "largeCsvWorker.js"),
      ...this.options.document,
    });
    document.onDidEdit(({ label, epoch }) => {
      this.editEmitter.fire({
        document,
        label,
        undo: () => this.undoRedo(document, document.undo(epoch)),
        redo: () => this.undoRedo(document, document.redo(epoch)),
      });
    });
    return document;
  }

  async saveCustomDocument(
    document: LargeEditorDocument,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    if (document instanceof LargeCsvDocument) {
      await withSignal(cancellation, (signal) => document.save(signal));
    }
  }

  async saveCustomDocumentAs(
    document: LargeEditorDocument,
    destination: vscode.Uri,
    cancellation: vscode.CancellationToken
  ): Promise<void> {
    if (document instanceof LargeCsvDocument) {
      await withSignal(cancellation, (signal) => document.saveAs(destination, signal));
      // VSCode は別名で保存した後に保存先を開き直すことがあるので、文字コードを尋ねずに済むようにする
      this.options.pending.set(destination, document.encoding);
    }
  }

  async revertCustomDocument(
    document: LargeEditorDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    if (document instanceof LargeCsvDocument) {
      await document.revert();
    }
  }

  /**
   * TODO(2-4): 未保存の変更（op ログと元ファイルの mtime・size）をバックアップ先に書き出す。
   * 今は何も書き出さない（復元もしないので、Hot Exit で未保存の変更は失われる）
   */
  backupCustomDocument(
    _document: LargeEditorDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return Promise.resolve({ id: context.destination.toString(), delete: () => {} });
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
    const webview = this.options.wrapWebview?.(webviewPanel.webview) ?? webviewPanel.webview;
    const session = new LargeEditorSession(document, webview, {
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

  private async undoRedo(document: LargeCsvDocument, result: Promise<UndoRedoResult>) {
    if ((await result) !== "stale" || document.isClosed || this.staleNotified.has(document)) {
      return;
    }
    this.staleNotified.add(document);
    (this.options.info ?? defaultInfo)(
      `${path.basename(document.fileUri.fsPath)}: 保存より前の編集は元に戻せません（大容量モードでは保存すると行の番号が変わるため）`
    );
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
