import type { LargeOp } from "../../message/largeMessages";

/**
 * 大容量モードの行の並びと編集内容（vscode API・npm パッケージに依存しない純粋なロジック）。
 *
 * ハンドル: 0 はヘッダー（ファイルの1行目）、1..N は元ファイルのデータ行（ファイル上の行番号）、
 * 負は追加行（webview が採番して `insertRows` で送る）。初期状態ではデータ表示位置 i のハンドルは i+1。
 *
 * 並びは「表示順＝保存するファイル上の並び」。ソート・フィルタの表示順は 2-3 で別に持つ。
 * 行の移動は無いので、元ファイルの行（正のハンドル）は常に昇順に並ぶ（`indexOfHandle` はこれを使う）。
 *
 * 表現: チャンクの列。チャンクは「元ファイルの連続した行範囲（start, length）」か、
 * 「ハンドルの配列（chunkSize 以下）」。初期状態は 1..N の1区間なので、500万行でも作成は O(1)。
 * 挿入・削除は触れたチャンクの付近だけを作り直す（O(チャンク数 + chunkSize + 変更行数)）。
 *
 * 前提: 編集は行インデックスの作成完了後のみ許可する（provider 側でガードする）。
 * 作成中は元ファイルの行数が増えるため、完了時の行数でこのクラスを作る。
 */

/** deleteRows の逆操作で戻す、削除前に表示順で隣り合っていた行 */
export interface RestoreRun {
  /** 戻す位置: この行の直前（削除時に run の直後にあった、削除されなかった行）。null は末尾 */
  beforeHandle: number | null;
  handles: number[];
  /** 各行の内容。null は元ファイルの行のまま（未編集） */
  rows: (string[] | null)[];
}

/**
 * 逆操作専用の内部 op（`LargeOp` には無い。webview からは受け付けない）。
 * - clearRow: 元ファイルの行の編集を取り消す（元の内容に戻す）
 * - clearHeader: ヘッダーの上書きを取り消す
 * - restoreRows: 削除した行を元の位置・内容で戻す（元ファイルの行を戻せる唯一の op）
 */
export type InternalOp =
  | { type: "clearRow"; handle: number }
  | { type: "clearHeader" }
  | { type: "restoreRows"; runs: RestoreRun[] };

export type RowStoreOp = LargeOp | InternalOp;

/**
 * 保存用の区間（ファイル上の並び順）。
 * - original: 元ファイルの行 [start, end)（ファイル上の行番号。0 はヘッダー）。バイト範囲をそのままコピーできる
 * - row: 書き出す内容（ヘッダーの上書きは handle 0、編集した元の行、追加行）
 * 隣り合う original 同士が連続する（a.end === b.start）ことは無い。
 */
export type RowSegment =
  | { kind: "original"; start: number; end: number }
  | { kind: "row"; handle: number; row: readonly string[] };

export interface RowStoreOptions {
  /** ハンドル配列のチャンクの最大長（テストでは小さくして境界を通す） */
  chunkSize?: number;
}

/** 不正な op（存在しないハンドル・重複・衝突など）。投げたときは状態を変えていない */
export class RowStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RowStoreError";
  }
}

export const DEFAULT_CHUNK_SIZE = 4096;

interface RangeChunk {
  kind: "range";
  start: number;
  length: number;
}

interface ListChunk {
  kind: "list";
  handles: number[];
  /** 配列中の最初・最後の正のハンドル（無ければ NaN） */
  firstOriginal: number;
  lastOriginal: number;
}

type Chunk = RangeChunk | ListChunk;

type Piece = { kind: "range"; start: number; length: number } | { kind: "list"; handles: number[] };

const lengthOf = (chunk: Piece): number =>
  chunk.kind === "range" ? chunk.length : chunk.handles.length;

const isHandle = (value: number): boolean => Number.isSafeInteger(value) && value !== 0;

