/* global setTimeout, clearTimeout */
import { Worker } from "worker_threads";

import type {
  FromWorkerMessage,
  QueryJobRequest,
  QueryJobResult,
  ToWorkerMessage,
} from "./queryProtocol";

/** ジョブを取り消した（キャンセル・新しいジョブ・保存・破棄による） */
export class QueryCancelledError extends Error {
  constructor() {
    super("検索・ソート・フィルタを取り消しました");
    this.name = "QueryCancelledError";
  }
}

export interface QueryJobHandle {
  /** 結果。取り消したら QueryCancelledError で reject */
  readonly result: Promise<QueryJobResult>;
  /** 取り消す。ワーカーがファイルを閉じたら（またはワーカーを止めたら）resolve */
  cancel(): Promise<void>;
}

export interface QueryRunOptions {
  onProgress?: (ratio: number) => void;
  /** 終わったらワーカーを止める（大きなソートで使ったメモリを確実に返すため。次のジョブで作り直す） */
  recycle?: boolean;
}

export interface QueryWorkerClientOptions {
  /** キャンセルしてからワーカーがファイルを閉じるのを待つ上限。超えたらワーカーを止める */
  cancelTimeoutMs?: number;
}

interface PendingJob {
  jobId: number;
  worker: Worker;
  options: QueryRunOptions;
  /** ワーカーがファイルを閉じた（以後は計算だけ。止めてもファイルハンドルは残らない） */
  released: boolean;
  /** cancel で取り消した */
  cancelRequested: boolean;
  /** 新しいジョブを始めたので取り消した（ワーカーが自分で止める） */
  superseded: boolean;
  settled: boolean;
  resolve: (result: QueryJobResult) => void;
  reject: (error: unknown) => void;
  /** settle したら呼ぶ */
  onSettled: (() => void)[];
}

const DEFAULT_CANCEL_TIMEOUT_MS = 3000;

/**
 * 検索・ソート・フィルタのワーカー（dist/largeCsvWorker.js）を動かす（文書ごとに1つ）。
 *
 * - ワーカーは最初のジョブで起動し、dispose で止める。ジョブは1つずつで、新しいジョブを始めると前のジョブは取り消す
 * - 取り消しは、ワーカーがファイルを読んでいる間はキャンセルを送ってファイルを閉じるのを待つ（cooperative）。
 *   読み終えて計算（ソート）している間は、ワーカーを止める（ファイルは閉じているので安全。次のジョブで作り直す）
 * - `release` は実行中のジョブを取り消し、ワーカーがファイルを閉じるまで待つ（保存の前に呼ぶ。Windows では
 *   開いたままのファイルを置き換えられない）
 */
export class QueryWorkerClient {
  private worker: Worker | undefined;
  private readonly jobs = new Map<number, PendingJob>();
  private nextJobId = 1;
  private disposed = false;

  constructor(
    private readonly workerPath: string,
    private readonly options: QueryWorkerClientOptions = {}
  ) {}

  run(request: QueryJobRequest, options: QueryRunOptions = {}): QueryJobHandle {
    if (this.disposed) {
      return { result: Promise.reject(new QueryCancelledError()), cancel: () => Promise.resolve() };
    }
    // 計算中のジョブはワーカーごと止める（ワーカーは前のジョブが終わるまで次を始められないため）
    if ([...this.jobs.values()].some((job) => job.released)) {
      void this.stopWorker();
    }
    for (const job of this.jobs.values()) {
      job.superseded = true;
    }
    const worker = this.ensureWorker();
    const jobId = this.nextJobId++;
    let resolve: (result: QueryJobResult) => void = () => {};
    let reject: (error: unknown) => void = () => {};
    const result = new Promise<QueryJobResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // 待つ側がいなくても unhandled にしない
    result.catch(() => {});
    const job: PendingJob = {
      jobId,
      worker,
      options,
      released: false,
      cancelRequested: false,
      superseded: false,
      settled: false,
      resolve,
      reject,
      onSettled: [],
    };
    this.jobs.set(jobId, job);
    // オフセット表と並びは大きいので転送する（呼び出し側はこの後使わない）
    const transfer = [request.source.starts.buffer, request.rows.order.buffer].filter(
      (buffer, i, all): buffer is ArrayBuffer =>
        buffer instanceof ArrayBuffer && buffer.byteLength > 0 && all.indexOf(buffer) === i
    );
    this.post(worker, { type: "run", jobId, request }, transfer);
    return { result, cancel: () => this.cancel(job) };
  }

