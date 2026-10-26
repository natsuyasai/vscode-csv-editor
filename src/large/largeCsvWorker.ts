/**
 * 大容量モードの検索・ソート・フィルタの全体走査を担当するワーカー（拡張ホストをブロックしない）。
 * esbuild の別エントリとして `dist/largeCsvWorker.js` にバンドルし、`worker_threads` で起動する
 * （`QueryWorkerClient`）。vscode は import しない（ワーカーでは使えない）。
 *
 * - ジョブは1つずつ実行する。実行中に次の run が来たら、前のジョブを取り消してから始める
 * - cancel を受けたら、次にまとめて読む前に止め、ファイルを閉じて cancelled を返す
 * - ファイルを閉じたら released を送る（以後このジョブはファイルを読まない）
 */
import { parentPort } from "node:worker_threads";

import type { FromWorkerMessage, QueryJobRequest, ToWorkerMessage } from "./queryProtocol";
import { QueryScanCancelledError, runQueryJob } from "./queryScan";

interface Job {
  jobId: number;
  request: QueryJobRequest;
  cancelled: boolean;
}

/** 受け付けて終わっていないジョブ（実行中と、前のジョブの終わりを待っているもの） */
const jobs = new Map<number, Job>();
let chain: Promise<void> = Promise.resolve();

/** 実行中に cancel で変わる（await をまたいで読む） */
const isCancelled = (job: Job): boolean => job.cancelled;

const post = (message: FromWorkerMessage, transfer: ArrayBuffer[] = []) => {
  parentPort?.postMessage(message, transfer);
};

function accept(jobId: number, request: QueryJobRequest): void {
  // 前のジョブは取り消す（1つずつ実行する）
  for (const job of jobs.values()) {
    job.cancelled = true;
  }
  const job: Job = { jobId, request, cancelled: false };
  jobs.set(jobId, job);
  chain = chain.then(() => execute(job));
}

async function execute(job: Job): Promise<void> {
  const { jobId } = job;
  try {
    if (job.cancelled) {
      post({ type: "cancelled", jobId });
      return;
    }
    const result = await runQueryJob(job.request, {
      isCancelled: () => job.cancelled,
      onProgress: (ratio) => {
        post({ type: "progress", jobId, ratio });
      },
      onReleased: () => {
        post({ type: "released", jobId });
      },
    });
    if (isCancelled(job)) {
      post({ type: "cancelled", jobId });
    } else if (result.kind === "view") {
      post({ type: "done", jobId, result }, [result.handles.buffer as ArrayBuffer]);
    } else {
      post({ type: "done", jobId, result });
    }
  } catch (error) {
    if (error instanceof QueryScanCancelledError || job.cancelled) {
      post({ type: "cancelled", jobId });
    } else {
      post({
        type: "failed",
        jobId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    jobs.delete(jobId);
  }
}

parentPort?.on("message", (message: ToWorkerMessage) => {
  switch (message.type) {
    case "ping":
      post({ type: "pong" });
      return;
    case "run":
      accept(message.jobId, message.request);
      return;
    case "cancel": {
      const job = jobs.get(message.jobId);
      if (job) {
        job.cancelled = true;
      }
      return;
    }
  }
});