function makeList(handles: number[]): ListChunk {
  let first = NaN;
  let last = NaN;
  for (const h of handles) {
    if (h > 0) {
      if (Number.isNaN(first)) {
        first = h;
      }
      last = h;
    }
  }
  return { kind: "list", handles, firstOriginal: first, lastOriginal: last };
}

/** piece を [0, at) と [at, len) に分ける */
function splitPiece(piece: Piece, at: number): [Piece | null, Piece | null] {
  const len = lengthOf(piece);
  if (at <= 0) {
    return [null, piece];
  }
  if (at >= len) {
    return [piece, null];
  }
  if (piece.kind === "range") {
    return [
      { kind: "range", start: piece.start, length: at },
      { kind: "range", start: piece.start + at, length: len - at },
    ];
  }
  return [
    { kind: "list", handles: piece.handles.slice(0, at) },
    { kind: "list", handles: piece.handles.slice(at) },
  ];
}

function pushHandles(target: number[], piece: Piece) {
  if (piece.kind === "range") {
    for (let i = 0; i < piece.length; i++) {
      target.push(piece.start + i);
    }
  } else {
    for (const h of piece.handles) {
      target.push(h);
    }
  }
}

export class RowStore {
  private chunks: Chunk[];
  private count: number;
  private readonly chunkSize: number;
  private readonly lineCount: number;
  /** 並びにある行のうち、編集した元の行と追加行の内容 */
  private readonly edits = new Map<number, string[]>();
  /** 並びにある追加行（負のハンドル）→ それを持つチャンク */
  private readonly negatives = new Map<number, ListChunk>();
  private headerOverride: string[] | undefined;

