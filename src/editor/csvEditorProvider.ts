// WebViewの内容を表示するためのクラス
import * as vscode from "vscode";
import { ThemeKind, UpdateMessage, UpdateThemeMessage } from "../message/messageTypeToWebview";
import { ApplyOpsMessage, isMessageToExtension } from "../message/messageTypeToExtension";
import { applyRowOpsToText, verifyAppliedRows } from "../shared/csv/applyRowOpsToText";
import type { RowOpsTextEdits } from "../shared/csv/applyRowOpsToText";
import { CsvFormat, DEFAULT_CSV_FORMAT, detectCsvFormat } from "../shared/csv/csvFormat";
import { disposeAll } from "../util/dispose";
import { getUri } from "../util/getUri";
import { loggerDisposable, logWarning } from "../util/logger";
import { getNonce } from "../util/util";

/** ログ用に不正メッセージの概要だけを返す（payload の内容は出力しない） */
function describeInvalidMessage(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return typeof value;
  }
  const { type, payload } = value as { type?: unknown; payload?: unknown };
  return `type=${typeof type === "string" ? type : typeof type}, payload=${typeof payload}`;
}

export class CSVEditorProvider implements vscode.CustomTextEditorProvider {
  /**
   * Register the editor provider.
   *
   * @param context The extension context.
   * @returns A disposable that unregisters the editor provider.
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    // 現在アクティブなファイルを開くコマンドを登録
    const openEditorCommand = vscode.commands.registerCommand("csv-editor.openEditor", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("csv-editor: No active editor.");
        return;
      }
      const uri = activeEditor.document.uri;
      vscode.commands.executeCommand("vscode.openWith", uri, CSVEditorProvider.viewType);
    });

    const customEditorProvider = vscode.window.registerCustomEditorProvider(
      CSVEditorProvider.viewType,
      new CSVEditorProvider(context),
      {
        webviewOptions: {
          enableFindWidget: false,
          retainContextWhenHidden: false,
        },
        supportsMultipleEditorsPerDocument: false, // 同一ドキュメントに対して複数のエディタをサポートするかどうか
      }
    );

    return vscode.Disposable.from(openEditorCommand, customEditorProvider, loggerDisposable());
  }

  // package.jsonのviewTypeと一致させる
  private static readonly viewType = "csv-editor.openEditor";
  private readonly context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Called when our custom editor is opened.
   * 登録している拡張子のファイルを開いたときに呼ばれる
   * コマンドで表示を行った場合もvscode.openWithで実行しているのでこちらが呼ばれる
   *
   */
  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateTheme() {
      webviewPanel.webview.postMessage({
        type: "updateTheme",
        payload: CSVEditorProvider.getThemeKind(),
      } satisfies UpdateThemeMessage);
    }

    // このパネルに紐づく購読。パネルを閉じたときにまとめて解除する
    const disposables: vscode.Disposable[] = [];

    disposables.push(
      vscode.window.onDidChangeActiveColorTheme(() => {
        updateTheme();
      })
    );

    // 全文送信の世代。webview はこの値を applyOps に付けて送り、古い前提の操作を検出する
    let epoch = 0;
    // 最後に全文を送った時点の書式。applyOps のたびに検出し直さない
    // （全行削除の後に行を追加しても、元の改行コード・末尾改行の有無を保つため）
    let format: CsvFormat = DEFAULT_CSV_FORMAT;
    // webview への全文送信。送るたびにエポックを進め、その時点の書式を保持する
    function updateWebview() {
      const text = document.getText();
      epoch += 1;
      format = CSVEditorProvider.detectDocumentFormat(document, text);
      webviewPanel.webview.postMessage({
        type: "update",
        payload: text,
        epoch,
      } satisfies UpdateMessage);
    }
    // 外部変更と競合して webview の編集を反映できなかった（次の保存で警告して保存しない）
    let editDiscarded = false;
    function resync(reason: string) {
      logWarning(`webview の編集を差分で反映できなかったため全文を送り直します (${reason})`);
      updateWebview();
    }
    // 自分（webview 由来）で適用した編集の後の document.version（エコー抑止用）
    let ownVersion: number | undefined;
    // 編集の適用を直列化するためのキュー
    let editQueue: Promise<unknown> = Promise.resolve();
    function enqueue<T>(work: () => Promise<T>): Promise<T> {
      const task = editQueue.then(work);
      editQueue = task.catch(() => undefined);
      return task;
    }

