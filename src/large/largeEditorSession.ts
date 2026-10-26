import * as vscode from "vscode";

import { getThemeKind } from "../editor/webviewContent";
import {
  isLargeMessageToExtension,
  type LargeMessageToWebview,
  type LargeOp,
} from "../message/largeMessages";
import { isMessageToExtension } from "../message/messageTypeToExtension";
import type { UpdateThemeMessage } from "../message/messageTypeToWebview";
import { disposeAll } from "../util/dispose";
import { logWarning } from "../util/logger";

import type { LargeCsvDocument, LargeDocumentChange } from "./largeCsvDocument";
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
 * 大容量モードの1つの webview パネルとのやり取り。
 *
 * - webview の `init` に `updateTheme` と `large/init` を返す（何度来ても現在の状態を返す。
 *   nextHandle で次に使う追加行のハンドルを伝える）
 * - `init` を受けるまでは何も送らない（webview はそれまで大容量モードの受け手を持たない）
 * - インデックス作成中の進捗と行数の増加は間引いて送る。完了時は間引かずに送る
 * - `large/getRows` は文書の並び（編集を反映したもの）で読む。ハンドルは行のハンドル
 * - `large/applyOps` は文書に当てる。行の取得と編集は文書が届いた順に1つずつ処理する
 *   （受け取ったその場で文書の処理待ちに並べる）。op の revision（webview がハンドルを得たときの revision）から、
 *   どの行のハンドルの体系か（保存・revert で変わる）を決めて文書に渡す
 * - 文書の内容が変わったら（編集・Undo/Redo・保存・revert）、列名を載せた `large/invalidate` を送る
 * - 拒否・不正な編集は `large/error` を送り、楽観的に反映した画面を戻させるため `large/invalidate` も送る
 */
export class LargeEditorSession {
  private readonly disposables: vscode.Disposable[] = [];
  private disposed = false;
  /** webview が `init` を送り、`large/init` を返した後か */
  private ready = false;
  private revision = 0;
  /**
   * 行のハンドルの体系ごとの開始 revision（古い順）。保存・revert で体系が変わったときに送る invalidate の
   * revision を記録する。webview の op の revision がどの体系のハンドルかを決めるのに使う
   */
  private generationStarts: { generation: number; revision: number }[] = [
    { generation: 0, revision: 0 },
  ];
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
      document.onDidChangeContent((change) => {
        this.onContentChanged(change);
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
      case "large/applyOps":
        await this.handleApplyOps(message.ops, message.revision);
        return;
      default:
        // 検索・ソート・フィルタ・範囲コピーは後続フェーズ（2-3 / 2-4）で対応する
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
      nextHandle: this.document.nextHandle,
      revision: this.revision,
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

  private async handleApplyOps(ops: LargeOp[], revision: number): Promise<void> {
    try {
      // 当てたら文書の onDidChangeContent で invalidate を送る
      await this.document.applyOps(ops, this.generationOf(revision));
    } catch (error) {
      if (this.disposed) {
        return;
      }
      this.post({ type: "large/error", message: errorMessage(error) });
      if (this.ready) {
        // webview は送った編集を表示に反映済みなので、文書の状態を取り直させる
        this.postInvalidate(this.document.dataRowCount, this.document.currentHeader);
      }
    }
  }

  /** webview が revision のときに得たハンドルの体系 */
  private generationOf(revision: number): number {
    for (let i = this.generationStarts.length - 1; i >= 0; i--) {
      if (this.generationStarts[i].revision <= revision) {
        return this.generationStarts[i].generation;
      }
    }
    return this.generationStarts[0].generation;
  }

  private onContentChanged(change: LargeDocumentChange): void {
    if (this.disposed) {
      return;
    }
    // init の前でも revision は進める（init はこの revision を運ぶ）
    this.revision += 1;
    if (change.generation !== this.generationStarts[this.generationStarts.length - 1].generation) {
      this.generationStarts.push({ generation: change.generation, revision: this.revision });
      // 付け替えられるのは直前の体系まで。それより古い体系の判別に1つ余分に残す
      this.generationStarts = this.generationStarts.slice(-3);
    }
    if (this.ready) {
      this.postInvalidate(change.rowCount, change.header, this.revision);
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

  /** header は列名が変わったかもしれないときに載せる（省略は「変わっていない」） */
  private postInvalidate(
    rowCount: number,
    header?: string[],
    revision: number = ++this.revision
  ): void {
    this.sentRowCount = rowCount;
    this.post({
      type: "large/invalidate",
      revision,
      rowCount,
      ...(header ? { header } : {}),
    });
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
