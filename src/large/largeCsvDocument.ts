/* global AbortController, AbortSignal, __dirname, structuredClone */
import * as path from "path";
import * as vscode from "vscode";

import {
  MAX_ROWS_PER_REQUEST,
  type LargeFilterCondition,
  type LargeOp,
  type LargeQueryState,
  type LargeSearchDirection,
  type LargeSortDirection,
} from "../message/largeMessages";
import { EditStack } from "../shared/large/editStack";
import { normalizeFilters, normalizeSearchQuery } from "../shared/large/query";
import { RowStore, type RowSegment, type RowStoreOp } from "../shared/large/rowStore";
import { applyStoreOpToView, ViewOrder, type RemovedPlace } from "../shared/large/viewOrder";

import { FileRowReader } from "./fileRowReader";
import { sameStamp, statFile, type FileStamp, type LargeBackupData } from "./largeBackup";
import {
  writeLargeCsv,
  type WriteLargeCsvOptions,
  type WriteLargeCsvResult,
} from "./largeCsvWriter";
import { skipsBom, type LargeEncoding } from "./largeEncoding";
import type { QueryJobRequest, QueryJobResult, QuerySource, QueryTuning } from "./queryProtocol";
import { QueryCancelledError, QueryWorkerClient, type QueryJobHandle } from "./queryWorkerClient";
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
  /** 確定済みの行のオフセット表のコピー（検索・ソート・フィルタのワーカーへ渡す） */
  offsets(): Float64Array;
}

export type BuildRowIndex = (filePath: string, options: BuildRowIndexOptions) => RowIndexLike;

export interface LargeCsvDocumentOptions {
  /** 行インデックスの作成（既定 `RowIndex.build`） */
  buildIndex?: BuildRowIndex;
  /** 行インデックスの作成で1回に読むバイト数 */
  highWaterMark?: number;
  /** 行インデックスの行数の上限 */
  maxRows?: number;
  /** 保存の書き出しの差し替え（テストで rename を失敗・保留させる） */
  writer?: Pick<WriteLargeCsvOptions, "rename" | "renameRetry">;
  /** 検索・ソート・フィルタのワーカー（dist/largeCsvWorker.js）のパス */
  workerPath?: string;
  /** ワーカーの読み方の調整（テストで小さくして、走査の途中でキャンセル・保存できるようにする） */
  queryTuning?: QueryTuning;
  /** ソートできる行数（フィルタ後）の上限。既定 MAX_SORT_ROWS（テストで小さくする） */
  maxSortRows?: number;
}

/** 表示位置で指定したデータ行の読み取り結果 */
export interface DataRows {
  /** 表示位置の先頭（要求どおり） */
  start: number;
  rows: string[][];
  /** 行のハンドル（正はファイル上の行番号。0 はヘッダー。負は追加行） */
  handles: number[];
  /** パースできなかった行のファイル上の行番号 */
  invalidRows: number[];
}

/** 編集を1つ当てたこと（VSCode の Undo/Redo の1単位） */
export interface LargeDocumentEdit {
  label: string;
  /** 当てたときの Undo の世代。保存・revert で変わり、古い世代の Undo/Redo は何もしない */
  epoch: number;
}

/** 内容が変わったこと（編集・Undo/Redo・保存・revert の後）。webview に取り直させる */
export interface LargeDocumentChange {
  /** データ行数 */
  rowCount: number;
  /** 現在の列名（読み込む前なら undefined） */
  header?: string[];
  /** 行のハンドルの体系の番号（保存・revert のたびに増える） */
  generation: number;
  /** ソート・フィルタの状態が変わったときだけ載せる（適用・解除・revert） */
  query?: LargeQueryState;
}

/** ファイルを読み直した（外部変更・revert）。行インデックスを作り直している */
export interface LargeDocumentReload {
  /** 作り直した行インデックスの完了（失敗・中断で reject） */
  done: Promise<RowIndexSummary>;
  /** 読み直した後の行のハンドルの体系 */
  generation: number;
}

/** 開くときの指定（バックアップからの復元） */
export interface LargeDocumentOpenOptions {
  /** 読み書きするファイル（省略は uri。別名で保存した文書を復元するとき） */
  fileUri?: vscode.Uri;
  /** 行インデックスの作成後に1単位で当てる op（applyPendingRestore で当てる） */
  restoreOps?: LargeOp[];
}

/** ファイルの状態（最後に読み込み・保存した状態と比べて） */
export type LargeFileState = "unchanged" | "changed" | "deleted";

/** 読み直しの結果。error は自分の変更を当て直せなかったとき（変更は破棄した） */
export interface LargeReloadResult {
  error?: unknown;
}

/** バックアップから復元した編集の名前（VSCode の Undo の単位） */
const RESTORE_LABEL = "バックアップから復元した変更";
/** 外部変更の後に当て直した編集の名前 */
const REPLAY_LABEL = "ファイルの変更後に当て直した変更";

/** 検索・ソート・フィルタのジョブ */
export interface LargeQueryRun<T> {
  /** 結果。取り消し・失敗で reject（LargeQueryAbortedError など） */
  readonly result: Promise<T>;
  /** 取り消す（result は reason "cancel" の LargeQueryAbortedError で reject） */
  cancel(): void;
}

export interface LargeQueryOptions {
  /** 進捗（0〜1。間引きは呼び出し側） */
  onProgress?: (ratio: number) => void;
}

/**
 * ジョブを取り消した理由。
 * - cancel: 利用者のキャンセル / superseded: 新しいジョブを始めた / closed: 文書を閉じた
 * - save / revert: 保存・元に戻す操作の前に取り消した（ワーカーのファイルを閉じるため）
 * - reload: ファイルが外部で変更され、読み直す前に取り消した
 * - stale: 結果を当てる前に保存・revert で行のハンドルの体系が変わった
 */
export type LargeQueryAbortReason =
  "cancel" | "superseded" | "closed" | "save" | "revert" | "reload" | "stale";