  /**
   * @param originalLineCount 元ファイルの行数（ヘッダーを含む）。データ行は max(0, 行数 - 1)
   */
  constructor(originalLineCount: number, options: RowStoreOptions = {}) {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    if (!Number.isSafeInteger(originalLineCount) || originalLineCount < 0) {
      throw new RangeError(`invalid line count: ${String(originalLineCount)}`);
    }
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
      throw new RangeError(`invalid chunk size: ${String(chunkSize)}`);
    }
    this.lineCount = originalLineCount;
    this.chunkSize = chunkSize;
    this.count = Math.max(0, originalLineCount - 1);
    this.chunks = this.count > 0 ? [{ kind: "range", start: 1, length: this.count }] : [];
  }

  /** 並びにあるデータ行数 */
  get rowCount(): number {
    return this.count;
  }

  /** 元ファイルのデータ行数 */
  get originalDataRowCount(): number {
    return Math.max(0, this.lineCount - 1);
  }

  /** 内容が元ファイルと違うか（O(1)。並び・編集・ヘッダーのいずれか） */
  get isModified(): boolean {
    // 元の行は昇順にしか並ばず、追加行は edits に入るので、件数が同じで編集が無ければ元と同じ
    return (
      this.headerOverride !== undefined ||
      this.edits.size > 0 ||
      this.count !== this.originalDataRowCount
    );
  }

  /** 上書きしたヘッダー（上書きしていなければ undefined＝元ファイルの1行目） */
  get header(): readonly string[] | undefined {
    return this.headerOverride;
  }

  /** 表示位置 → ハンドル */
  handleAt(viewIndex: number): number {
    if (!Number.isInteger(viewIndex) || viewIndex < 0 || viewIndex >= this.count) {
      throw new RangeError(`view index out of range: ${String(viewIndex)}`);
    }
    let base = 0;
    for (const chunk of this.chunks) {
      const len = lengthOf(chunk);
      if (viewIndex < base + len) {
        const offset = viewIndex - base;
        return chunk.kind === "range" ? chunk.start + offset : chunk.handles[offset];
      }
      base += len;
    }
    throw new RangeError(`view index out of range: ${String(viewIndex)}`);
  }

  /** 表示位置 [start, start + count) のハンドル（末尾で切り詰める） */
  handlesInRange(start: number, count: number): number[] {
    if (!Number.isInteger(start) || start < 0 || !Number.isInteger(count) || count < 0) {
      throw new RangeError(`invalid range: ${String(start)}, ${String(count)}`);
    }
    const end = Math.min(this.count, start + count);
    const result: number[] = [];
    let base = 0;
    for (const chunk of this.chunks) {
      if (base >= end) {
        break;
      }
      const len = lengthOf(chunk);
      const from = Math.max(start, base);
      const to = Math.min(end, base + len);
      for (let i = from; i < to; i++) {
        result.push(chunk.kind === "range" ? chunk.start + i - base : chunk.handles[i - base]);
      }
      base += len;
    }
    return result;
  }

  /** ハンドル → 表示位置（無ければ -1）。O(チャンク数 + chunkSize) */
  indexOfHandle(handle: number): number {
    if (!isHandle(handle)) {
      return -1;
    }
    if (handle < 0) {
      const chunk = this.negatives.get(handle);
      if (!chunk) {
        return -1;
      }
      let base = 0;
      for (const c of this.chunks) {
        if (c === chunk) {
          return base + chunk.handles.indexOf(handle);
        }
        base += lengthOf(c);
      }
      return -1;
    }
    let base = 0;
    for (const chunk of this.chunks) {
      if (chunk.kind === "range") {
        if (handle < chunk.start) {
          return -1;
        }
        if (handle < chunk.start + chunk.length) {
          return base + handle - chunk.start;
        }
        base += chunk.length;
      } else {
        if (!Number.isNaN(chunk.firstOriginal)) {
          if (handle < chunk.firstOriginal) {
            return -1;
          }
          if (handle <= chunk.lastOriginal) {
            const offset = chunk.handles.indexOf(handle);
            return offset < 0 ? -1 : base + offset;
          }
        }
        base += chunk.handles.length;
      }
    }
    return -1;
  }

  /** 並びのハンドルすべて（表示位置の順。ワーカーへ渡すスナップショット）。O(行数) */
  handlesSnapshot(): Float64Array {
    const result = new Float64Array(this.count);
    let base = 0;
    for (const chunk of this.chunks) {
      if (chunk.kind === "range") {
        for (let i = 0; i < chunk.length; i++) {
          result[base + i] = chunk.start + i;
        }
        base += chunk.length;
      } else {
        result.set(chunk.handles, base);
        base += chunk.handles.length;
      }
    }
    return result;
  }

  /** 並びにある、編集した元の行と追加行の内容（スナップショット。内容の配列は書き換えないこと） */
  editedEntries(): [number, readonly string[]][] {
    return [...this.edits];
  }

  /** 並びにあるか（ヘッダー 0 は含まない） */
  has(handle: number): boolean {
    if (handle < 0) {
      return this.negatives.has(handle);
    }
    return this.indexOfHandle(handle) >= 0;
  }

  /** 編集した元の行・追加行の内容（元ファイルの行のままなら undefined） */
  getEdited(handle: number): readonly string[] | undefined {
    return this.edits.get(handle);
  }

  /**
   * op を当て、逆操作を返す。不正な op は RowStoreError を投げ、状態は変えない。
   * webview から受けた op は `LargeOp` の型ガードを通したものだけを渡すこと（内部 op は逆操作専用）。
   */
  apply(op: RowStoreOp): RowStoreOp {
    switch (op.type) {
      case "setRow":
        return this.setRow(op.handle, op.row);
      case "clearRow":
        return this.clearRow(op.handle);
      case "setHeader":
        return this.setHeader(op.header);
      case "clearHeader":
        return this.clearHeader();
      case "insertRows":
        return this.insertRows(op.beforeHandle, op.handles, op.rows);
      case "deleteRows":
        return this.deleteRows(op.handles);
      case "restoreRows":
        return this.restoreRows(op.runs);
    }
  }

  /**
   * 保存用に、ファイル上の並び順で区間を列挙する（ヘッダーを含む）。
   * 呼んだ時点の状態のスナップショット（O(チャンク数 + 編集行数)）を列挙するので、
   * 列挙の途中（非同期の書き出し中）に op を当てても結果は変わらない。
   */
  segments(): Iterable<RowSegment> {
    // チャンクと行の配列はその場で書き換えず置き換えるので、浅いコピーで足りる
    return enumerateSegments(
      this.chunks.slice(),
      new Map(this.edits),
      this.headerOverride,
      this.lineCount
    );
  }

  // ---- op ----

  private setRow(handle: number, row: string[]): RowStoreOp {
    if (!isHandle(handle) || !this.has(handle)) {
      throw new RowStoreError(`setRow: no such row: ${String(handle)}`);
    }
    const previous = this.edits.get(handle);
    this.edits.set(handle, [...row]);
    return previous ? { type: "setRow", handle, row: previous } : { type: "clearRow", handle };
  }

  private clearRow(handle: number): RowStoreOp {
    const previous = this.edits.get(handle);
    if (handle <= 0 || previous === undefined) {
      throw new RowStoreError(`clearRow: not an edited original row: ${String(handle)}`);
    }
    this.edits.delete(handle);
    return { type: "setRow", handle, row: previous };
  }

  private setHeader(header: string[]): RowStoreOp {
    const previous = this.headerOverride;
    this.headerOverride = [...header];
    return previous ? { type: "setHeader", header: previous } : { type: "clearHeader" };
  }

  private clearHeader(): RowStoreOp {
    const previous = this.headerOverride;
    this.headerOverride = undefined;
    return previous ? { type: "setHeader", header: previous } : { type: "clearHeader" };
  }

  private insertRows(beforeHandle: number | null, handles: number[], rows: string[][]): RowStoreOp {
    if (handles.length !== rows.length) {
      throw new RowStoreError("insertRows: handles and rows differ in length");
    }
    const seen = new Set<number>();
    for (const h of handles) {
      if (!isHandle(h) || h > 0 || seen.has(h) || this.negatives.has(h)) {
        throw new RowStoreError(`insertRows: invalid or duplicate handle: ${String(h)}`);
      }
      seen.add(h);
    }
    const index = this.insertionIndex(beforeHandle, "insertRows");
    this.splice(index, 0, [...handles]);
    handles.forEach((h, i) => this.edits.set(h, [...rows[i]]));
    return { type: "deleteRows", handles: [...handles] };
  }

  private deleteRows(handles: number[]): RowStoreOp {
    const seen = new Set<number>();
    const positions: { pos: number; handle: number }[] = [];
    for (const h of handles) {
      const pos = seen.has(h) ? -1 : this.indexOfHandle(h);
      if (pos < 0) {
        throw new RowStoreError(`deleteRows: no such row or duplicate: ${String(h)}`);
      }
      seen.add(h);
      positions.push({ pos, handle: h });
    }
    positions.sort((a, b) => a.pos - b.pos);

    // 表示位置が連続するものを1つの run にまとめる（run の直後の行は削除されない）
    const groups: { start: number; handles: number[] }[] = [];
    for (const { pos, handle } of positions) {
      const last = groups.at(-1);
      if (last && last.start + last.handles.length === pos) {
        last.handles.push(handle);
      } else {
        groups.push({ start: pos, handles: [handle] });
      }
    }
    const runs: RestoreRun[] = groups.map((g) => {
      const end = g.start + g.handles.length;
      return {
        beforeHandle: end < this.count ? this.handleAt(end) : null,
        handles: g.handles,
        rows: g.handles.map((h) => this.edits.get(h) ?? null),
      };
    });
    for (let i = groups.length - 1; i >= 0; i--) {
      this.splice(groups[i].start, groups[i].handles.length, []);
    }
    for (const h of handles) {
      this.edits.delete(h);
    }
    return { type: "restoreRows", runs };
  }

  private restoreRows(runs: RestoreRun[]): RowStoreOp {
    const seen = new Set<number>();
    for (const run of runs) {
      if (run.handles.length !== run.rows.length) {
        throw new RowStoreError("restoreRows: handles and rows differ in length");
      }
      run.handles.forEach((h, i) => {
        if (!isHandle(h) || seen.has(h) || this.has(h) || (h < 0 && run.rows[i] === null)) {
          throw new RowStoreError(`restoreRows: invalid or duplicate handle: ${String(h)}`);
        }
        if (h > this.originalDataRowCount) {
          throw new RowStoreError(`restoreRows: not an original row: ${String(h)}`);
        }
        seen.add(h);
      });
      if (run.beforeHandle !== null && seen.has(run.beforeHandle)) {
        throw new RowStoreError(
          `restoreRows: beforeHandle is being restored: ${String(run.beforeHandle)}`
        );
      }
      this.insertionIndex(run.beforeHandle, "restoreRows");
    }
    const restored: number[] = [];
    for (const run of runs) {
      const index = this.insertionIndex(run.beforeHandle, "restoreRows");
      this.splice(index, 0, [...run.handles]);
      run.handles.forEach((h, i) => {
        const row = run.rows[i];
        if (row !== null) {
          this.edits.set(h, [...row]);
        }
        restored.push(h);
      });
    }
    return { type: "deleteRows", handles: restored };
  }

  private insertionIndex(beforeHandle: number | null, opName: string): number {
    if (beforeHandle === null) {
      return this.count;
    }
    const index = this.indexOfHandle(beforeHandle);
    if (index < 0) {
      throw new RowStoreError(`${opName}: no such beforeHandle: ${String(beforeHandle)}`);
    }
    return index;
  }

  // ---- チャンク操作 ----

  /** 表示位置 index から deleteCount 行を除き、insert を入れる。除いたハンドルを返す */
  private splice(index: number, deleteCount: number, insert: number[]): number[] {
    if (deleteCount === 0 && insert.length === 0) {
      return [];
    }
    const lastTouched = deleteCount > 0 ? index + deleteCount - 1 : index;
    let first = this.chunks.length;
    let last = this.chunks.length - 1;
    let firstBase = this.count;
    let base = 0;
    for (let i = 0; i < this.chunks.length; i++) {
      const len = lengthOf(this.chunks[i]);
      if (first === this.chunks.length && index < base + len) {
        first = i;
        firstBase = base;
      }
      if (lastTouched < base + len) {
        last = i;
        break;
      }
      base += len;
    }
    if (first === this.chunks.length && this.chunks.length > 0) {
      // 末尾への挿入: 最後のチャンクの末尾に付ける
      first = this.chunks.length - 1;
      firstBase = this.count - lengthOf(this.chunks[first]);
    }
    // 隣のチャンクも、小さいリストか範囲なら作り直しに含める（結合して断片化を防ぐ）
    if (first > 0 && this.isMergeable(this.chunks[first - 1])) {
      first--;
      firstBase -= lengthOf(this.chunks[first]);
    }
    if (last + 1 < this.chunks.length && this.isMergeable(this.chunks[last + 1])) {
      last++;
    }

    const windowChunks = this.chunks.slice(first, Math.max(first, last + 1));
    const local = index - firstBase;
    const before: Piece[] = [];
    const removed: number[] = [];
    const after: Piece[] = [];
    let offset = 0;
    for (const chunk of windowChunks) {
      const len = lengthOf(chunk);
      const piece: Piece =
        chunk.kind === "range" ? chunk : { kind: "list", handles: chunk.handles };
      const [head, rest] = splitPiece(piece, local - offset);
      if (head) {
        before.push(head);
      }
      if (rest) {
        const restOffset = Math.max(offset, local);
        const [mid, tail] = splitPiece(rest, local + deleteCount - restOffset);
        if (mid) {
          pushHandles(removed, mid);
        }
        if (tail) {
          after.push(tail);
        }
      }
      offset += len;
    }
    const pieces: Piece[] = [...before];
    if (insert.length > 0) {
      pieces.push({ kind: "list", handles: insert });
    }
    pieces.push(...after);
    const rebuilt = this.rebuild(pieces);

    for (const h of removed) {
      if (h < 0) {
        this.negatives.delete(h);
      }
    }
    for (const chunk of rebuilt) {
      if (chunk.kind === "list") {
        for (const h of chunk.handles) {
          if (h < 0) {
            this.negatives.set(h, chunk);
          }
        }
      }
    }
    this.chunks.splice(first, windowChunks.length, ...rebuilt);
    this.count += insert.length - removed.length;
    return removed;
  }

  private isMergeable(chunk: Chunk): boolean {
    return chunk.kind === "range" || chunk.handles.length < this.chunkSize / 2;
  }

  /**
   * piece の列をチャンクに作り直す。連続する元の行は範囲にまとめ、chunkSize 以上の範囲は範囲のまま、
   * それ以外はハンドル配列（chunkSize 以下に均等に分割）にする。
   */
  private rebuild(pieces: Piece[]): Chunk[] {
    const out: Chunk[] = [];
    let buffer: number[] = [];
    let rangeStart = 0;
    let rangeLength = 0;

    const flushBuffer = () => {
      if (buffer.length === 0) {
        return;
      }
      const parts = Math.ceil(buffer.length / this.chunkSize);
      const size = Math.ceil(buffer.length / parts);
      for (let i = 0; i < buffer.length; i += size) {
        out.push(makeList(buffer.slice(i, i + size)));
      }
      buffer = [];
    };
    const flushRange = () => {
      if (rangeLength === 0) {
        return;
      }
      if (rangeLength >= this.chunkSize) {
        flushBuffer();
        out.push({ kind: "range", start: rangeStart, length: rangeLength });
      } else {
        for (let i = 0; i < rangeLength; i++) {
          buffer.push(rangeStart + i);
        }
      }
      rangeLength = 0;
    };
    const addRange = (start: number, length: number) => {
      if (rangeLength > 0 && rangeStart + rangeLength === start) {
        rangeLength += length;
        return;
      }
      flushRange();
      rangeStart = start;
      rangeLength = length;
    };

    for (const piece of pieces) {
      if (piece.kind === "range") {
        addRange(piece.start, piece.length);
        continue;
      }
      for (const h of piece.handles) {
        if (h > 0) {
          addRange(h, 1);
        } else {
          flushRange();
          buffer.push(h);
        }
      }
    }
    flushRange();
    flushBuffer();
    return out;
  }
}

