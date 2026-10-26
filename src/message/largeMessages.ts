/**
 * 大容量モード（`csv-editor.largeEditor`）専用のメッセージ。
 * 通常モードのメッセージ（messageTypeToExtension / messageTypeToWebview）とは type の接頭辞 `large/` で区別する。
 * 大容量モードは別 viewType・別 provider のため、通常モードの init/update は変更しない。
 * webview の App は最初に届くメッセージが `large/init` か `update` かで通常/大容量に分岐する。
 */

/** 1回の getRows で要求できる最大行数 */
export const MAX_ROWS_PER_REQUEST = 5000;

/** getRange（コピー用）で扱える最大セル数 */
export const MAX_RANGE_CELLS = 100_000;

/**
 * 編集操作。行は表示順の位置ではなくハンドルで指定する。
 * ハンドル: 0 以上＝元ファイルの行番号、負＝追加行（webview が採番）。
 * 2-2 で使う。
 */
export type LargeOp =
  | { type: "setRow"; handle: number; row: string[] }
  /** beforeHandle の行の直前に挿入。null は末尾。handles は追加行の負のハンドル（rows と同数） */
  | { type: "insertRows"; beforeHandle: number | null; handles: number[]; rows: string[][] }
  | { type: "deleteRows"; handles: number[] }
  | { type: "setHeader"; header: string[] };

/** コピー範囲（行は表示順の位置、end は排他）。セル数は MAX_RANGE_CELLS まで */
export interface LargeRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/** ソート条件。direction が null ならソート解除（2-3 で拡張する可能性あり） */
export type LargeSortDirection = "asc" | "desc" | null;

/** フィルタ条件（列ごとの部分一致。2-3 で拡張する可能性あり） */
export interface LargeFilterCondition {
  column: number;
  text: string;
}

export type LargeSearchDirection = "forward" | "backward";

export type LargeProgressKind = "index" | "sort" | "filter" | "search";

// ---- webview → 拡張機能 ----

export type LargeMessageToExtension =
  | { type: "large/ready" }
  | { type: "large/getRows"; reqId: number; start: number; count: number }
  | { type: "large/applyOps"; ops: LargeOp[] }
  | { type: "large/sort"; jobId: number; column: number; direction: LargeSortDirection }
  | { type: "large/filter"; jobId: number; filters: LargeFilterCondition[] }
  /** from: 検索開始位置（表示順の行位置） */
  | {
      type: "large/search";
      jobId: number;
      query: string;
      from: number;
      direction: LargeSearchDirection;
    }
  | { type: "large/cancel"; jobId: number }
  | { type: "large/getRange"; reqId: number; range: LargeRange };

// ---- 拡張機能 → webview ----

export type LargeMessageToWebview =
  | {
      type: "large/init";
      header: string[];
      rowCount: number;
      indexing: boolean;
      encoding: string;
      /** 制限している機能の表示名一覧 */
      restrictions: string[];
    }
  | { type: "large/rows"; reqId: number; start: number; rows: string[][]; handles: number[] }
  | { type: "large/progress"; kind: LargeProgressKind; ratio: number; jobId?: number }
  /**
   * 行のキャッシュを捨てさせる（インデックス作成中の行数の増加、編集の適用、Undo/Redo の後）。
   * header はヘッダーが変わったかもしれないとき（setHeader の適用・Undo/Redo）に載せる。省略は「変わっていない」
   */
  | { type: "large/invalidate"; revision: number; rowCount: number; header?: string[] }
  | { type: "large/searchResult"; jobId: number; match: { row: number; col: number } | null }
  | { type: "large/range"; reqId: number; rows: string[][] }
  | { type: "large/error"; message: string; reqId?: number };

// ---- 型ガード ----

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 有限な 0 以上の整数 */
const isNonNegInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** 有限な整数（負のハンドルを許す） */
const isInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((cell) => typeof cell === "string");

const isRows = (value: unknown): value is string[][] =>
  Array.isArray(value) && value.every(isStringArray);

const isIntArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isInt);

