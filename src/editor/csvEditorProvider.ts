// WebViewの内容を表示するためのクラス
import * as vscode from "vscode";
import { ThemeKind, UpdateMessage, UpdateTheameMessage } from "../message/messageTypeToWebview";
import { Message } from "../message/messageTypeToExtention";
import { getUri } from "../util/getUri";
import { getNonce } from "../util/util";

export class CSVEditorProvider implements vscode.CustomTextEditorProvider {
  /**
   * Register the editor provider.
   *
   * @param context The extension context.
   * @returns A disposable that unregisters the editor provider.
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    // 現在アクティブなファイルを開くコマンドを登録
    vscode.commands.registerCommand("csv-editor.openEditor", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showErrorMessage("csv-editor: No active editor.");
        return;
      }
      const uri = activeEditor.document.uri;
      vscode.commands.executeCommand("vscode.openWith", uri, CSVEditorProvider.viewType);
    });

    return vscode.window.registerCustomEditorProvider(
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
      } satisfies UpdateTheameMessage);
    }

    vscode.window.onDidChangeActiveColorTheme(() => {
      updateTheme();
    });

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        payload: document.getText(),
      } satisfies UpdateMessage);
    }
    // Update the webview when the document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    // Receive message from the webview.
    const webviewReceiveMessageSubscription = webviewPanel.webview.onDidReceiveMessage(
      (e: Message) => {
        // console.log(`${e.type}:${e.payload}`);
        switch (e.type) {
          case "init":
            updateTheme();
            updateWebview();
            return;
          case "update":
            if (e.payload !== undefined) {
              this.updateTextDocument(document, e.payload);
            }
            return;
          case "save":
            if (e.payload !== undefined) {
              this.updateTextDocument(document, e.payload);
            }
            return;
          case "reload":
            updateWebview();
            return;
        }
      }
    );

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      webviewReceiveMessageSubscription.dispose();
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

  private updateTextDocument(document: vscode.TextDocument, csvText: string) {
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), csvText);
    vscode.workspace.applyEdit(edit);

    return vscode.workspace.save(document.uri);
  }
}
