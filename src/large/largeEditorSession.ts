import * as vscode from "vscode";

import { getThemeKind } from "../editor/webviewContent";
import { isLargeMessageToExtension, type LargeMessageToWebview } from "../message/largeMessages";
import { isMessageToExtension } from "../message/messageTypeToExtension";
import type { UpdateThemeMessage } from "../message/messageTypeToWebview";
import { disposeAll } from "../util/dispose";
import { logWarning } from "../util/logger";

import type { LargeCsvDocument } from "./largeCsvDocument";
import { LARGE_MODE_RESTRICTIONS } from "./largeRestrictions";

/** セッションが使う webview の機能（テストではやり取りを観測する実装で包む） */
export type LargeWebview = Pick<vscode.Webview, "postMessage" | "onDidReceiveMessage">;

export interface LargeEditorSessionOptions {
  /** 進捗（large/progress）を送る最短の間隔 */
  progressIntervalMs: number;
  /** 作成中の行数の増加（large/invalidate）を送る最短の間隔 */
  invalidateIntervalMs: number;
  now: () => number;
  /** パースできない行が見つかったとき（ファイル上の行番号）。文書ごとに1回だけ知らせるのは呼び出し側 */
  onInvalidRows: (rows: number[]) => void;
}

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** ログ用に不正メッセージの概要だけを返す（内容は出力しない） */
function describeMessage(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return typeof value;
  }
  const { type } = value as { type?: unknown };
  return `type=${typeof type === "string" ? type : typeof type}`;
}

/**
 * 大容量モードの1つの webview パネルとのやり取り（2-1: 閲覧のみ）。
 *
 * - webview の `init` に `updateTheme` と `large/init` を返す（何度来ても現在の状態を返す）
 * - `init` を受けるまでは何も送らない（webview はそれまで大容量モードの受け手を持たない）
 * - インデックス作成中の進捗と行数の増加は間引いて送る。完了時は間引かずに送る
 * - `large/getRows` は表示位置 i をファイルの行 i + 1 として読み、ハンドルはファイル上の行番号
 */
export class LargeEditorSession {
  private readonly disposables: vscode.Disposable[] = [];
  private disposed = false;
  /** webview が `init` を送り、`large/init` を返した後か */
  private ready = false;
  private revision = 0;
  private lastProgressAt = 0;
  private lastInvalidateAt = 0;
  /** webview に最後に知らせたデータ行数 */
  private sentRowCount = 0;
  private indexError: unknown;

  constructor(
    private readonly document: LargeCsvDocument,
    private readonly webview: LargeWebview,
    private readonly options: LargeEditorSessionOptions
  ) {
    this.disposables.push(
      webview.onDidReceiveMessage((message: unknown) => this.receive(message)),
      document.onDidProgress((progress) => {
        this.onProgress(progress.ratio);
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        if (this.ready) {
          this.postTheme();
        }
      })
    );
    document.indexDone.then(
      () => {
        this.onIndexCompleted();
      },
      (error: unknown) => {
        this.onIndexFailed(error);
      }
    );
  }

  dispose(): void {
    this.disposed = true;
    disposeAll(this.disposables);
  }

  private async receive(message: unknown): Promise<void> {
    if (isMessageToExtension(message)) {
      if (message.type === "init") {
        await this.handleInit();
      } else {
        logWarning(
          `大容量モードでは通常モードのメッセージを無視しました (${describeMessage(message)})`
        );
      }
      return;
    }
    if (!isLargeMessageToExtension(message)) {
      logWarning(`想定外のメッセージを無視しました (${describeMessage(message)})`);
      return;
    }
    switch (message.type) {
      case "large/getRows":
        await this.handleGetRows(message.reqId, message.start, message.count);
        return;
      default:
        // 2-1 は閲覧のみ（編集・検索・ソート等は後続フェーズで対応する）
        logWarning(`大容量モードで未対応のメッセージを無視しました (${message.type})`);
        return;
    }
  }

  private async handleInit(): Promise<void> {
    let header: string[] = [];
    let readError: unknown;
    try {
      header = await this.document.readHeader();
    } catch (error) {
      readError = error;
    }
    if (this.disposed) {
      return;
    }
    // 行数・作成中かは送る直前に読む（待っている間に作成が進む・終わる）
    const rowCount = this.document.dataRowCount;
    this.postTheme();
    this.post({
      type: "large/init",
      header,
      rowCount,
      // 作成に失敗したら、確定した行までで作成を終えた扱いにする（その範囲は閲覧できる）
      indexing: this.document.indexing && this.indexError === undefined,
      encoding: this.document.encoding,
      restrictions: [...LARGE_MODE_RESTRICTIONS],
    });
    this.ready = true;
    const now = this.options.now();
    this.lastProgressAt = now;
    this.lastInvalidateAt = now;
    this.sentRowCount = rowCount;
    const error = readError ?? this.indexError;
    if (error !== undefined) {
      this.post({ type: "large/error", message: errorMessage(error) });
    }
  }

  private async handleGetRows(reqId: number, start: number, count: number): Promise<void> {
    try {
      const result = await this.document.readDataRows(start, count);
      if (this.disposed) {
        return;
      }
      if (result.invalidRows.length > 0) {
        this.options.onInvalidRows(result.invalidRows);
      }
      this.post({
        type: "large/rows",
        reqId,
        start: result.start,
        rows: result.rows,
        handles: result.handles,
      });
    } catch (error) {
      if (this.disposed) {
        return;
      }
      this.post({ type: "large/error", message: errorMessage(error), reqId });
    }
  }

  private onProgress(ratio: number): void {
    if (!this.ready || this.disposed || !this.document.indexing || this.indexError !== undefined) {
      // 完了時は onIndexCompleted が間引かずに送る
      return;
    }
    const now = this.options.now();
    if (ratio < 1 && now - this.lastProgressAt >= this.options.progressIntervalMs) {
      this.lastProgressAt = now;
      this.post({ type: "large/progress", kind: "index", ratio });
    }
    const rowCount = this.document.dataRowCount;
    if (
      rowCount !== this.sentRowCount &&
      now - this.lastInvalidateAt >= this.options.invalidateIntervalMs
    ) {
      this.lastInvalidateAt = now;
      this.postInvalidate(rowCount);
    }
  }

  private onIndexCompleted(): void {
    if (!this.ready || this.disposed) {
      // init の前に終わったら、large/init が最終の状態（indexing: false）を運ぶ
      return;
    }
    this.post({ type: "large/progress", kind: "index", ratio: 1 });
    this.postInvalidate(this.document.dataRowCount);
  }

  private onIndexFailed(error: unknown): void {
    if (this.disposed || isAbortError(error)) {
      return;
    }
    this.indexError = error;
    if (this.ready) {
      this.post({ type: "large/error", message: errorMessage(error) });
      this.post({ type: "large/progress", kind: "index", ratio: 1 });
      this.postInvalidate(this.document.dataRowCount);
    }
  }

  private postInvalidate(rowCount: number): void {
    this.revision += 1;
    this.sentRowCount = rowCount;
    this.post({ type: "large/invalidate", revision: this.revision, rowCount });
  }

  private postTheme(): void {
    void this.webview.postMessage({
      type: "updateTheme",
      payload: getThemeKind(),
    } satisfies UpdateThemeMessage);
  }

  private post(message: LargeMessageToWebview): void {
    void this.webview.postMessage(message);
  }
}