  /** 実行中のジョブを取り消し、ワーカーがファイルを閉じるまで待つ */
  async release(): Promise<void> {
    await Promise.all([...this.jobs.values()].map((job) => this.cancel(job)));
  }

  /** ワーカーを止める（実行中のジョブは取り消す） */
  dispose(): Promise<void> {
    this.disposed = true;
    return this.stopWorker();
  }

  private cancel(job: PendingJob): Promise<void> {
    if (job.settled) {
      return Promise.resolve();
    }
    const settled = new Promise<void>((resolve) => {
      job.onSettled.push(resolve);
    });
    if (job.released) {
      void this.stopWorker();
      return settled;
    }
    job.cancelRequested = true;
    this.post(job.worker, { type: "cancel", jobId: job.jobId });
    const timer = setTimeout(() => {
      if (!job.settled) {
        void this.stopWorker();
      }
    }, this.options.cancelTimeoutMs ?? DEFAULT_CANCEL_TIMEOUT_MS);
    return settled.finally(() => {
      clearTimeout(timer);
    });
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }
    const worker = new Worker(this.workerPath);
    worker.on("message", (message: FromWorkerMessage) => {
      this.receive(worker, message);
    });
    worker.on("error", (error: unknown) => {
      this.failAll(worker, error);
    });
    worker.on("exit", (code) => {
      this.failAll(
        worker,
        new Error(`検索・ソート・フィルタのワーカーが終了しました（${String(code)}）`)
      );
    });
    this.worker = worker;
    return worker;
  }

  /** ワーカーを止め、そのワーカーのジョブをすべて取り消しにする */
  private stopWorker(): Promise<void> {
    const worker = this.worker;
    this.worker = undefined;
    if (!worker) {
      return Promise.resolve();
    }
    this.failAll(worker, new QueryCancelledError());
    return worker.terminate().then(() => undefined);
  }

  private failAll(worker: Worker, error: unknown): void {
    if (this.worker === worker) {
      this.worker = undefined;
    }
    for (const job of [...this.jobs.values()]) {
      if (job.worker === worker) {
        this.settle(job, () => {
          job.reject(error);
        });
      }
    }
  }

  private receive(worker: Worker, message: FromWorkerMessage): void {
    if (message.type === "pong") {
      return;
    }
    const job = this.jobs.get(message.jobId);
    if (!job || job.worker !== worker) {
      return;
    }
    switch (message.type) {
      case "progress":
        if (!job.cancelRequested && !job.superseded) {
          job.options.onProgress?.(message.ratio);
        }
        return;
      case "released":
        job.released = true;
        if (
          job.cancelRequested &&
          this.worker === worker &&
          [...this.jobs.values()].every((other) => other === job || other.worker !== worker)
        ) {
          // 計算に入る前に取り消したかったジョブ。計算を待たずにワーカーを止める
          void this.stopWorker();
        }
        return;
      case "done":
        this.settle(job, () => {
          if (job.cancelRequested || job.superseded) {
            job.reject(new QueryCancelledError());
          } else {
            job.resolve(message.result);
          }
        });
        if (job.options.recycle && this.worker === worker && this.jobs.size === 0) {
          void this.stopWorker();
        }
        return;
      case "cancelled":
        this.settle(job, () => {
          job.reject(new QueryCancelledError());
        });
        return;
      case "failed":
        this.settle(job, () => {
          job.reject(
            job.cancelRequested || job.superseded
              ? new QueryCancelledError()
              : new Error(message.message)
          );
        });
        return;
    }
  }

  private settle(job: PendingJob, run: () => void): void {
    if (job.settled) {
      return;
    }
    job.settled = true;
    this.jobs.delete(job.jobId);
    run();
    for (const callback of job.onSettled.splice(0)) {
      callback();
    }
  }

  private post(worker: Worker, message: ToWorkerMessage, transfer: ArrayBuffer[] = []): void {
    worker.postMessage(message, transfer);
  }
}
