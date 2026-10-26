/* global __dirname */
import * as assert from "assert";
import * as fs from "fs";
import { suite, test } from "mocha";
import * as path from "path";
import { Worker } from "worker_threads";

/** esbuild でバンドルした dist/largeCsvWorker.js が拡張ホスト（Electron の Node）で動くことの疎通確認 */
suite("largeCsvWorker（worker_threads の疎通）", () => {
  const workerPath = path.resolve(__dirname, "../../dist/largeCsvWorker.js");

  test("バンドル済みワーカーに ping を送ると pong が返る", async () => {
    assert.ok(fs.existsSync(workerPath), `${workerPath} が無い。node esbuild.js を先に実行する`);
    const worker = new Worker(workerPath);
    try {
      const reply = await new Promise<{ type: string }>((resolve, reject) => {
        worker.once("message", (message: { type: string }) => {
          resolve(message);
        });
        worker.once("error", reject);
        worker.postMessage({ type: "ping" });
      });
      assert.strictEqual(reply.type, "pong");
    } finally {
      await worker.terminate();
    }
  });
});