    // Update the webview when the document changes
    disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== document.uri.toString()) {
          return;
        }
        // 保存のみ等、内容に変更がない場合はwebviewへ通知しない
        if (e.contentChanges.length === 0) {
          return;
        }
        // webview自身が適用した編集は送り返さない（変更イベントは applyEdit の解決前に届く）
        if (ownVersion !== undefined && e.document.version === ownVersion) {
          return;
        }
        updateWebview();
      })
    );

    /**
     * webview 由来の編集を適用する。適用後のバージョンを先に記録してエコーを抑止する。
     * 失敗（外部変更と競合）したときは記録を消す。外部変更の通知を抑止していた可能性があるため、
     * 呼び出し側は webview に全文を送り直すこと。
     */
    const applyOwnEdit = async (edit: vscode.WorkspaceEdit): Promise<boolean> => {
      // getText 等の読み取りと同じ同期区間で記録する（1つの WorkspaceEdit でバージョンは1つ進む）
      const expectedVersion = document.version + 1;
      ownVersion = expectedVersion;
      const ok = await vscode.workspace.applyEdit(edit);
      if (!ok) {
        ownVersion = undefined;
        return false;
      }
      if (document.version !== expectedVersion) {
        // 想定外にバージョンが進んだ（他の変更が割り込んだ等）。webview の表示がずれている可能性がある
        resync(`適用後のバージョンが想定と異なります: ${String(document.version)}`);
      }
      return true;
    };

    const applyOps = (message: ApplyOpsMessage): Promise<void> =>
      enqueue(async () => {
        if (message.epoch !== epoch) {
          // 外部変更の前提で作られた操作は適用せず、現在の全文で webview を作り直させる
          editDiscarded = true;
          resync(`エポック不一致: 受信=${String(message.epoch)}, 現在=${String(epoch)}`);
          return;
        }
        // 現在のエポックの操作＝webview は作り直した後の内容を前提に編集している（以前の破棄は確認済み）
        editDiscarded = false;
        // 性能の計測ポイント: getText と applyRowOpsToText（内部で全文を scanRows）は毎回全文を走査する
        // （50MB の走査は node で約226ms）。問題があれば document.version をキーに行オフセット表をキャッシュする
        const text = document.getText();
        let result: RowOpsTextEdits;
        try {
          result = applyRowOpsToText(text, message.ops, format);
        } catch (error) {
          editDiscarded = true;
          resync(error instanceof Error ? error.message : String(error));
          return;
        }
        const edits = result.edits.filter(({ start, end, text: replacement }) => {
          return text.slice(start, end) !== replacement;
        });
        if (edits.length === 0) {
          return;
        }
        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const { start, end, text: replacement } of edits) {
          workspaceEdit.replace(
            document.uri,
            new vscode.Range(document.positionAt(start), document.positionAt(end)),
            replacement
          );
        }
        if (!(await applyOwnEdit(workspaceEdit))) {
          editDiscarded = true;
          resync("差分の適用が拒否されました");
          return;
        }
        if (!verifyAppliedRows(document.getText(), result.rowCount, result.delimiter)) {
          resync("適用後の行構造が操作の結果と一致しません");
        }
      });

    const warnSaveDiscarded = () => {
      // 外部変更との競合等で反映できなかった。キューを詰まらせないよう待たずに通知する
      void vscode.window.showWarningMessage(
        "外部で内容が変更されたため保存できませんでした。内容を確認して再度保存してください"
      );
    };

    /** 先に並んだ編集の適用を待ってから保存する（反映できなかった編集があれば警告して保存しない） */
    const saveAfterQueuedEdits = (): Promise<void> =>
      enqueue(async () => {
        if (editDiscarded) {
          editDiscarded = false;
          warnSaveDiscarded();
          return;
        }
        await document.save();
      });

    // Receive message from the webview.
    disposables.push(
      webviewPanel.webview.onDidReceiveMessage(async (raw: unknown) => {
        // webview は信頼境界の外側のため、想定外のメッセージは無視してログに残す
        if (!isMessageToExtension(raw)) {
          logWarning(`想定外のメッセージを無視しました (${describeInvalidMessage(raw)})`);
          return;
        }
        const e = raw;
        switch (e.type) {
          case "init":
            updateTheme();
            updateWebview();
            return;
          case "applyOps":
            await applyOps(e as ApplyOpsMessage);
            return;
          case "save":
            await saveAfterQueuedEdits();
            return;
          case "reload":
            updateWebview();
            return;
          case "openAsText":
            // CSVとして解析できない場合の退避導線。既定のテキストエディタで開き直す
            await vscode.commands.executeCommand("vscode.openWith", document.uri, "default");
            return;
        }
      })
    );

    // Make sure we get rid of the listeners when our editor is closed.
    webviewPanel.onDidDispose(() => {
      disposeAll(disposables);
    });
  }

  private static getThemeKind(): ThemeKind {
    switch (vscode.window.activeColorTheme.kind) {
      case vscode.ColorThemeKind.Light:
      case vscode.ColorThemeKind.HighContrastLight:
        return "light";
      case vscode.ColorThemeKind.Dark:
      case vscode.ColorThemeKind.HighContrast:
        return "dark";
      default:
        return "light"; // Default to light if unknown
    }
  }

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const extensionUri = this.context.extensionUri;
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
    const codiconsUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "codicon.css",
    ]);

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <!-- CSP は default-src none を基点に必要なものだけ許可する（安全側）。
               img-src / connect-src 等を追加する場合も、必要最小限のソースのみ個別に許可し、unsafe-inline や * は使わないこと -->
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" href="${codiconsUri.toString()}" id="vscode-codicon-stylesheet">
          <link rel="stylesheet" type="text/css" href="${stylesUri.toString()}" />
          <title>CSVEditor</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri.toString()}"></script>
        </body>
      </html>
    `;
  }

  /**
   * 文書の書式を検出する。改行コードは文書のもの（document.eol）を使う。
   * VSCode は読み込み時に改行を1種類へ揃え、挿入した改行も文書の改行コードへ変換するため、
   * 改行を含まないテキスト（空ファイル等）でもテキストからの検出（既定 LF）と食い違わないようにする。
   */
  private static detectDocumentFormat(document: vscode.TextDocument, text: string): CsvFormat {
    return {
      ...detectCsvFormat(text),
      eol: document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n",
    };
  }
}
