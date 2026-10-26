/**
 * 大容量モードの重い走査（検索・ソート・フィルタ等）を担当するワーカー。
 * esbuild の別エントリとして `dist/largeCsvWorker.js` にバンドルし、`worker_threads` で起動する。
 * 現時点は往復メッセージの疎通確認用（ping → pong）。
 */
import { parentPort } from "node:worker_threads";

parentPort?.on("message", (message: unknown) => {
  if (typeof message === "object" && message !== null && (message as { type?: unknown }).type === "ping") {
    parentPort?.postMessage({ type: "pong" });
  }
});
