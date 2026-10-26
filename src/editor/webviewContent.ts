import * as vscode from "vscode";
import type { ThemeKind } from "../message/messageTypeToWebview";
import { getUri } from "../util/getUri";
import { getNonce } from "../util/util";

/** VSCode の配色テーマを webview へ送るテーマ種別にする */
export function getThemeKind(): ThemeKind {
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
 * webview（React のビルド成果物）を読み込む HTML。通常モードと大容量モードで共通。
 * どちらのモードかは、webview が送る `init` への応答（`update` か `large/init`）で決まる。
 */
export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
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