function isLargeOp(value: unknown): value is LargeOp {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "setRow":
      return isInt(value.handle) && isStringArray(value.row);
    case "insertRows":
      return (
        (value.beforeHandle === null || isInt(value.beforeHandle)) &&
        isIntArray(value.handles) &&
        value.handles.every((h) => h < 0) &&
        isRows(value.rows) &&
        value.handles.length === value.rows.length
      );
    case "deleteRows":
      return isIntArray(value.handles);
    case "setHeader":
      return isStringArray(value.header);
    default:
      return false;
  }
}

function isLargeRange(value: unknown): value is LargeRange {
  if (!isRecord(value)) {
    return false;
  }
  const { startRow, endRow, startCol, endCol } = value;
  return (
    isNonNegInt(startRow) &&
    isNonNegInt(endRow) &&
    isNonNegInt(startCol) &&
    isNonNegInt(endCol) &&
    startRow <= endRow &&
    startCol <= endCol &&
    (endRow - startRow) * (endCol - startCol) <= MAX_RANGE_CELLS
  );
}

function isFilterCondition(value: unknown): value is LargeFilterCondition {
  return isRecord(value) && isNonNegInt(value.column) && typeof value.text === "string";
}

/**
 * webview から受信した値が大容量モードの拡張機能向けメッセージとして妥当かを検証する型ガード。
 * webview は信頼境界の外側のため、数値は有限な 0 以上の整数、getRows の count は
 * 1..MAX_ROWS_PER_REQUEST などを実行時に確認する。
 */
export function isLargeMessageToExtension(value: unknown): value is LargeMessageToExtension {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "large/ready":
      return true;
    case "large/getRows":
      return (
        isNonNegInt(value.reqId) &&
        isNonNegInt(value.start) &&
        isNonNegInt(value.count) &&
        value.count >= 1 &&
        value.count <= MAX_ROWS_PER_REQUEST
      );
    case "large/applyOps":
      return Array.isArray(value.ops) && value.ops.every(isLargeOp);
    case "large/sort":
      return (
        isNonNegInt(value.jobId) &&
        isNonNegInt(value.column) &&
        (value.direction === "asc" || value.direction === "desc" || value.direction === null)
      );
    case "large/filter":
      return (
        isNonNegInt(value.jobId) &&
        Array.isArray(value.filters) &&
        value.filters.every(isFilterCondition)
      );
    case "large/search":
      return (
        isNonNegInt(value.jobId) &&
        typeof value.query === "string" &&
        isNonNegInt(value.from) &&
        (value.direction === "forward" || value.direction === "backward")
      );
    case "large/cancel":
      return isNonNegInt(value.jobId);
    case "large/getRange":
      return isNonNegInt(value.reqId) && isLargeRange(value.range);
    default:
      return false;
  }
}

const PROGRESS_KINDS: readonly unknown[] = ["index", "sort", "filter", "search"];

/** 拡張機能から受信した値が大容量モードの webview 向けメッセージとして妥当かを検証する型ガード */
export function isLargeMessageToWebview(value: unknown): value is LargeMessageToWebview {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case "large/init":
      return (
        isStringArray(value.header) &&
        isNonNegInt(value.rowCount) &&
        typeof value.indexing === "boolean" &&
        typeof value.encoding === "string" &&
        isStringArray(value.restrictions)
      );
    case "large/rows":
      return (
        isNonNegInt(value.reqId) &&
        isNonNegInt(value.start) &&
        isRows(value.rows) &&
        isIntArray(value.handles) &&
        value.handles.length === value.rows.length
      );
    case "large/progress":
      return (
        PROGRESS_KINDS.includes(value.kind) &&
        typeof value.ratio === "number" &&
        value.ratio >= 0 &&
        value.ratio <= 1 &&
        (value.jobId === undefined || isNonNegInt(value.jobId))
      );
    case "large/invalidate":
      return (
        isNonNegInt(value.revision) &&
        isNonNegInt(value.rowCount) &&
        (value.header === undefined || isStringArray(value.header))
      );
    case "large/searchResult":
      return (
        isNonNegInt(value.jobId) &&
        (value.match === null ||
          (isRecord(value.match) && isNonNegInt(value.match.row) && isNonNegInt(value.match.col)))
      );
    case "large/range":
      return isNonNegInt(value.reqId) && isRows(value.rows);
    case "large/error":
      return (
        typeof value.message === "string" && (value.reqId === undefined || isNonNegInt(value.reqId))
      );
    default:
      return false;
  }
}
