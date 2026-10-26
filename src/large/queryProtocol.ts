/**
 * 拡張ホスト（LargeCsvDocument）と検索・ソート・フィルタのワーカー（largeCsvWorker）の間のメッセージ。
 * ワーカーでは vscode を import できないので、素のデータ（パス・文字コード・オフセット表・ハンドル・編集内容）だけを渡す。
 * 型だけを置く（ワーカーのバンドルに vscode を持ち込まないため、このファイルは何も import しない値を持たない）。
 */
import type {
  FilterCondition,
  SearchDirection,
  SortDirection,
  SortKind,
} from "../shared/large/query";

import type { LargeEncoding } from "./largeEncoding";
import type { RowIndexSummary } from "./rowIndex";

/** ワーカーが読むファイル（ジョブを始めた時点のスナップショット） */
export interface QuerySource {
  filePath: string;
  encoding: LargeEncoding;
  /** RowIndex のオフセット表のコピー（summary.rowCount + 1 要素。ワーカーへ転送する） */
  starts: Float64Array;
  summary: RowIndexSummary;
}

/** 走査する行（ジョブを始めた時点のスナップショット） */
export interface QueryRows {
  /** 走査する並び（行のハンドル。ワーカーへ転送する） */
  order: Float64Array;
  /** 並びにある、編集した元の行と追加行の内容（それ以外の行はファイルから読む） */
  edits: [number, readonly string[]][];
}

/** 読み方の調整（テストで小さくして、キャンセル・進捗の境界を通す） */
export interface QueryTuning {
  /** 1回にまとめて読む行数 */
  batchRows?: number;
  /** 進捗を送る最短の間隔 */
  progressIntervalMs?: number;
}

/** 表示順を作る（フィルタ → ソート）。order は RowStore の並び（ファイル上の並び） */
export interface ViewJobRequest {
  kind: "view";
  source: QuerySource;
  rows: QueryRows;
  /** normalizeFilters 済みの条件（空ならフィルタしない） */
  filters: FilterCondition[];
  sort: { column: number; direction: SortDirection } | null;
  tuning?: QueryTuning;
}

/** order（表示順）の中で検索する */
export interface SearchJobRequest {
  kind: "search";
  source: QuerySource;
  rows: QueryRows;
  /** normalizeSearchQuery 済みの検索語 */
  needle: string;
  /** 開始位置（order の位置） */
  from: number;
  fromCol?: number;
  direction: SearchDirection;
  tuning?: QueryTuning;
}

export type QueryJobRequest = ViewJobRequest | SearchJobRequest;

/** ジョブの計測値（性能計測用） */
export interface QueryJobStats {
  /** ファイルを読み終える（ファイルを閉じる）までの時間 */
  readMs: number;
  /** 全体の時間 */
  totalMs: number;
  /** ワーカーの V8 ヒープの使用量の最大（読み終えた時点とソートの後で測る） */
  peakHeapUsed: number;
}

export interface ViewJobResult {
  kind: "view";
  /** 表示順のハンドル（転送される） */
  handles: Float64Array;
  /** ソートに使った比較の種類（ソートしないときは undefined） */
  sortKind?: SortKind;
  stats: QueryJobStats;
}

export interface SearchJobResult {
  kind: "search";
  /** 一致したセル（order の位置と列、その行のハンドル）。無ければ null */
  match: { position: number; col: number; handle: number } | null;
  stats: QueryJobStats;
}

export type QueryJobResult = ViewJobResult | SearchJobResult;

export type ToWorkerMessage =
  | { type: "ping" }
  | { type: "run"; jobId: number; request: QueryJobRequest }
  | { type: "cancel"; jobId: number };

export type FromWorkerMessage =
  | { type: "pong" }
  | { type: "progress"; jobId: number; ratio: number }
  /** ファイルを閉じた（以後のこのジョブはファイルを読まない） */
  | { type: "released"; jobId: number }
  | { type: "done"; jobId: number; result: QueryJobResult }
  /** キャンセルで止めた（ファイルは閉じている） */
  | { type: "cancelled"; jobId: number }
  | { type: "failed"; jobId: number; message: string };
