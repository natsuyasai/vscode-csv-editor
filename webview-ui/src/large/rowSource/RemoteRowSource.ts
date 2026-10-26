import {
  MAX_ROWS_PER_REQUEST,
  type LargeMessageToExtension,
  type LargeMessageToWebview,
} from "@message/largeMessages";
import { vscode } from "../../utilities/vscode";
import { ObservableRowSource, type RowSource } from "./RowSource";

/** キャッシュ・要求の単位（行数） */
export const ROW_PAGE_SIZE = 500;
/** キャッシュするページ数の上限（200ページ＝10万行） */
export const MAX_CACHED_PAGES = 200;
/** 表示範囲の前後に先読みするページ数 */
export const PREFETCH_PAGES = 1;

interface CachedPage {
  rows: string[][];
  handles: number[];
}

interface InflightRequest {
  /** 要求した先頭行（ページ境界） */
  start: number;
  pages: number[];
}

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

  /** 受信メッセージを処理する。この RowSource が扱うメッセージなら true */
  handleMessage(message: LargeMessageToWebview): boolean {
    switch (message.type) {
      case "large/rows":
        this.acceptRows(message.reqId, message.start, message.rows, message.handles);
        return true;
      case "large/invalidate":
        if (message.revision >= this.revision) {
          this.revision = message.revision;
          this.reset(message.rowCount);
        }
        return true;
      case "large/init":
        this.header = message.header;
        this.reset(message.rowCount);
        return true;
      case "large/error":
        if (message.reqId !== undefined) {
          this.releaseRequest(message.reqId);
        }
        this.onError?.(message.message);
        return true;
      default:
        return false;
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