function* enumerateSegments(
  chunks: readonly Chunk[],
  edits: ReadonlyMap<number, readonly string[]>,
  header: readonly string[] | undefined,
  lineCount: number
): Generator<RowSegment> {
  let runStart = -1;
  let runEnd = -1;
  if (header !== undefined) {
    yield { kind: "row", handle: 0, row: header };
  } else if (lineCount > 0) {
    runStart = 0;
    runEnd = 1;
  }
  for (const chunk of chunks) {
    if (chunk.kind === "range" && edits.size === 0) {
      if (runEnd !== chunk.start) {
        if (runStart >= 0) {
          yield { kind: "original", start: runStart, end: runEnd };
        }
        runStart = chunk.start;
      }
      runEnd = chunk.start + chunk.length;
      continue;
    }
    const len = lengthOf(chunk);
    for (let i = 0; i < len; i++) {
      const handle = chunk.kind === "range" ? chunk.start + i : chunk.handles[i];
      const edited = edits.get(handle);
      if (edited === undefined) {
        if (runEnd !== handle) {
          if (runStart >= 0) {
            yield { kind: "original", start: runStart, end: runEnd };
          }
          runStart = handle;
        }
        runEnd = handle + 1;
      } else {
        if (runStart >= 0) {
          yield { kind: "original", start: runStart, end: runEnd };
          runStart = -1;
          runEnd = -1;
        }
        yield { kind: "row", handle, row: edited };
      }
    }
  }
  if (runStart >= 0) {
    yield { kind: "original", start: runStart, end: runEnd };
  }
}
