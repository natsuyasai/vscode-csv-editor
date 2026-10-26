/* global AbortController, AbortSignal */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { getWebviewHtml } from "../editor/webviewContent";
import type { LargeOp } from "../message/largeMessages";
import { logWarning } from "../util/logger";

import {
  CancelledLargeCsvDocument,
  LargeCsvDocument,
  type LargeCsvDocumentOptions,
  type LargeDocumentOpenOptions,
  type LargeEditorDocument,
  type UndoRedoResult,
} from "./largeCsvDocument";
import { readLargeBackup, sameStamp, statFile, writeLargeBackup } from "./largeBackup";
import { LargeEditorSession, type LargeWebview } from "./largeEditorSession";
import type { LargeEncoding } from "./largeEncoding";
import { askLargeEncoding } from "./largePrompts";
import { LargeFileWatcher } from "./largeFileWatcher";
import type { PendingEncodings } from "./pendingEncodings";
import type { PickItem, Picker } from "./picker";

/** package.json の customEditors と一致させる */
export const LARGE_VIEW_TYPE = "csv-editor.largeEditor";

/** 進捗（large/progress）を送る最短の間隔 */
export const PROGRESS_INTERVAL_MS = 100;
/** 作成中の行数の増加（large/invalidate）を送る最短の間隔。webview はキャッシュを全部捨てるので頻度を低くする */
export const INVALIDATE_INTERVAL_MS = 1000;

/** ファイルの変更イベントをまとめる既定の待ち時間 */
export const EXTERNAL_CHANGE_DELAY_MS = 200;

/** バックアップの後に元ファイルが変わっていたときの選択 */
type RestoreChoice = "apply" | "discard";

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
  /** エラーの通知（バックアップを復元できなかったときなど）。既定は showErrorMessage */
  error?: (message: string) => void;
  /** 未保存の変更を破棄して読み直すときに VSCode の revert を実行する（既定はタブを前面にして revert コマンド） */
  revertInEditor?: (document: LargeCsvDocument) => Promise<void>;
  /** ファイルの変更イベントをまとめる待ち時間 */
  externalChangeDelayMs?: number;
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

const defaultError = (message: string) => {
  logWarning(message);
  void vscode.window.showErrorMessage(message);
};

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** 文書のタブを前面にして VSCode の revert を実行する（タブの未保存の状態も戻る） */
async function revertInActiveEditor(document: LargeCsvDocument): Promise<void> {
  await vscode.commands.executeCommand("vscode.openWith", document.uri, LARGE_VIEW_TYPE, {
    preview: false,
    preserveFocus: false,
  });
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  // 別のタブを revert しないよう、前面になったことを確かめる
  if (
    input instanceof vscode.TabInputCustom &&
    input.viewType === LARGE_VIEW_TYPE &&
    input.uri.toString() === document.uri.toString()
  ) {
    await vscode.commands.executeCommand("workbench.action.files.revert");
  }
}

