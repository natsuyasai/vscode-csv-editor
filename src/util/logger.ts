import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

/** 警告を出力チャンネルへ書き込む（チャンネルは初回利用時に作成する） */
export function logWarning(message: string): void {
  outputChannel ??= vscode.window.createOutputChannel("CSV Editor");
  outputChannel.appendLine(message);
}

/** 出力チャンネルを破棄する。破棄後に logWarning を呼ぶと再作成される */
export function disposeLogger(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}

/** register が返す Disposable に含めるためのラッパー */
export function loggerDisposable(): vscode.Disposable {
  return new vscode.Disposable(disposeLogger);
}