const ABORT_MESSAGES: Record<LargeQueryAbortReason, string> = {
  cancel: "取り消しました",
  superseded: "新しい検索・ソート・フィルタを始めたため取り消しました",
  closed: "文書を閉じたため取り消しました",
  save: "保存したため、実行中の検索・ソート・フィルタを取り消しました。もう一度実行してください",
  revert:
    "元に戻したため、実行中の検索・ソート・フィルタを取り消しました。もう一度実行してください",
  reload:
    "ファイルが外部で変更されたため読み直しました。実行中の検索・ソート・フィルタを取り消しました。もう一度実行してください",
  stale: "実行中に保存・元に戻す操作があったため、結果を捨てました。もう一度実行してください",
};

export class LargeQueryAbortedError extends Error {
  constructor(readonly reason: LargeQueryAbortReason) {
    super(ABORT_MESSAGES[reason]);
    this.name = "LargeQueryAbortedError";
  }
}

/** 表示順で指定した検索の一致（表示位置と列） */
export interface LargeSearchMatch {
  row: number;
  col: number;
}

interface ActiveQuery {
  aborted: LargeQueryAbortReason | undefined;
  /** スナップショットを取ってから当てた RowStore の op（結果の表示順に当て直す） */
  pendingOps: RowStoreOp[] | undefined;
  worker: QueryJobHandle | undefined;
}

const EMPTY_QUERY: LargeQueryState = { sort: null, filters: [] };

/**
 * ソートできる行数（フィルタ後）の上限。ワーカーは行ごとに比較キーの文字列を持つので、
 * 500MB・約480万行（"alpha-123-1" のような英数字の列）でワーカーのヒープが約1.4GB になった（計測値）。
 * V8 の既定のヒープ上限（約4GB）に収まるよう、1,000万行で止める
 */
export const MAX_SORT_ROWS = 10_000_000;

const copyQuery = (query: LargeQueryState): LargeQueryState => ({
  sort: query.sort ? { ...query.sort } : null,
  filters: query.filters.map((f) => ({ ...f })),
});

const isEmptyQuery = (query: LargeQueryState) => query.sort === null && query.filters.length === 0;

/** Undo/Redo の結果。stale は保存・revert より前の編集で、何もしなかった */
export type UndoRedoResult = "done" | "none" | "stale";

/** 受け付けられない編集（インデックスの作成中など）。文書は変わっていない */
export class LargeEditRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LargeEditRejectedError";
  }
}

/** 保存・revert をまたいだ古い行のハンドルの編集（付け替えられない）。文書は変わっていない */
export class LargeEditConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LargeEditConflictError";
  }
}

/** ヘッダー（ファイルの行 0）の分。表示位置 i のデータ行はファイルの行 i + 1 */
const HEADER_ROWS = 1;

interface RowWaiter {
  /** この行数まで確定したら resolve */
  rowCount: number;
  resolve: () => void;
}

/**
 * 保存の前のハンドル → 保存したファイルの行番号。
 * 保存中に届いた op（保存の前の並びのハンドルで指定されている）を、保存後の並びに直すために使う。
 */
class HandleRemap {
  /** 元の行の区間（start 昇順） */
  private readonly originals: { start: number; end: number; newStart: number }[] = [];
  /** 書き出した行（編集した元の行・追加行・上書きしたヘッダー） */
  private readonly rows = new Map<number, number>();

  constructor(segments: readonly RowSegment[]) {
    let position = 0;
    for (const segment of segments) {
      if (segment.kind === "original") {
        this.originals.push({ start: segment.start, end: segment.end, newStart: position });
        position += segment.end - segment.start;
      } else {
        this.rows.set(segment.handle, position);
        position += 1;
      }
    }
  }

  /** 保存の後のハンドル。保存したファイルに無い行（削除済み）は、どの行にも当たらないハンドルにする */
  map(handle: number): number {
    const row = this.rows.get(handle);
    if (row !== undefined) {
      return row;
    }
    let low = 0;
    let high = this.originals.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const entry = this.originals[mid];
      if (handle < entry.start) {
        high = mid - 1;
      } else if (handle >= entry.end) {
        low = mid + 1;
      } else {
        return entry.newStart + handle - entry.start;
      }
    }
    // 負のハンドルは保存後の並びに無いので、そのままでもどの行にも当たらない
    return handle > 0 ? Number.MAX_SAFE_INTEGER : handle;
  }

  mapOp(op: LargeOp): LargeOp {
    switch (op.type) {
      case "setRow":
        return { ...op, handle: this.map(op.handle) };
      case "insertRows":
        // handles は新しく採番した追加行なので直さない
        return {
          ...op,
          beforeHandle: op.beforeHandle === null ? null : this.map(op.beforeHandle),
        };
      case "deleteRows":
        return { ...op, handles: op.handles.map((h) => this.map(h)) };
      case "setHeader":
        return op;
    }
  }
}

const EDIT_LABELS: Record<LargeOp["type"], string> = {
  setRow: "セルの編集",
  setHeader: "列名の編集",
  insertRows: "行の挿入",
  deleteRows: "行の削除",
};