/**
 * 大容量モード（`csv-editor.largeEditor`）の provider。
 *
 * - 編集: 文書が編集を当てるたびに `CustomDocumentEditEvent` を1件発火する。undo / redo コールバックは
 *   文書の Undo/Redo を呼ぶ（webview は Ctrl+Z / Ctrl+Y を処理せず、VSCode の Undo/Redo に委ねる）
 * - 保存・別名で保存・revert は文書に任せる（`LargeCsvDocument` の説明を参照）。
 *   保存より前の編集の Undo/Redo は何もせず、文書ごとに初回だけ情報メッセージで知らせる（既知の制約）。
 *   別名で保存すると VSCode が保存先を開き直すことがあるので、保存先の文字コードを保留オプションに入れる
 * - バックアップ: 文書の backupData（op 列・文字コード・読み書きするファイルとその mtime・size）を JSON で
 *   書き出す（largeBackup.ts）。backupId 付きの openCustomDocument で復元する: 文字コードはバックアップから戻し
 *   （尋ねない）、ファイルの mtime・size が一致すれば、行インデックスの作成後（resolve の後）に op を1単位の編集
 *   として当てる（未保存の状態になり、Undo 1回で戻せる）。一致しなければ適用するか破棄するかを選ばせる
 *   （Esc は適用。変更を失わないため）。読めない・当てられないバックアップは、エラーを出して変更を破棄する
 * - 外部変更: パネルごとに LargeFileWatcher で監視する（largeFileWatcher.ts）
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
  /** 文書の外部変更の監視（別名で保存したら張り替える） */
  private readonly watchers = new WeakMap<LargeCsvDocument, LargeFileWatcher>();

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
    openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<LargeEditorDocument> {
    if (openContext.backupId !== undefined) {
      const restored = await this.openFromBackup(uri, openContext.backupId);
      if (restored) {
        return restored;
      }
    }
    const encoding =
      this.options.pending.take(uri) ??
      (await askLargeEncoding(this.options.picker, path.basename(uri.fsPath)));
    if (encoding === undefined) {
      return new CancelledLargeCsvDocument(uri);
    }
    return this.createDocument(uri, encoding);
  }

  /** バックアップから開く。読めなければエラーを出して undefined（ファイルの状態で開く） */
  private async openFromBackup(
    uri: vscode.Uri,
    backupId: string
  ): Promise<LargeCsvDocument | undefined> {
    const name = path.basename(uri.fsPath);
    let data;
    let fileUri: vscode.Uri;
    try {
      data = await readLargeBackup(vscode.Uri.parse(backupId).fsPath);
      fileUri = vscode.Uri.parse(data.fileUri);
    } catch (error) {
      this.reportError(
        `${name}: バックアップを読めなかったため、未保存の変更を破棄してファイルを開きます（${errorMessage(error)}）`
      );
      return undefined;
    }
    // 文字コードはバックアップから戻す（入口の保留オプションは使わないが、残さない）
    this.options.pending.take(uri);
    if (fileUri.scheme !== "file") {
      fileUri = uri;
    }
    let ops: LargeOp[] = data.ops;
    if (ops.length > 0 && !sameStamp(await statFile(fileUri.fsPath), data.source)) {
      const items: PickItem<RestoreChoice>[] = [
        {
          label: "変更を適用する",
          description: "変更後のファイルに未保存の変更を当てて開きます",
          detail: "行の番号がずれていると、変更が別の行に当たることがあります",
          value: "apply",
        },
        {
          label: "破棄してファイルを開く",
          description: "未保存の変更を捨てて、今のファイルの内容で開きます",
          value: "discard",
        },
      ];
      const choice = await this.options.picker.pick(items, {
        title: `${name}: 未保存の変更をバックアップした後に、ファイルが変更されています`,
        placeHolder:
          "変更を当てると行がずれて別の行に当たるおそれがあります。どうするか選んでください（Esc で適用します）",
      });
      if (choice === "discard") {
        ops = [];
      }
    }
    return this.createDocument(uri, data.encoding, {
      fileUri,
      restoreOps: ops.length > 0 ? ops : undefined,
    });
  }

  private createDocument(
    uri: vscode.Uri,
    encoding: LargeEncoding,
    openOptions?: LargeDocumentOpenOptions
  ): LargeCsvDocument {
    const document = LargeCsvDocument.open(
      uri,
      encoding,
      {
        // 検索・ソート・フィルタのワーカー（esbuild の2つ目のエントリ）
        workerPath: path.join(this.extensionUri.fsPath, "dist", "largeCsvWorker.js"),
        ...this.options.document,
      },
      openOptions
    );
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
      this.watchers.get(document)?.rewatch();
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

  /** 未保存の変更（op 列と、その土台にしたファイルの mtime・size）をバックアップ先に書き出す */
  async backupCustomDocument(
    document: LargeEditorDocument,
    context: vscode.CustomDocumentBackupContext,
    cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    const file = context.destination.fsPath;
    if (document instanceof LargeCsvDocument) {
      const data = await document.backupData();
      await withSignal(cancellation, (signal) => writeLargeBackup(file, data, signal));
    }
    return {
      id: context.destination.toString(),
      delete: () => {
        void fs.promises.rm(file, { force: true }).catch((error: unknown) => {
          logWarning(`バックアップを削除できませんでした: ${errorMessage(error)}`);
        });
      },
    };
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
    const watcher = new LargeFileWatcher(document, {
      picker: this.options.picker,
      warn: this.options.warn ?? defaultWarn,
      error: (message) => {
        this.reportError(message);
      },
      revertInEditor: this.options.revertInEditor ?? revertInActiveEditor,
      delayMs: this.options.externalChangeDelayMs ?? EXTERNAL_CHANGE_DELAY_MS,
    });
    this.watchers.set(document, watcher);
    webviewPanel.onDidDispose(() => {
      session.dispose();
      watcher.dispose();
      if (this.watchers.get(document) === watcher) {
        this.watchers.delete(document);
      }
    });
    // バックアップから開いた文書は、パネルができてから（VSCode が文書を知ってから）変更を当てる
    if (!document.restoreSettled) {
      document.applyPendingRestore().catch((error: unknown) => {
        if (!document.isClosed) {
          this.reportError(
            `${path.basename(document.uri.fsPath)}: バックアップの未保存の変更を当てられなかったため、変更を破棄しました（${errorMessage(error)}）`
          );
        }
      });
    }
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

  private reportError(message: string): void {
    (this.options.error ?? defaultError)(message);
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
