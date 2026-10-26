import type { LargeMessageToWebview } from "@message/largeMessages";

export type LargeMessageListener = (message: LargeMessageToWebview) => void;

/**
 * AppRouter が受けた大容量モードのメッセージを LargeApp へ渡す中継。
 * `large/init` で LargeApp へ切り替えてから、LargeApp が受け手を付けるまでの間に届いた
 * メッセージ（直後の進捗や無効化）を取りこぼさないよう、受け手がいない間はためておく。
 */
export interface LargeMessageHub {
  dispatch(message: LargeMessageToWebview): void;
  /** 受け手を付け、ためていたメッセージを順に渡す。戻り値で外す */
  attach(listener: LargeMessageListener): () => void;
}

export function createLargeMessageHub(): LargeMessageHub {
  let buffer: LargeMessageToWebview[] = [];
  let current: LargeMessageListener | null = null;
  return {
    dispatch(message) {
      if (current) {
        current(message);
      } else {
        buffer.push(message);
      }
    },
    attach(listener) {
      const pending = buffer;
      buffer = [];
      for (const message of pending) {
        listener(message);
      }
      current = listener;
      return () => {
        if (current === listener) {
          current = null;
        }
      };
    },
  };
}
