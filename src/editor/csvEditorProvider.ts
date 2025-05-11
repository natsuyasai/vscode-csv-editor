// WebViewの内容を表示するためのクラス
import * as vscode from "vscode";
import { MessageType as MessageTypeToWebview, UpdateMessage } from "@message/messageTypeToWebview";
import { MessageType as MessageTypeFromWebview } from "@message/messageTypeToExtention";
import { getUri } from "@util/getUri";
import { getNonce } from "@util/util";

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
        webviewOptions: {},
        supportsMultipleEditorsPerDocument: false, // 同一ドキュメントに対して複数のエディタをサポートするかどうか
      }
    );
  }

  // package.jsonのviewTypeと一致させる
  private static readonly viewType = "csv-editor.openEditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when our custom editor is opened.
   * 登録している拡張子のファイルを開いたときに呼ばれる
   * コマンドで表示を行った場合もvscode.openWithで実行しているのでこちらが呼ばれる
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        payload: document.getText(),
      } as UpdateMessage);
    }
    // Update the webview when the document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    const changeViewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        // The webview is visible, so we can update it with the current document content.
        updateWebview();
      }
    });

    // Receive message from the webview.
    const webviewReceiveMessageSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (e) => {
        console.log(`${e.type}:${e.payload}`);
        switch (e.type as MessageTypeFromWebview) {
          case "update":
            this.updateTextDocument(document, e.payload);
            return;
          case "save":
            this.updateTextDocument(document, e.payload);
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
      changeViewStateSubscription.dispose();
      webviewReceiveMessageSubscription.dispose();
    });

    updateWebview();
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

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>CSVEditor</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private updateTextDocument(document: vscode.TextDocument, jsonString: string) {
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), jsonString);

    return vscode.workspace.applyEdit(edit);
  }
}