/**
 * 大容量モードで開いたファイル。
 * 開くと行インデックスの作成とファイルハンドルのオープンを始める。破棄で作成を中断し、ファイルを閉じる。
 *
 * 編集:
 * - 行インデックスの作成が終わってから受け付ける（完了時の行数で RowStore / EditStack を作る）。作成中は
 *   LargeEditRejectedError で拒否する
 * - 不正な op（存在しないハンドルなど）は RowStoreError を投げ、文書は変えない
 * - 行の取得・編集・Undo/Redo・保存・revert はすべて届いた順に1つずつ処理する（`serial`）。
 *   保存中に届いた行の取得・編集は保存が終わるまで待つ（保存中は FileRowReader を閉じているため）
 *
 * 保存（save / saveAs）:
 * - その時点の `segments()` を書き出し（LargeCsvWriter）、書き出したオフセット表で行インデックスを差し替え、
 *   RowStore / EditStack を保存したファイルの恒等の並びで作り直す。以後のハンドルは保存したファイルの行番号になる
 * - 保存の前の体系のハンドルの op（保存中に届いたもの、保存をまたいで確定したもの）は、
 *   保存したファイルの行番号に直してから当てる。どの体系かは呼び出し側（session）が op の revision から決める
 * - 保存より前の編集の Undo/Redo は何もしない（行番号の体系が変わるため。既知の制約）
 * - 失敗したら、元のファイル・編集内容・未保存の状態は変えず、元のファイルを開き直す
 *
 * revert: 現在のファイル（最後に保存した状態）の恒等の並びに作り直す。ファイルが外部で変わっていたら読み直す。
 *
 * 読み直し（reload。外部変更・revert）: 実行中のジョブを取り消し、ソート・フィルタを解除し、編集の状態を捨てて
 * 行インデックスを作り直す（onDidReload）。keepEdits なら、作り直した後に自分の変更を1単位で当て直す。
 *
 * バックアップ: 最後に読み込み・保存したときのファイルの状態（mtime・size）と、そのファイルに当て直す op 列を返す。
 * 復元（open の restoreOps）は、行インデックスの作成後に applyPendingRestore で1単位として当てる。
 *
 * ハンドルの体系（generation）: 保存・revert のたびに進める。直前の保存の前の体系の op だけ付け替え、
 * それより古い体系・revert の前の体系の op は LargeEditConflictError で拒否する。
 */
export class LargeCsvDocument implements vscode.CustomDocument {
  private readonly progressEmitter = new vscode.EventEmitter<RowIndexProgress>();
  /** 行インデックスの作成中の進捗（チャンクを読むたび） */
  readonly onDidProgress = this.progressEmitter.event;

  private readonly editEmitter = new vscode.EventEmitter<LargeDocumentEdit>();
  /** 編集を当てた（VSCode の CustomDocumentEditEvent にする） */
  readonly onDidEdit = this.editEmitter.event;

  private readonly changeEmitter = new vscode.EventEmitter<LargeDocumentChange>();
  /** 内容が変わった（編集・Undo/Redo・保存・revert の後） */
  readonly onDidChangeContent = this.changeEmitter.event;

  private readonly reloadEmitter = new vscode.EventEmitter<LargeDocumentReload>();
  /** ファイルを読み直した（外部変更・revert）。webview の表示を作り直させる */
  readonly onDidReload = this.reloadEmitter.event;

  /** 今の行インデックスの作成の中断（読み直し・破棄で中断する） */
  private indexAbort = new AbortController();
  /** 最後に読み込み・保存したときのファイルの状態（外部変更の判定・バックアップに使う） */
  private sourceStamp: Promise<FileStamp | "missing" | undefined>;
  /** 作成後に当てるバックアップの op（当てたら undefined） */
  private pendingRestore: LargeOp[] | undefined;
  /** 最初に作り始めた行インデックスの完了（作成中の表示に使う） */
  private readonly initialIndexDone: Promise<RowIndexSummary>;
  private currentUri: vscode.Uri;
  private index!: RowIndexLike;
  private reader: Promise<FileRowReader>;
  /** 編集の状態（行インデックスの作成が終わるまで undefined） */
  private store: RowStore | undefined;
  private stack: EditStack | undefined;
  /** ファイルの1行目（読むまで undefined） */
  private fileHeader: string[] | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  /** 行のハンドルの体系の番号（保存・revert のたびに増える） */
  private generation = 0;
  /** 直前の保存のハンドルの直し方（generation の1つ前の体系から。直前が revert なら undefined） */
  private lastRemap: HandleRemap | undefined;
  /** Undo の世代（保存・revert のたびに増える） */
  private epoch = 0;
  /** これまでに受け取った負のハンドルの最小値（無ければ 0） */
  private minHandle = 0;
  private waiters: RowWaiter[] = [];
  /** ソート・フィルタの表示順（当てていなければ undefined＝RowStore の並び） */
  private view: ViewOrder | undefined;
  private query: LargeQueryState = EMPTY_QUERY;
  /** 表示順から除いた行の場所（削除の Undo で同じ場所へ戻す） */
  private removedPlaces = new Map<number, RemovedPlace>();
  /** 表示順・並びが変わるたびに増やす（検索の結果の位置が古くなったかを判定する） */
  private viewVersion = 0;
  private activeQuery: ActiveQuery | undefined;
  private queryClient: QueryWorkerClient | undefined;
  private disposed = false;
  private closed: Promise<void> = Promise.resolve();

  private constructor(
    readonly uri: vscode.Uri,
    readonly encoding: LargeEncoding,
    private readonly options: LargeCsvDocumentOptions,
    openOptions: LargeDocumentOpenOptions
  ) {
    this.currentUri = openOptions.fileUri ?? uri;
    this.pendingRestore = openOptions.restoreOps;
    const filePath = this.currentUri.fsPath;
    // 作成より先に取る（作成中に書き換えられたら、次の判定で「変わった」になる）
    this.sourceStamp = statFile(filePath);
    this.initialIndexDone = this.startIndex(filePath).done;
    this.reader = this.openReader(filePath);
  }

  static open(
    uri: vscode.Uri,
    encoding: LargeEncoding,
    options: LargeCsvDocumentOptions = {},
    openOptions: LargeDocumentOpenOptions = {}
  ): LargeCsvDocument {
    if (uri.scheme !== "file" || (openOptions.fileUri && openOptions.fileUri.scheme !== "file")) {
      throw new Error("大容量モードで開けるのはローカルのファイルだけです");
    }
    return new LargeCsvDocument(uri, encoding, options, openOptions);
  }

