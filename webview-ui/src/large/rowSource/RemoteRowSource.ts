import {
  MAX_ROWS_PER_REQUEST,
  type LargeMessageToExtension,
  type LargeOp,
  type LargeMessageToWebview,
  type LargeRange,
} from "@message/largeMessages";
import { vscode } from "../../utilities/vscode";
import { ObservableRowSource, type FetchedRows, type RowSource } from "./RowSource";

/** キャッシュ・要求の単位（行数） */
export const ROW_PAGE_SIZE = 500;
/** キャッシュするページ数の上限（200ページ＝10万行） */
export const MAX_CACHED_PAGES = 200;
/** 表示範囲の前後に先読みするページ数 */
export const PREFETCH_PAGES = 1;
/** fetchRows の取り寄せ中に無効化が届いたとき、取り直す回数の上限 */
export const MAX_FETCH_RETRIES = 3;

interface CachedPage {
  rows: string[][];
  handles: number[];
}

interface InflightRequest {
  /** 要求した先頭行（ページ境界） */
  start: number;
  pages: number[];
}

/** fetchRows の1回の呼び出し（取り直しをまたいで同じもの） */
interface FetchJob {
  start: number;
  end: number;
  /** 取り寄せを（取り直しのときは改めて）始めたときの revision */
  revision: number;
  /** 取り直した回数 */
  retries: number;
  /** 分けて送った要求ごとの応答（送った順） */
  parts: ({ rows: string[][]; handles: number[] } | undefined)[];
  remaining: number;
  settled: boolean;
  resolve: (result: FetchedRows) => void;
  reject: (error: Error) => void;
}

/** 表示用のキャッシュとは別に応答を待つ要求（範囲のコピー・貼り付け先の行の取り寄せ） */
type SideRequest =
  | { kind: "range"; resolve: (rows: string[][]) => void; reject: (error: Error) => void }
  | { kind: "fetch"; job: FetchJob; part: number };

export interface RemoteRowSourceOptions {
  postMessage?: (message: LargeMessageToExtension) => void;
  header: string[];
  rowCount: number;
  revision?: number;
  pageSize?: number;
  maxCachedPages?: number;
  prefetchPages?: number;
  /** `large/error` を受けたときに呼ぶ */
  onError?: (message: string) => void;
}

/**
 * 拡張機能へ `large/getRows` を送って行を取得する RowSource。
 * 行は PAGE 単位でキャッシュし（LRU）、要求中のページは再要求しない。
 * `large/invalidate` を受けたらキャッシュと要求中の応答を破棄し、直近の表示範囲を取り直す。
 *
 * 編集（applyOps）は `large/applyOps` を送ると同時にキャッシュへ反映する（楽観的更新）。
 * 拡張機能は op を適用した後に `large/invalidate` を送る想定で、それを受けて正しい状態に収束する。
 */
export class RemoteRowSource extends ObservableRowSource implements RowSource {
  header: string[];
  rowCount: number;
  revision: number;

  private readonly postMessage: (message: LargeMessageToExtension) => void;
  private readonly pageSize: number;
  private readonly maxCachedPages: number;
  private readonly prefetchPages: number;
  private readonly onError?: (message: string) => void;

  /** Map の挿入順を LRU の順（先頭＝最も古い）として使う */
  private readonly pages = new Map<number, CachedPage>();
  private readonly inflight = new Map<number, InflightRequest>();
  private readonly inflightPages = new Set<number>();
  private nextReqId = 1;
  private lastRange: [number, number] | undefined;
  /**
   * コピー・貼り付けのための要求（reqId → 待っているもの）。無効化（reset）では捨てない
   * （範囲は要求した順に処理されて必ず応答が届く。取り寄せは revision を見て取り直す）
   */
  private readonly sideRequests = new Map<number, SideRequest>();

  constructor(options: RemoteRowSourceOptions) {
    super();
    this.postMessage = options.postMessage ?? ((message) => vscode.postMessage(message));
    this.header = options.header;
    this.rowCount = options.rowCount;
    this.revision = options.revision ?? 0;
    this.pageSize = options.pageSize ?? ROW_PAGE_SIZE;
    this.maxCachedPages = options.maxCachedPages ?? MAX_CACHED_PAGES;
    this.prefetchPages = options.prefetchPages ?? PREFETCH_PAGES;
    this.onError = options.onError;
  }

  getRow(viewIndex: number): string[] | undefined {
    return this.lookup(viewIndex)?.rows[viewIndex % this.pageSize];
  }

  getHandle(viewIndex: number): number | undefined {
    return this.lookup(viewIndex)?.handles[viewIndex % this.pageSize];
  }

