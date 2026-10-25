// WebViewの内容を表示するためのクラス
import * as vscode from "vscode";
import { ThemeKind, UpdateMessage, UpdateThemeMessage } from "../message/messageTypeToWebview";
import { isMessageToExtension } from "../message/messageTypeToExtension";
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

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        payload: document.getText(),
      } satisfies UpdateMessage);
    }
    // webviewから適用した編集のテキスト（エコー抑止用）
    let appliedFromWebview: string | undefined;
    // 編集の適用を直列化するためのキュー
    let editQueue: Promise<unknown> = Promise.resolve();

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
        // webview自身が適用した編集は送り返さない
        if (
          appliedFromWebview !== undefined &&
          CSVEditorProvider.normalizeEol(e.document.getText()) === appliedFromWebview
        ) {
          appliedFromWebview = undefined;
          return;
        }
        updateWebview();
      })
    );

    const applyFromWebview = (csvText: string): Promise<boolean> => {
      const task = editQueue.then(async () => {
        const normalized = CSVEditorProvider.normalizeEol(csvText);
        if (normalized === CSVEditorProvider.normalizeEol(document.getText())) {
          return true;
        }
        appliedFromWebview = normalized;
        const ok = await CSVEditorProvider.replaceWholeDocument(document, csvText);
        if (!ok) {
          appliedFromWebview = undefined;
        }
        return ok;
      });
      editQueue = task.catch(() => undefined);
      return task;
    };

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
          case "update":
            // ドキュメントへ反映のみ行う（保存はしない。ダーティ状態になる）
            if (e.payload !== undefined) {
              await applyFromWebview(e.payload);
            }
            return;
          case "save":
            if (e.payload !== undefined) {
              const ok = await applyFromWebview(e.payload);
              if (!ok) {
                // 外部変更との競合等で反映できなかった。キューを詰まらせないよう待たずに通知する
                void vscode.window.showWarningMessage(
                  "外部で内容が変更されたため保存できませんでした。内容を確認して再度保存してください"
                );
                return;
              }
            }
            await document.save();
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

  private static normalizeEol(text: string): string {
    return text.replace(/\r\n/g, "\n");
  }

  /**
   * ドキュメント全体を置換する。保存はしない。
   */
  private static replaceWholeDocument(
    document: vscode.TextDocument,
    csvText: string
  ): Promise<boolean> {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      document.positionAt(document.getText().length)
    );
    edit.replace(document.uri, fullRange, csvText);
    return Promise.resolve(vscode.workspace.applyEdit(edit));
  }
}