  /**
   * 読み書きするファイル（別名で保存すると保存先に変わる）。
   * `uri` は VSCode が開いた URI のまま変えない（拡張ホストは文書を `uri` で引くので、変えると
   * 編集の通知・保存・破棄が別の文書に向いてしまう）
   */
  get fileUri(): vscode.Uri {
    return this.currentUri;
  }

  /** 最初の行インデックスの作成完了（失敗・中断で reject） */
  get indexDone(): Promise<RowIndexSummary> {
    return this.initialIndexDone;
  }

  /** 作成中か */
  get indexing(): boolean {
    return !this.index.completed;
  }

  /** 適用中のソート・フィルタ */
  get queryState(): LargeQueryState {
    return copyQuery(this.query);
  }

  /** バックアップからの復元が済んだか（復元しない文書は true。当てられなかった場合も済んだ扱い） */
  get restoreSettled(): boolean {
    return this.pendingRestore === undefined;
  }

  /** 破棄されたか */
  get isClosed(): boolean {
    return this.disposed;
  }

  /** 保存した状態と違うか */
  get isDirty(): boolean {
    // 復元の op を当てる前（インデックスの作成中）も、未保存の変更があるとみなす（外部変更で黙って捨てない）
    return this.pendingRestore !== undefined || (this.stack?.isDirty ?? false);
  }

  /** データ行数（作成中は確定済みの行数。ヘッダーを除く） */
  get dataRowCount(): number {
    return (
      this.view?.length ?? this.store?.rowCount ?? Math.max(0, this.index.rowCount - HEADER_ROWS)
    );
  }

  /** 現在の列名（ファイルの1行目を読む前で、上書きもしていなければ undefined） */
  get currentHeader(): string[] | undefined {
    const header = this.store?.header ?? this.fileHeader;
    return header ? [...header] : undefined;
  }

  /** webview が次に使ってよい追加行のハンドル（これまでに受け取った負のハンドルの最小値 - 1） */
  get nextHandle(): number {
    return this.minHandle - 1;
  }

  /** 列名（上書きしていればそれ、無ければファイルの1行目）。1行目が確定するまで待つ。空ファイルなら [] */
  async readHeader(): Promise<string[]> {
    if (!(await this.index.firstRow)) {
      return this.store?.header ? [...this.store.header] : [];
    }
    return this.serial(async () => {
      if (this.store?.header) {
        return [...this.store.header];
      }
      return [...(await this.loadFileHeader())];
    });
  }

  /**
   * 表示位置 [start, start + count) のデータ行を読む。
   * 作成中で未確定の行は、確定するまで（または作成が終わるまで）待ってから読む。
   * 作成が終わっても足りない分（末尾を超える分）は切り詰める。
   * 編集できるようになった後は、RowStore の並びで読む（元の行はファイルから、編集・追加した行は RowStore から）。
   */
  async readDataRows(start: number, count: number): Promise<DataRows> {
    if (!this.store) {
      await this.waitForRows(start + HEADER_ROWS + count);
    }
    return this.serial(() => {
      this.throwIfDisposed();
      if (!this.store) {
        return this.readFromIndex(start, count);
      }
      const handles = this.view
        ? this.view.handlesInRange(start, count)
        : start < this.store.rowCount
          ? this.store.handlesInRange(start, count)
          : [];
      return this.readHandles(this.store, start, handles);
    });
  }

  /**
   * op 列を1単位として当てる（webview の `large/applyOps` 1通）。当てたら true（空なら false）。
   * generation は ops のハンドルの体系（webview がハンドルを得たときの体系。省略は届いた時点の体系）。
   * - 現在の体系ならそのまま、直前の保存の前の体系なら保存したファイルの行番号に付け替えて当てる
   * - それより古い体系・revert の前の体系なら LargeEditConflictError で拒否する
   * 作成中は LargeEditRejectedError、不正な op（消えた行への op を含む）は RowStoreError。いずれも文書は変えない
   */
  applyOps(ops: readonly LargeOp[], generation: number = this.generation): Promise<boolean> {
    return this.serial(() => {
      this.throwIfDisposed();
      if (!this.stack) {
        throw new LargeEditRejectedError(
          "行インデックスの作成中は編集できません。作成が終わってから編集してください"
        );
      }
      const translated = this.translate(ops, generation);
      if (!this.stack.apply(translated)) {
        return false;
      }
      for (const op of ops) {
        if (op.type === "insertRows") {
          this.minHandle = Math.min(this.minHandle, ...op.handles);
        }
      }
      this.editEmitter.fire({ label: EDIT_LABELS[ops[0].type], epoch: this.epoch });
      this.fireChange();
      return true;
    });
  }

  /** epoch の編集を元に戻す（epoch が古ければ何もせず stale） */
  undo(epoch: number): Promise<UndoRedoResult> {
    return this.serial(() => this.undoRedo(epoch, (stack) => stack.undo()));
  }

  /** epoch の編集をやり直す（epoch が古ければ何もせず stale） */
  redo(epoch: number): Promise<UndoRedoResult> {
    return this.serial(() => this.undoRedo(epoch, (stack) => stack.redo()));
  }

  /** 開いているファイルへ保存する */
  save(signal?: AbortSignal): Promise<void> {
    return this.serial(() => this.saveTo(this.currentUri, signal));
  }

  /** 別のファイルへ保存し、以後はそのファイルを読み書きする（`uri` は変えない） */
  saveAs(destination: vscode.Uri, signal?: AbortSignal): Promise<void> {
    if (destination.scheme !== "file") {
      return Promise.reject(new Error("大容量モードで保存できるのはローカルのファイルだけです"));
    }
    return this.serial(() => this.saveTo(destination, signal));
  }

  /** 保存した状態（現在のファイルの内容）に戻す */
  revert(): Promise<void> {
    return this.serial(async () => {
      this.throwIfDisposed();
      if ((await this.fileState()) === "changed") {
        // 外部で変わっていたら、変わった後のファイルを読み直す
        await this.restartIndex();
        return;
      }
      if (!this.store) {
        // 作成中は編集できないので、戻す変更も無い
        return;
      }
      await this.abortQuery("revert");
      // ソート・フィルタも解除する（revert の前の追加行は無くなる）
      this.clearView();
      this.resetEdits();
      this.epoch += 1;
      // revert の前の追加行は無くなるので、revert の前の体系のハンドルの op は付け替えずに拒否する
      this.generation += 1;
      this.lastRemap = undefined;
      this.fireChange(true);
    });
  }

