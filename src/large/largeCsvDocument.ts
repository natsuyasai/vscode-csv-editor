/* global AbortController */
import * as vscode from "vscode";

import { FileRowReader } from "./fileRowReader";
import { skipsBom, type LargeEncoding } from "./largeEncoding";
import {
  RowIndex,
  type BuildRowIndexOptions,
  type RowByteRange,
  type RowIndexProgress,
  type RowIndexSummary,
} from "./rowIndex";

/** 行インデックスとして使う機能（`RowIndex`。テストでは作成の進み方を制御できる実装に差し替える） */
export interface RowIndexLike {
  readonly done: Promise<RowIndexSummary>;
  readonly firstRow: Promise<boolean>;
  readonly rowCount: number;
  readonly completed: boolean;
  getRowRange(i: number): RowByteRange;
}

export type BuildRowIndex = (filePath: string, options: BuildRowIndexOptions) => RowIndexLike;

export interface LargeCsvDocumentOptions {
  /** 行インデックスの作成（既定 `RowIndex.build`） */
  buildIndex?: BuildRowIndex;
  /** 行インデックスの作成で1回に読むバイト数 */
  highWaterMark?: number;
  /** 行インデックスの行数の上限 */
  maxRows?: number;
}

/** 表示位置で指定したデータ行の読み取り結果 */
export interface DataRows {
  /** 表示位置の先頭（要求どおり） */
  start: number;
  rows: string[][];
  /** ファイル上の行番号（表示位置 i → i + 1。0 はヘッダー） */
  handles: number[];
  /** パースできなかった行のファイル上の行番号 */
  invalidRows: number[];
}

/** ヘッダー（ファイルの行 0）の分。表示位置 i のデータ行はファイルの行 i + 1 */
const HEADER_ROWS = 1;

interface RowWaiter {
  /** この行数まで確定したら resolve */
  rowCount: number;
  resolve: () => void;
}

/**
 * 大容量モードで開いたファイル（2-1 は読み取り専用）。
 * 開くと行インデックスの作成とファイルハンドルのオープンを始める。破棄で作成を中断し、ファイルを閉じる。
 * 2-2 で RowStore / EditStack（編集）を持たせる。
 */
export class LargeCsvDocument implements vscode.CustomDocument {
  private readonly progressEmitter = new vscode.EventEmitter<RowIndexProgress>();
  /** 行インデックスの作成中の進捗（チャンクを読むたび） */
  readonly onDidProgress = this.progressEmitter.event;

  private readonly abort = new AbortController();
  private readonly index: RowIndexLike;
  private readonly reader: Promise<FileRowReader>;
  private waiters: RowWaiter[] = [];
  private disposed = false;
  private closed: Promise<void> = Promise.resolve();

  private constructor(
    readonly uri: vscode.Uri,
    readonly encoding: LargeEncoding,
    options: LargeCsvDocumentOptions
  ) {
    const build = options.buildIndex ?? ((path, opts) => RowIndex.build(path, opts));
    this.index = build(uri.fsPath, {
      skipBom: skipsBom(encoding),
      signal: this.abort.signal,
      highWaterMark: options.highWaterMark,
      maxRows: options.maxRows,
      onProgress: (progress) => {
        this.releaseWaiters();
        this.progressEmitter.fire(progress);
      },
    });
    // 成否にかかわらず、完了したら待っている要求をすべて進める（足りない分は切り詰める）
    this.index.done.then(
      () => {
        this.releaseAllWaiters();
      },
      () => {
        this.releaseAllWaiters();
      }
    );
    this.reader = FileRowReader.open(uri.fsPath, { encoding });
    // 待つ側がいなくても unhandled にしない（失敗は読み取りのたびに reject として返る）
    this.reader.catch(() => {});
  }

  static open(
    uri: vscode.Uri,
    encoding: LargeEncoding,
    options: LargeCsvDocumentOptions = {}
  ): LargeCsvDocument {
    if (uri.scheme !== "file") {
      throw new Error("大容量モードで開けるのはローカルのファイルだけです");
    }
    return new LargeCsvDocument(uri, encoding, options);
  }

  /** 行インデックスの作成完了（失敗・中断で reject） */
  get indexDone(): Promise<RowIndexSummary> {
    return this.index.done;
  }

  /** 作成中か */
  get indexing(): boolean {
    return !this.index.completed;
  }

  /** 確定済みのデータ行数（ヘッダーを除く） */
  get dataRowCount(): number {
    return Math.max(0, this.index.rowCount - HEADER_ROWS);
  }

  /** ヘッダー（1行目）。1行目が確定するまで待つ。空ファイルなら [] */
  async readHeader(): Promise<string[]> {
    if (!(await this.index.firstRow)) {
      return [];
    }
    const reader = await this.reader;
    const { rows } = await reader.readRows(this.index, 0, HEADER_ROWS);
    return rows[0] ?? [];
  }

  /**
   * 表示位置 [start, start + count) のデータ行を読む。
   * 作成中で未確定の行は、確定するまで（または作成が終わるまで）待ってから読む。
   * 作成が終わっても足りない分（ファイルの末尾を超える分）は切り詰める。
   */
  async readDataRows(start: number, count: number): Promise<DataRows> {
    const fileStart = start + HEADER_ROWS;
    await this.waitForRows(fileStart + count);
    this.throwIfDisposed();
    const reader = await this.reader;
    const result = await reader.readRows(this.index, fileStart, count);
    return {
      start,
      rows: result.rows,
      handles: result.rows.map((_, i) => fileStart + i),
      invalidRows: result.invalidRows,
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.abort.abort();
    this.releaseAllWaiters();
    this.progressEmitter.dispose();
    this.closed = Promise.all([
      this.reader.then(
        (reader) => reader.close(),
        () => undefined
      ),
      this.index.done.then(
        () => undefined,
        () => undefined
      ),
    ]).then(() => undefined);
  }

  /** dispose の後、ファイルハンドルを閉じて行インデックスの作成が止まるまで待つ（テスト用） */
  whenClosed(): Promise<void> {
    return this.closed;
  }

  private throwIfDisposed(): void {
    if (this.disposed) {
      throw new Error("文書は閉じられています");
    }
  }

  private waitForRows(rowCount: number): Promise<void> {
    if (this.disposed || this.index.completed || this.index.rowCount >= rowCount) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push({ rowCount, resolve });
    });
  }

  private releaseWaiters(): void {
    const available = this.index.rowCount;
    const ready = this.waiters.filter((w) => w.rowCount <= available);
    if (ready.length === 0) {
      return;
    }
    this.waiters = this.waiters.filter((w) => w.rowCount > available);
    for (const waiter of ready) {
      waiter.resolve();
    }
  }

  private releaseAllWaiters(): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      waiter.resolve();
    }
  }
}

/** 文字コードの選択をキャンセルしたときの文書。resolve でパネルを閉じる */
export class CancelledLargeCsvDocument implements vscode.CustomDocument {
  constructor(readonly uri: vscode.Uri) {}

  dispose(): void {}
}

export type LargeEditorDocument = LargeCsvDocument | CancelledLargeCsvDocument;
