/* global AbortController, AbortSignal */
import * as vscode from "vscode";

import type { LargeOp } from "../message/largeMessages";
import { EditStack } from "../shared/large/editStack";
import { RowStore, type RowSegment } from "../shared/large/rowStore";

import { FileRowReader } from "./fileRowReader";
import {
  writeLargeCsv,
  type WriteLargeCsvOptions,
  type WriteLargeCsvResult,
} from "./largeCsvWriter";
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
  /** 保存の書き出しの差し替え（テストで rename を失敗・保留させる） */
  writer?: Pick<WriteLargeCsvOptions, "rename" | "renameRetry">;
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
}

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
 * revert: 現在のファイル（最後に保存した状態）の恒等の並びに作り直す。
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

  private readonly abort = new AbortController();
  /** 最初に作り始めた行インデックスの完了（作成中の表示に使う） */
  private readonly initialIndexDone: Promise<RowIndexSummary>;
  private currentUri: vscode.Uri;
  private index: RowIndexLike;
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
  private disposed = false;
  private closed: Promise<void> = Promise.resolve();

  private constructor(
    readonly uri: vscode.Uri,
    readonly encoding: LargeEncoding,
    private readonly options: LargeCsvDocumentOptions
  ) {
    this.currentUri = uri;
    const build = options.buildIndex ?? ((path, opts) => RowIndex.build(path, opts));
    const index = build(uri.fsPath, {
      skipBom: skipsBom(encoding),
      signal: this.abort.signal,
      highWaterMark: options.highWaterMark,
      maxRows: options.maxRows,
      onProgress: (progress) => {
        this.releaseWaiters();
        this.progressEmitter.fire(progress);
      },
    });
    this.index = index;
    this.initialIndexDone = index.done;
    // 成否にかかわらず、完了したら待っている要求をすべて進める（足りない分は切り詰める）
    index.done.then(
      () => {
        if (!this.disposed) {
          // 編集は作成完了後のみ。完了時の行数で作る
          this.resetEdits();
        }
        this.releaseAllWaiters();
      },
      () => {
        this.releaseAllWaiters();
      }
    );
    this.reader = this.openReader(uri.fsPath);
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

  /** 破棄されたか */
  get isClosed(): boolean {
    return this.disposed;
  }

  /** 保存した状態と違うか */
  get isDirty(): boolean {
    return this.stack?.isDirty ?? false;
  }

  /** データ行数（作成中は確定済みの行数。ヘッダーを除く） */
  get dataRowCount(): number {
    return this.store?.rowCount ?? Math.max(0, this.index.rowCount - HEADER_ROWS);
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
      return this.store
        ? this.readFromStore(this.store, start, count)
        : this.readFromIndex(start, count);
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
    return this.serial(() => {
      this.throwIfDisposed();
      if (!this.store) {
        // 作成中は編集できないので、戻す変更も無い
        return;
      }
      this.resetEdits();
      this.epoch += 1;
      // revert の前の追加行は無くなるので、revert の前の体系のハンドルの op は付け替えずに拒否する
      this.generation += 1;
      this.lastRemap = undefined;
      this.fireChange();
    });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.abort.abort();
    this.releaseAllWaiters();
    this.progressEmitter.dispose();
    this.editEmitter.dispose();
    this.changeEmitter.dispose();
    this.closed = Promise.all([
      this.closeReader(this.reader),
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
    this.stack = new EditStack(this.store);
  }

  private fireChange(): void {
    this.changeEmitter.fire({
      rowCount: this.dataRowCount,
      header: this.currentHeader,
      generation: this.generation,
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

    // 書き出し先が開いたままだと Windows では置き換えられない（他の OS では古いファイルを読み続ける）
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
    this.index = RowIndex.fromOffsets(result.starts, result.summary);
    this.reader = this.openReader(destination.fsPath);
    this.fileHeader = result.summary.rowCount > 0 ? header : [];
    this.resetEdits();
    this.lastRemap = new HandleRemap(segments);
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
    const reader = await this.reader;
    const result = await reader.readRows(this.index, fileStart, count);
    return {
      start,
      rows: result.rows,
      handles: result.rows.map((_, i) => fileStart + i),
      invalidRows: result.invalidRows,
    };
  }

  /** RowStore の並びで読む。ハンドルが連続する未編集の元の行は1回の範囲読みにまとめる */
  private async readFromStore(store: RowStore, start: number, count: number): Promise<DataRows> {
    const handles = start < store.rowCount ? store.handlesInRange(start, count) : [];
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
      const result = await reader.readRows(this.index, handle, end - i);
      rows.push(...result.rows);
      invalidRows.push(...result.invalidRows);
      i = end;
    }
    return { start, rows, handles, invalidRows };
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