  /**
   * 列でソートする（direction が null なら解除）。今のフィルタはそのまま（フィルタ → ソートの順で表示順を作る）。
   * ソートもフィルタも無くなったら表示順を捨てて RowStore の並びに戻す（ワーカーは使わない）。
   * 当てたら onDidChangeContent（query 付き）を発火する。
   */
  sort(
    column: number,
    direction: LargeSortDirection,
    options: LargeQueryOptions = {}
  ): LargeQueryRun<void> {
    return this.runView(
      (current) => ({
        sort: direction === null ? null : { column, direction },
        filters: current.filters,
      }),
      options
    );
  }

  /** 列ごとの条件（AND）でフィルタする。空の条件は除く（すべて空なら解除）。今のソートはそのまま */
  filter(
    filters: readonly LargeFilterCondition[],
    options: LargeQueryOptions = {}
  ): LargeQueryRun<void> {
    const kept = filters
      .filter((f) => f.text !== "")
      .map((f) => ({ column: f.column, text: f.text }));
    return this.runView((current) => ({ sort: current.sort, filters: kept }), options);
  }

  /**
   * 表示順で検索する（from・fromCol・direction の意味は `large/search` と同じ）。
   * 検索語が空白だけなら何もせず null。表示行が無ければ null。from が表示行数以上なら末尾の行から探す
   */
  search(
    query: string,
    from: number,
    fromCol: number | undefined,
    direction: LargeSearchDirection,
    options: LargeQueryOptions = {}
  ): LargeQueryRun<LargeSearchMatch | null> {
    const needle = normalizeSearchQuery(query);
    if (needle === null) {
      return { result: Promise.resolve(null), cancel: () => {} };
    }
    return this.runJob<LargeSearchMatch | null>(
      options,
      async (store) => {
        const order = this.view ? this.view.toFloat64Array() : store.handlesSnapshot();
        if (order.length === 0) {
          return { immediate: () => null };
        }
        return {
          kind: "search",
          source: await this.querySource(),
          rows: { order, edits: store.editedEntries() },
          needle,
          // 要求の後に行が減っていたら末尾から探す（一致があるのに「無い」と返さない）
          from: Math.min(from, order.length - 1),
          fromCol,
          direction,
          tuning: this.options.queryTuning,
        };
      },
      (output, viewVersion) => {
        const match = output.kind === "search" ? output.match : null;
        if (!match) {
          return null;
        }
        if (viewVersion === this.viewVersion) {
          return { row: match.position, col: match.col };
        }
        // 検索している間に行の挿入・削除があった。見つけた行の今の位置を引き直す
        const row = this.view
          ? this.view.indexOf(match.handle)
          : (this.store?.indexOfHandle(match.handle) ?? -1);
        return row < 0 ? null : { row, col: match.col };
      }
    );
  }

  /**
   * バックアップから復元する op を、行インデックスの作成後に1単位の編集として当てる（無ければ何もしない）。
   * 当てられなければ（作成の失敗・不正な op）変更を破棄して reject する（文書はファイルの状態のまま）
   */
  async applyPendingRestore(): Promise<void> {
    const ops = this.pendingRestore;
    if (!ops) {
      return;
    }
    try {
      await this.initialIndexDone;
      await this.serial(() => {
        // 作成中に読み直していたら（外部変更）、復元の op は捨てられている
        if (this.pendingRestore === ops) {
          this.applyAsOneEdit(ops, RESTORE_LABEL);
        }
      });
    } finally {
      if (this.pendingRestore === ops) {
        this.pendingRestore = undefined;
      }
    }
  }

  /** バックアップに書く内容（serial の中で取るので、保存の途中の状態は混ざらない） */
  backupData(): Promise<LargeBackupData> {
    return this.serial(async () => {
      const stamp = await this.sourceStamp;
      return {
        version: 1 as const,
        fileUri: this.currentUri.toString(),
        encoding: this.encoding,
        source: typeof stamp === "object" ? stamp : null,
        // 復元の op を当てる前なら、その op をそのまま残す
        ops: this.pendingRestore
          ? this.pendingRestore.map((op) => structuredClone(op))
          : (this.stack?.appliedOps() ?? []),
      };
    });
  }

  /** ファイルが最後に読み込み・保存したときから変わったか（保存の途中なら終わってから調べる） */
  checkFile(): Promise<LargeFileState> {
    return this.serial(() => this.fileState());
  }

