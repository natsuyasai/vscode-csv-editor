import { performance } from "perf_hooks";
import { setTimeout as sleep } from "timers/promises";
import type * as vscode from "vscode";

import type { LargeWebview } from "../../large/largeEditorSession";

/** 観測したメッセージ（toExtension: webview → 拡張機能、toWebview: 拡張機能 → webview） */
export interface TappedMessage {
  direction: "toExtension" | "toWebview";
  message: { type?: unknown; [key: string]: unknown };
  /** performance.now() の時刻 */
  at: number;
}

type Message = TappedMessage["message"];

/** 条件を満たすまで待つ（上限付き。満たさなければ失敗） */
export async function waitFor(predicate: () => boolean, what: string, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`待機がタイムアウトしました: ${what}`);
    }
    await sleep(20);
  }
}

/**
 * 大容量モードの provider と実際の webview の間に挟み、やり取りを記録する（テストモードの API に渡す）。
 * 実際の webview（webview-ui/build）が送った `init` / `large/getRows` と、provider の応答を観測できる。
 * `deliver` で webview から届いたかのようにメッセージを渡すこともできる（webview を操作できない操作の代わり）。
 */
export class WebviewTap {
  readonly log: TappedMessage[] = [];
  private listener: ((message: unknown) => unknown) | undefined;

  readonly wrap = (webview: LargeWebview): LargeWebview => ({
    postMessage: (message: unknown) => {
      this.record("toWebview", message);
      return webview.postMessage(message);
    },
    onDidReceiveMessage: (
      listener: (message: unknown) => unknown,
      thisArgs?: unknown,
      disposables?: vscode.Disposable[]
    ) => {
      const tapped = (message: unknown) => {
        this.record("toExtension", message);
        return listener.call(thisArgs, message);
      };
      this.listener = tapped;
      return webview.onDidReceiveMessage(tapped, undefined, disposables);
    },
  });

  /** webview から届いたかのように provider へ渡し、処理が終わるまで待つ */
  async deliver(message: Message): Promise<void> {
    if (!this.listener) {
      throw new Error("provider がまだ webview に接続していません");
    }
    await this.listener(message);
  }

  /** 条件に合う最初のメッセージ（無ければ undefined） */
  find(direction: TappedMessage["direction"], predicate: (message: Message) => boolean) {
    return this.log.find((m) => m.direction === direction && predicate(m.message));
  }

  /** 種別ごとのメッセージ */
  messagesOf(direction: TappedMessage["direction"], type: string): Message[] {
    return this.log
      .filter((m) => m.direction === direction && m.message.type === type)
      .map((m) => m.message);
  }

  /** 条件に合うメッセージが届くまで待つ */
  async waitFor(
    direction: TappedMessage["direction"],
    predicate: (message: Message) => boolean,
    what: string,
    timeoutMs?: number
  ): Promise<TappedMessage> {
    let found: TappedMessage | undefined;
    await waitFor(
      () => {
        found = this.find(direction, predicate);
        return found !== undefined;
      },
      what,
      timeoutMs
    );
    return found as TappedMessage;
  }

  private record(direction: TappedMessage["direction"], message: unknown) {
    this.log.push({ direction, message: message as Message, at: performance.now() });
  }
}