  ensureRange(start: number, end: number): void {
    this.lastRange = [start, end];
    const from = Math.max(0, start);
    const to = Math.min(end, this.rowCount);
    if (from >= to) {
      return;
    }
    const pageCount = Math.ceil(this.rowCount / this.pageSize);
    const firstPage = Math.max(0, Math.floor(from / this.pageSize) - this.prefetchPages);
    const lastPage = Math.min(
      pageCount - 1,
      Math.floor((to - 1) / this.pageSize) + this.prefetchPages
    );

    const missing: number[] = [];
    for (let page = firstPage; page <= lastPage; page++) {
      if (this.pages.has(page)) {
        this.touch(page);
      } else if (!this.inflightPages.has(page)) {
        missing.push(page);
      }
    }
    this.requestPages(missing);
  }

  /** 範囲のセルを拡張機能に要求する（コピー用。キャッシュは使わない） */
  getRange(range: LargeRange): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const reqId = this.nextReqId++;
      this.sideRequests.set(reqId, { kind: "range", resolve, reject });
      this.postMessage({ type: "large/getRange", reqId, range });
    });
  }

  /**
   * 表示位置 [start, end) の行全体とハンドル（貼り付け用）。
   * - 全て取得済みなら、キャッシュの行（楽観的に反映した編集を含む）と現在の revision で返す
   * - そうでなければ、表示用のキャッシュとは別に MAX_ROWS_PER_REQUEST 行ずつ `large/getRows` で取り寄せる。
   *   取り寄せの途中で無効化が届いたら（保存で行のハンドルの体系が変わったかもしれない）、
   *   どちらの体系のハンドルか分からないので取り直す（MAX_FETCH_RETRIES 回まで）
   */
  fetchRows(start: number, end: number): Promise<FetchedRows> {
    const from = Math.max(0, start);
    const to = Math.min(end, this.rowCount);
    const cached = this.cachedRows(from, to);
    if (cached) {
      return Promise.resolve({ ...cached, revision: this.revision });
    }
    return new Promise((resolve, reject) => {
      const job: FetchJob = {
        start: from,
        end,
        revision: this.revision,
        retries: 0,
        parts: [],
        remaining: 0,
        settled: false,
        resolve,
        reject,
      };
      this.sendFetch(job);
    });
  }

  /**
   * 編集操作を拡張機能へ送り、同時にキャッシュへ反映する。
   * - setRow: キャッシュ内の同じハンドルの行を置き換える
   * - insertRows / deleteRows: 位置以降の行をずらす。ずらした結果、中身が揃わなくなったページは捨てる。
   *   キャッシュに無いハンドルは位置が分からないため、行数だけ変えてキャッシュ全体を捨てる
   * - setHeader: ヘッダーを置き換える
   * op より前に送った要求の応答は編集前の内容なので捨て、op を送った後に直近の表示範囲を取り直す
   * （拡張機能はメッセージを順に処理するので、後から送った要求には op の適用後の行が返る）
   * revision（ops のハンドルを得たときの revision。省略は現在の revision）を添えて送る。拡張機能は
   * 保存をまたいだハンドルを保存後の行に付け替え、付け替えられない古いものは拒否する
   */
  applyOps(ops: LargeOp[], revision: number = this.revision): void {
    if (ops.length === 0) {
      return;
    }
    this.postMessage({ type: "large/applyOps", revision, ops });
    this.inflight.clear();
    this.inflightPages.clear();
    for (const op of ops) {
      this.applyOptimistic(op);
    }
    this.notify();
    if (this.lastRange) {
      this.ensureRange(this.lastRange[0], this.lastRange[1]);
    }
  }

  /** 受信メッセージを処理する。この RowSource が扱うメッセージなら true */
  handleMessage(message: LargeMessageToWebview): boolean {
    switch (message.type) {
      case "large/rows":
        if (!this.acceptSideRows(message.reqId, message.rows, message.handles)) {
          this.acceptRows(message.reqId, message.start, message.rows, message.handles);
        }
        return true;
      case "large/range": {
        const request = this.sideRequests.get(message.reqId);
        if (request?.kind === "range") {
          this.sideRequests.delete(message.reqId);
          request.resolve(message.rows);
        }
        return true;
      }
      case "large/invalidate":
        if (message.revision >= this.revision) {
          this.revision = message.revision;
          if (message.header) {
            this.header = message.header;
          }
          this.reset(message.rowCount);
        }
        return true;
      case "large/init":
        if (message.revision !== undefined) {
          this.revision = message.revision;
        }
        this.header = message.header;
        this.reset(message.rowCount);
        return true;
      case "large/error":
        if (message.reqId !== undefined) {
          if (this.rejectSideRequest(message.reqId, message.message)) {
            // 呼び出し元（コピー・貼り付け）が知らせる
            return true;
          }
          this.releaseRequest(message.reqId);
        }
        this.onError?.(message.message);
        return true;
      default:
        return false;
    }
  }

  /** [from, to) が全てキャッシュにあればその行とハンドル */
  private cachedRows(from: number, to: number): { rows: string[][]; handles: number[] } | null {
    const rows: string[][] = [];
    const handles: number[] = [];
    for (let i = from; i < to; i++) {
      const page = this.pages.get(Math.floor(i / this.pageSize));
      const offset = i % this.pageSize;
      const row = page?.rows[offset];
      const handle = page?.handles[offset];
      if (row === undefined || handle === undefined) {
        return null;
      }
      rows.push(row);
      handles.push(handle);
    }
    return { rows, handles };
  }

  /** 取り寄せの要求を（取り直しのときは改めて）送る */
  private sendFetch(job: FetchJob): void {
    const to = Math.min(job.end, this.rowCount);
    job.revision = this.revision;
    job.parts = [];
    job.remaining = 0;
    if (job.start >= to) {
      this.settleFetch(job);
      return;
    }
    for (let start = job.start, part = 0; start < to; start += MAX_ROWS_PER_REQUEST, part++) {
      const count = Math.min(MAX_ROWS_PER_REQUEST, to - start);
      const reqId = this.nextReqId++;
      job.parts.push(undefined);
      job.remaining += 1;
      this.sideRequests.set(reqId, { kind: "fetch", job, part });
      this.postMessage({ type: "large/getRows", reqId, start, count });
    }
  }

  /** 取り寄せの応答なら受け取って true */
  private acceptSideRows(reqId: number, rows: string[][], handles: number[]): boolean {
    const request = this.sideRequests.get(reqId);
    if (request?.kind !== "fetch") {
      return false;
    }
    this.sideRequests.delete(reqId);
    const { job, part } = request;
    if (job.settled || job.parts[part] !== undefined) {
      return true;
    }
    job.parts[part] = { rows, handles };
    job.remaining -= 1;
    if (job.remaining > 0) {
      return true;
    }
    if (job.revision === this.revision) {
      this.settleFetch(job);
    } else if (job.retries < MAX_FETCH_RETRIES) {
      job.retries += 1;
      this.sendFetch(job);
    } else {
      this.failFetch(job, new Error("表の内容が変わり続けたため、行を取得できませんでした"));
    }
    return true;
  }

  private settleFetch(job: FetchJob): void {
    job.settled = true;
    const rows: string[][] = [];
    const handles: number[] = [];
    for (const part of job.parts) {
      if (part) {
        rows.push(...part.rows);
        handles.push(...part.handles);
      }
    }
    job.resolve({ rows, handles, revision: job.revision });
  }

  private failFetch(job: FetchJob, error: Error): void {
    job.settled = true;
    for (const [reqId, request] of this.sideRequests) {
      if (request.kind === "fetch" && request.job === job) {
        this.sideRequests.delete(reqId);
      }
    }
    job.reject(error);
  }

  /** コピー・貼り付けの要求のエラーなら失敗させて true */
  private rejectSideRequest(reqId: number, message: string): boolean {
    const request = this.sideRequests.get(reqId);
    if (!request) {
      return false;
    }
    this.sideRequests.delete(reqId);
    if (request.kind === "range") {
      request.reject(new Error(message));
    } else if (!request.job.settled) {
      this.failFetch(request.job, new Error(message));
    }
    return true;
  }

  private applyOptimistic(op: LargeOp): void {
    switch (op.type) {
      case "setRow":
        for (const [page, cached] of this.pages) {
          const offset = cached.handles.indexOf(op.handle);
          if (offset !== -1) {
            const rows = [...cached.rows];
            rows[offset] = op.row;
            this.pages.set(page, { rows, handles: cached.handles });
          }
        }
        break;
      case "insertRows": {
        const position =
          op.beforeHandle === null ? this.rowCount : this.findPosition(op.beforeHandle);
        if (position === undefined) {
          this.discardAll(this.rowCount + op.rows.length);
        } else {
          this.splice(position, 0, op.rows, op.handles);
        }
        break;
      }
      case "deleteRows":
        for (const handle of op.handles) {
          const position = this.findPosition(handle);
          if (position === undefined) {
            this.discardAll(Math.max(0, this.rowCount - 1));
          } else {
            this.splice(position, 1, [], []);
          }
        }
        break;
      case "setHeader":
        this.header = op.header;
        break;
    }
  }

  /** キャッシュ内でハンドルの行がある表示位置。無ければ undefined */
  private findPosition(handle: number): number | undefined {
    for (const [page, cached] of this.pages) {
      const offset = cached.handles.indexOf(handle);
      if (offset !== -1) {
        return page * this.pageSize + offset;
      }
    }
    return undefined;
  }

  /** 行数を変えてキャッシュを全部捨てる（位置が分からない編集） */
  private discardAll(rowCount: number): void {
    this.rowCount = rowCount;
    this.pages.clear();
  }

  /**
   * position から deleteCount 行を除き rows を差し込んだように、キャッシュと行数を更新する。
   * position のページから連続して取得済みのページをつなげて差し込み、ページ単位に切り直す。
   * 切り直した最後のページが（未取得の次のページの行が入るはずで）揃わない場合と、
   * 連続していない後ろのページ（位置がずれる）は捨てる
   */
  private splice(position: number, deleteCount: number, rows: string[][], handles: number[]): void {
    const firstPage = Math.floor(position / this.pageSize);
    const runStart = firstPage * this.pageSize;
    const runRows: string[][] = [];
    const runHandles: number[] = [];
    for (let page = firstPage; ; page++) {
      const cached = this.pages.get(page);
      if (!cached) {
        break;
      }
      runRows.push(...cached.rows);
      runHandles.push(...cached.handles);
    }
    const runReachesEnd = runStart + runRows.length >= this.rowCount;
    for (const page of [...this.pages.keys()]) {
      if (page >= firstPage) {
        this.pages.delete(page);
      }
    }
    this.rowCount = this.rowCount - deleteCount + rows.length;

    const offset = position - runStart;
    if (offset > runRows.length) {
      return;
    }
    runRows.splice(offset, deleteCount, ...rows);
    runHandles.splice(offset, deleteCount, ...handles);
    for (let i = 0; i < runRows.length; i += this.pageSize) {
      const pageRows = runRows.slice(i, i + this.pageSize);
      if (pageRows.length < this.pageSize && !runReachesEnd) {
        break;
      }
      this.pages.set(firstPage + i / this.pageSize, {
        rows: pageRows,
        handles: runHandles.slice(i, i + this.pageSize),
      });
    }
  }

  private lookup(viewIndex: number): CachedPage | undefined {
    if (viewIndex < 0 || viewIndex >= this.rowCount) {
      return undefined;
    }
    const page = Math.floor(viewIndex / this.pageSize);
    const cached = this.pages.get(page);
    if (cached) {
      this.touch(page);
    }
    return cached;
  }

  private touch(page: number): void {
    const cached = this.pages.get(page);
    if (cached) {
      this.pages.delete(page);
      this.pages.set(page, cached);
    }
  }

  /** 連続するページをまとめ、1回あたり MAX_ROWS_PER_REQUEST 行以下で要求する */
  private requestPages(missing: number[]): void {
    const maxPages = Math.max(1, Math.floor(MAX_ROWS_PER_REQUEST / this.pageSize));
    let group: number[] = [];
    const flush = () => {
      if (group.length > 0) {
        this.sendRequest(group);
        group = [];
      }
    };
    for (const page of missing) {
      const last = group[group.length - 1];
      if (group.length > 0 && (page !== last + 1 || group.length >= maxPages)) {
        flush();
      }
      group.push(page);
    }
    flush();
  }

  private sendRequest(pages: number[]): void {
    const start = pages[0] * this.pageSize;
    const count = Math.min(pages.length * this.pageSize, this.rowCount - start);
    const reqId = this.nextReqId++;
    this.inflight.set(reqId, { start, pages });
    for (const page of pages) {
      this.inflightPages.add(page);
    }
    this.postMessage({ type: "large/getRows", reqId, start, count });
  }

  private releaseRequest(reqId: number): InflightRequest | undefined {
    const request = this.inflight.get(reqId);
    if (request) {
      this.inflight.delete(reqId);
      for (const page of request.pages) {
        this.inflightPages.delete(page);
      }
    }
    return request;
  }

  private acceptRows(reqId: number, start: number, rows: string[][], handles: number[]): void {
    const request = this.releaseRequest(reqId);
    if (!request || request.start !== start) {
      return;
    }
    for (const page of request.pages) {
      const offset = page * this.pageSize - start;
      const pageRows = rows.slice(offset, offset + this.pageSize);
      if (pageRows.length > 0) {
        this.pages.delete(page);
        this.pages.set(page, {
          rows: pageRows,
          handles: handles.slice(offset, offset + this.pageSize),
        });
      }
    }
    while (this.pages.size > this.maxCachedPages) {
      const oldest = this.pages.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.pages.delete(oldest);
    }
    this.notify();
  }

  /** キャッシュと要求中の応答を破棄し、直近の表示範囲を新しい要求で取り直す */
  private reset(rowCount: number): void {
    this.rowCount = rowCount;
    this.pages.clear();
    this.inflight.clear();
    this.inflightPages.clear();
    this.notify();
    if (this.lastRange) {
      this.ensureRange(this.lastRange[0], this.lastRange[1]);
    }
  }
}