  /**
   * ファイルを読み直す（外部変更）。keepEdits なら、作り直した後に今の変更を1単位で当て直す
   * （当て直せなければ変更を破棄し、結果の error で知らせる）。作成の完了と当て直しまで待つ
   */
  async reload(keepEdits: boolean): Promise<LargeReloadResult> {
    const { ops, done } = await this.serial(async () => {
      this.throwIfDisposed();
      const kept = keepEdits ? (this.stack?.appliedOps() ?? this.pendingRestore ?? []) : [];
      return { ops: kept, done: await this.restartIndex() };
    });
    try {
      await done.done;
    } catch (error) {
      return ops.length > 0 ? { error } : {};
    }
    if (ops.length === 0) {
      return {};
    }
    try {
      await this.serial(() => {
        this.throwIfDisposed();
        this.applyAsOneEdit(ops, REPLAY_LABEL);
      });
      return {};
    } catch (error) {
      return { error };
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.indexAbort.abort();
    this.abortActiveQuery("closed");
    this.releaseAllWaiters();
    this.progressEmitter.dispose();
    this.editEmitter.dispose();
    this.changeEmitter.dispose();
    this.reloadEmitter.dispose();
    const client = this.queryClient;
    this.queryClient = undefined;
    this.closed = Promise.all([
      this.closeReader(this.reader),
      client?.dispose(),
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

  // ---- 内部 ----

  /** 行インデックスの作成を始める（以前のインデックスの完了・進捗は無視する） */
  private startIndex(filePath: string): RowIndexLike {
    const abort = new AbortController();
    this.indexAbort = abort;
    const build = this.options.buildIndex ?? ((path, opts) => RowIndex.build(path, opts));
    const index = build(filePath, {
      skipBom: skipsBom(this.encoding),
      signal: abort.signal,
      highWaterMark: this.options.highWaterMark,
      maxRows: this.options.maxRows,
      onProgress: (progress) => {
        if (this.index !== index) {
          return;
        }
        this.releaseWaiters();
        this.progressEmitter.fire(progress);
      },
    });
    this.index = index;
    // 成否にかかわらず、完了したら待っている要求をすべて進める（足りない分は切り詰める）
    index.done.then(
      () => {
        if (this.index !== index) {
          return;
        }
        if (!this.disposed) {
          // 編集は作成完了後のみ。完了時の行数で作る
          this.resetEdits();
        }
        this.releaseAllWaiters();
      },
      () => {
        if (this.index === index) {
          this.releaseAllWaiters();
        }
      }
    );
    return index;
  }

  /** serial の中で呼ぶ */
  private async fileState(): Promise<LargeFileState> {
    const current = await statFile(this.currentUri.fsPath);
    if (current === "missing") {
      return "deleted";
    }
    if (current === undefined) {
      // 調べられない（権限など）ときは変わっていない扱いにする
      return "unchanged";
    }
    return sameStamp(current, await this.sourceStamp) ? "unchanged" : "changed";
  }

  /**
   * 今のファイルを読み直す（serial の中で呼ぶ）。ジョブを取り消し、ソート・フィルタと編集の状態を捨て、
   * ハンドルの体系と Undo の世代を進めて行インデックスを作り直す。作り直したインデックスの完了を返す
   */
  private async restartIndex(): Promise<{ done: Promise<RowIndexSummary> }> {
    await this.abortQuery("reload");
    this.indexAbort.abort();
    await this.closeReader(this.reader);
    this.clearView();
    this.store = undefined;
    this.stack = undefined;
    this.fileHeader = undefined;
    this.pendingRestore = undefined;
    // 読み直す前の行のハンドルは付け替えられないので、古い体系の op は拒否する
    this.generation += 1;
    this.epoch += 1;
    this.lastRemap = undefined;
    const filePath = this.currentUri.fsPath;
    this.sourceStamp = statFile(filePath);
    await this.sourceStamp;
    // 前のインデックスを待っていた行の取得は、作り直したインデックスの進捗で進める
    const index = this.startIndex(filePath);
    this.reader = this.openReader(filePath);
    this.reloadEmitter.fire({ done: index.done, generation: this.generation });
    // async 関数から Promise をそのまま返すと完了まで待つことになるので包む
    return { done: index.done };
  }

  /** op 列を1単位の編集として当てる（serial の中で呼ぶ）。当てられなければ投げる（状態は変えない） */
  private applyAsOneEdit(ops: readonly LargeOp[], label: string): void {
    if (!this.stack) {
      throw new LargeEditRejectedError(
        "行インデックスを作成できなかったため、変更を当てられません"
      );
    }
    if (!this.stack.apply(ops)) {
      return;
    }
    for (const op of ops) {
      if (op.type === "insertRows") {
        this.minHandle = Math.min(this.minHandle, ...op.handles);
      }
    }
    this.editEmitter.fire({ label, epoch: this.epoch });
    this.fireChange();
  }

  /** 届いた順に1つずつ処理する（前の処理が失敗しても次へ進む） */
  private serial<T>(task: () => T | Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private openReader(filePath: string): Promise<FileRowReader> {
    const reader = FileRowReader.open(filePath, { encoding: this.encoding });
    // 待つ側がいなくても unhandled にしない（失敗は読み取りのたびに reject として返る）
    reader.catch(() => {});
    return reader;
  }

  private closeReader(reader: Promise<FileRowReader>): Promise<void> {
    return reader.then(
      (r) => r.close(),
      () => undefined
    );
  }

  private resetEdits(): void {
    this.store = new RowStore(this.index.rowCount);
    this.stack = new EditStack(this.store, {
      onApplied: (op) => {
        this.onStoreOp(op);
      },
    });
  }

  /** queryChanged はソート・フィルタの状態が変わったとき（invalidate に query を載せる） */
  private fireChange(queryChanged = false): void {
    this.changeEmitter.fire({
      rowCount: this.dataRowCount,
      header: this.currentHeader,
      generation: this.generation,
      ...(queryChanged ? { query: copyQuery(this.query) } : {}),
    });
  }

  /** ファイルの1行目（serial の中で呼ぶ） */
  private async loadFileHeader(): Promise<string[]> {
    if (this.fileHeader) {
      return this.fileHeader;
    }
    if (this.index.rowCount === 0) {
      return [];
    }
    const reader = await this.reader;
    const { rows } = await reader.readRows(this.index, 0, HEADER_ROWS);
    this.fileHeader = rows[0] ?? [];
    return this.fileHeader;
  }

  private translate(ops: readonly LargeOp[], generation: number): LargeOp[] {
    if (generation === this.generation) {
      return [...ops];
    }
    if (generation !== this.generation - 1 || !this.lastRemap) {
      throw new LargeEditConflictError(
        "保存・元に戻す操作の前後で編集が競合したため、この編集を取り消しました"
      );
    }
    const remap = this.lastRemap;
    return ops.map((op) => remap.mapOp(op));
  }

  private undoRedo(epoch: number, run: (stack: EditStack) => boolean): UndoRedoResult {
    if (this.disposed || !this.stack || epoch !== this.epoch) {
      return "stale";
    }
    if (!run(this.stack)) {
      return "none";
    }
    this.fireChange();
    return "done";
  }

  private async saveTo(destination: vscode.Uri, signal: AbortSignal | undefined): Promise<void> {
    this.throwIfDisposed();
    if (!this.store || !this.index.completed) {
      throw new Error("行インデックスの作成中は保存できません。作成が終わってから保存してください");
    }
    const summary = await this.index.done;
    const header = this.store.header ? [...this.store.header] : await this.loadFileHeader();
    // 書き出す並びのスナップショット（保存中は serial で編集を待たせるので変わらないが、念のため固定する）
    const segments = [...this.store.segments()];
    const sourcePath = this.currentUri.fsPath;

    // 書き出し先が開いたままだと Windows では置き換えられない（他の OS では古いファイルを読み続ける）。
    // 検索・ソート・フィルタのワーカーもファイルを開いているので、先に取り消して閉じさせる
    await this.abortQuery("save");
    await this.closeReader(this.reader);
    let result: WriteLargeCsvResult;
    try {
      result = await writeLargeCsv({
        ...this.options.writer,
        sourcePath,
        targetPath: destination.fsPath,
        index: this.index,
        summary,
        segments,
        encoding: this.encoding,
        signal,
      });
    } catch (error) {
      // 元のファイルは変わっていないので、そのまま読み続ける（編集内容・未保存の状態も変えない）
      this.reader = this.openReader(sourcePath);
      this.closeIfDisposed();
      throw error;
    }

    this.currentUri = destination;
    // 自分の保存を外部変更と見なさないよう、保存した後のファイルの状態を記録する
    this.sourceStamp = statFile(destination.fsPath);
    await this.sourceStamp;
    this.index = RowIndex.fromOffsets(result.starts, result.summary);
    this.reader = this.openReader(destination.fsPath);
    this.fileHeader = result.summary.rowCount > 0 ? header : [];
    this.resetEdits();
    this.lastRemap = new HandleRemap(segments);
    this.remapView(this.lastRemap);
    this.generation += 1;
    this.epoch += 1;
    this.closeIfDisposed();
    if (!this.disposed) {
      this.fireChange();
    }
  }

  /** 保存の途中で破棄されていたら、開き直したファイルを閉じる */
  private closeIfDisposed(): void {
    if (this.disposed) {
      void this.closeReader(this.reader);
    }
  }

  private async readFromIndex(start: number, count: number): Promise<DataRows> {
    const fileStart = start + HEADER_ROWS;
    const result = await this.readFileRows(await this.reader, fileStart, count);
    return {
      start,
      rows: result.rows,
      handles: result.rows.map((_, i) => fileStart + i),
      invalidRows: result.invalidRows,
    };
  }

  /** ハンドルの行を読む。ハンドルが連続する未編集の元の行は1回の範囲読みにまとめる */
  private async readHandles(store: RowStore, start: number, handles: number[]): Promise<DataRows> {
    const rows: string[][] = [];
    const invalidRows: number[] = [];
    let reader: FileRowReader | undefined;
    let i = 0;
    while (i < handles.length) {
      const handle = handles[i];
      const edited = store.getEdited(handle);
      if (edited || handle <= 0) {
        rows.push([...(edited ?? [])]);
        i += 1;
        continue;
      }
      let end = i + 1;
      while (
        end < handles.length &&
        handles[end] === handles[end - 1] + 1 &&
        !store.getEdited(handles[end])
      ) {
        end += 1;
      }
      reader ??= await this.reader;
      const result = await this.readFileRows(reader, handle, end - i);
      // 10万行になりうるので、引数の展開（引数の数の上限がある）を使わずに足す
      for (const row of result.rows) {
        rows.push(row);
      }
      invalidRows.push(...result.invalidRows);
      i = end;
    }
    return { start, rows, handles, invalidRows };
  }

  /**
   * ファイル上の行 [fileStart, fileStart + count) を読む。FileRowReader は1回 MAX_ROWS_PER_REQUEST 行までなので、
   * 範囲のコピー（10万セルまで）のように多い行は分けて読んで連結する。末尾を超える分は切り詰める
   */
  private async readFileRows(
    reader: FileRowReader,
    fileStart: number,
    count: number
  ): Promise<{ rows: string[][]; invalidRows: number[] }> {
    if (count <= MAX_ROWS_PER_REQUEST) {
      return reader.readRows(this.index, fileStart, count);
    }
    const rows: string[][] = [];
    const invalidRows: number[] = [];
    for (let offset = 0; offset < count; offset += MAX_ROWS_PER_REQUEST) {
      const part = Math.min(MAX_ROWS_PER_REQUEST, count - offset);
      const result = await reader.readRows(this.index, fileStart + offset, part);
      for (const row of result.rows) {
        rows.push(row);
      }
      invalidRows.push(...result.invalidRows);
      if (result.rows.length < part) {
        break;
      }
    }
    return { rows, invalidRows };
  }

  // ---- 検索・ソート・フィルタ ----

  /** 表示順を作り直す（update は、そのときの条件から次の条件を作る） */
  private runView(
    update: (current: LargeQueryState) => LargeQueryState,
    options: LargeQueryOptions
  ): LargeQueryRun<void> {
    let next = EMPTY_QUERY;
    return this.runJob<undefined>(
      options,
      async (store) => {
        next = copyQuery(update(this.query));
        if (isEmptyQuery(next)) {
          return {
            immediate: () => {
              this.clearView();
              this.fireChange(true);
            },
          };
        }
        return {
          kind: "view",
          source: await this.querySource(),
          rows: { order: store.handlesSnapshot(), edits: store.editedEntries() },
          filters: normalizeFilters(next.filters),
          sort: next.sort,
          maxSortRows: this.options.maxSortRows ?? MAX_SORT_ROWS,
          tuning: this.options.queryTuning,
        };
      },
      (output, _viewVersion, pendingOps) => {
        if (output.kind !== "view") {
          return;
        }
        const view = new ViewOrder(output.handles);
        const places = new Map<number, RemovedPlace>();
        // ワーカーが走査している間の行の挿入・削除を、結果の表示順にも当てる
        for (const op of pendingOps) {
          applyStoreOpToView(view, op, places);
        }
        this.view = view;
        this.query = next;
        this.removedPlaces = places;
        this.viewVersion += 1;
        this.fireChange(true);
      }
    );
  }

  /**
   * ジョブを1つ実行する。前のジョブは取り消す（1つずつ）。
   * - prepare: serial の中でスナップショットを取り、ワーカーへの要求を作る（immediate ならワーカーを使わない）
   * - ワーカーの実行は serial の外（実行中も行の取得・編集を止めない）
   * - apply: serial の中で結果を当てる。始めたときと行のハンドルの体系（保存・revert で変わる）が違えば捨てる
   */
  private runJob<T>(
    options: LargeQueryOptions,
    prepare: (store: RowStore) => Promise<QueryJobRequest | { immediate: () => T }>,
    apply: (output: QueryJobResult, viewVersion: number, pendingOps: readonly RowStoreOp[]) => T
  ): LargeQueryRun<T> {
    this.abortActiveQuery("superseded");
    const job: ActiveQuery = { aborted: undefined, pendingOps: undefined, worker: undefined };
    this.activeQuery = job;
    const throwIfAborted = () => {
      if (job.aborted) {
        throw new LargeQueryAbortedError(job.aborted);
      }
    };
    const run = async (): Promise<T> => {
      const prepared = await this.serial(async () => {
        throwIfAborted();
        this.throwIfDisposed();
        const store = this.requireQueryable();
        const planned = await prepare(store);
        if ("immediate" in planned) {
          return { done: true as const, value: planned.immediate() };
        }
        job.pendingOps = [];
        return {
          done: false as const,
          request: planned,
          generation: this.generation,
          viewVersion: this.viewVersion,
        };
      });
      if (prepared.done) {
        return prepared.value;
      }
      throwIfAborted();
      this.queryClient ??= new QueryWorkerClient(this.workerPath());
      job.worker = this.queryClient.run(prepared.request, {
        onProgress: options.onProgress,
        // 大きなソートで使ったメモリを確実に返す（次のジョブでワーカーを作り直す）
        recycle: prepared.request.kind === "view",
      });
      let output: QueryJobResult;
      try {
        output = await job.worker.result;
      } catch (error) {
        throwIfAborted();
        throw error instanceof QueryCancelledError
          ? new Error("検索・ソート・フィルタのワーカーが止まりました。もう一度実行してください")
          : error;
      }
      return this.serial(() => {
        throwIfAborted();
        this.throwIfDisposed();
        if (this.generation !== prepared.generation) {
          throw new LargeQueryAbortedError("stale");
        }
        return apply(output, prepared.viewVersion, job.pendingOps ?? []);
      });
    };
    const result = run().finally(() => {
      if (this.activeQuery === job) {
        this.activeQuery = undefined;
      }
    });
    // 待つ側がいなくても unhandled にしない
    result.catch(() => {});
    return {
      result,
      cancel: () => {
        this.abortJob(job, "cancel");
      },
    };
  }

  private abortJob(job: ActiveQuery, reason: LargeQueryAbortReason): void {
    if (job.aborted) {
      return;
    }
    job.aborted = reason;
    void job.worker?.cancel();
  }

  private abortActiveQuery(reason: LargeQueryAbortReason): void {
    if (this.activeQuery) {
      this.abortJob(this.activeQuery, reason);
    }
  }

  /** 実行中のジョブを取り消し、ワーカーがファイルを閉じるまで待つ（保存・revert の前に serial の中で呼ぶ） */
  private async abortQuery(reason: LargeQueryAbortReason): Promise<void> {
    const job = this.activeQuery;
    if (job) {
      this.abortJob(job, reason);
      await job.worker?.cancel();
    }
    await this.queryClient?.release();
  }

  private requireQueryable(): RowStore {
    if (!this.store) {
      throw new LargeEditRejectedError(
        "行インデックスの作成中は検索・ソート・フィルタを使えません。作成が終わってから実行してください"
      );
    }
    return this.store;
  }

  /** ワーカーが読むファイルのスナップショット（オフセット表はコピー。ワーカーへ転送する） */
  private async querySource(): Promise<QuerySource> {
    const summary = await this.index.done;
    return {
      filePath: this.currentUri.fsPath,
      encoding: this.encoding,
      starts: this.index.offsets(),
      summary,
    };
  }

  private workerPath(): string {
    // 既定はバンドルした拡張機能（dist/extension.js）と同じディレクトリ
    return this.options.workerPath ?? path.join(__dirname, "largeCsvWorker.js");
  }

  /** RowStore に op を当てた（編集・Undo/Redo）。表示順と実行中のジョブの記録に反映する */
  private onStoreOp(op: RowStoreOp): void {
    if (op.type === "insertRows" || op.type === "deleteRows" || op.type === "restoreRows") {
      this.viewVersion += 1;
      if (this.view) {
        applyStoreOpToView(this.view, op, this.removedPlaces);
      }
      this.activeQuery?.pendingOps?.push(op);
    }
  }

  private clearView(): void {
    this.view = undefined;
    this.query = EMPTY_QUERY;
    this.removedPlaces = new Map();
    this.viewVersion += 1;
  }

  /** 保存で行の番号が変わったので、表示順のハンドルを保存したファイルの行番号に付け替える */
  private remapView(remap: HandleRemap): void {
    this.removedPlaces = new Map();
    this.viewVersion += 1;
    this.view?.remap((handle) => {
      const mapped = remap.map(handle);
      // 保存したファイルに無い行（消えた行）は除く
      return mapped > 0 && mapped !== Number.MAX_SAFE_INTEGER ? mapped : undefined;
    });
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
