import type * as vscode from "vscode";

import type { LargeEncoding } from "./largeEncoding";

/**
 * 「保留オプション」: 入口で選んだ文字コードを、`openWith` の後に呼ばれる
 * `LargeCsvEditorProvider.openCustomDocument` へ渡す（URI → 文字コード）。
 */
export class PendingEncodings {
  private readonly map = new Map<string, LargeEncoding>();

  set(uri: vscode.Uri, encoding: LargeEncoding): void {
    this.map.set(uri.toString(), encoding);
  }

  /** 取り出して消す（1回だけ使う） */
  take(uri: vscode.Uri): LargeEncoding | undefined {
    const key = uri.toString();
    const encoding = this.map.get(key);
    this.map.delete(key);
    return encoding;
  }

  delete(uri: vscode.Uri): void {
    this.map.delete(uri.toString());
  }
}
