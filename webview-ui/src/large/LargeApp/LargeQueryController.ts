import type {
  LargeFilterCondition,
  LargeMessageToExtension,
  LargeMessageToWebview,
  LargeSearchDirection,
} from "@message/largeMessages";
import { searchFrom, toFilterConditions, nextSort, type SortState } from "./largeQuery";

/** フィルタ入力から `large/filter` を送るまでの待ち時間（入力のたびに全体走査しないため） */
export const FILTER_DEBOUNCE_MS = 300;

export type JobKind = "sort" | "filter" | "search";
export type SearchStatus = "idle" | "searching" | "found" | "notFound";

export interface QueryJob {
  jobId: number;
  kind: JobKind;
  /** 0〜1 */
  ratio: number;
}

/** 一致したセルへ選択とスクロールを移す要求。seq が変わるたびに表が移動する */
export interface JumpRequest {
  row: number;
  col: number;
  seq: number;
}

export interface QuerySnapshot {
  /** 表示するソート条件（要求中なら要求した条件。キャンセルで適用済みに戻る） */
  sort: SortState | null;
  /** 列ごとのフィルタ入力（列番号で引く。未入力の列は空文字・未定義） */
  filterTexts: readonly string[];
  /** 実行中のジョブ（同時に1つ。拡張機能は新しいジョブで前のジョブを取り消す） */
  job: QueryJob | null;
  /** ソートまたはフィルタが適用中か（編集しても並べ直さない注記と再適用の表示に使う） */
  snapshotNotice: boolean;
  searchStatus: SearchStatus;
  /** 直前の検索の一致位置（表示順） */
  match: { row: number; col: number } | null;
  jump: JumpRequest | null;
}

export interface SearchContext {
  /** 現在の表示行数 */
  rowCount: number;
  /** 選択中のセルの表示行 */
  selectedRow: number | null;
}

type SortRequest = { kind: "sort"; column: number; direction: "asc" | "desc" | null };
type FilterRequest = { kind: "filter"; filters: LargeFilterCondition[] };
type SearchRequest = {
  kind: "search";
  query: string;
  from: number;
  direction: LargeSearchDirection;
};
type QueryRequest = SortRequest | FilterRequest | SearchRequest;

interface AppliedConditions {
  sort: SortState | null;
  filters: LargeFilterCondition[];
}

const textsOf = (filters: LargeFilterCondition[]): string[] => {
  const texts: string[] = [];
  for (const { column, text } of filters) {
    while (texts.length < column) {
      texts.push("");
    }
    texts[column] = text;
  }
  return texts;
};

const sameConditions = (a: LargeFilterCondition[], b: LargeFilterCondition[]) =>
  a.length === b.length && a.every((x, i) => x.column === b[i].column && x.text === b[i].text);

/**
 * 大容量モードの検索・ソート・フィルタの要求と状態。
 *
 * - jobId はこの controller が単調増加で採番する。拡張機能は同じ文書の新しいジョブで前のジョブを取り消すため、
 *   webview は実行中のジョブを1つだけ持ち、古い jobId の進捗・結果は無視する
 * - 完了は `large/progress { jobId, ratio: 1 }`（ソート・フィルタ）と `large/searchResult`（検索）で判断する。
 *   `large/error`（reqId なし）は実行中のジョブの失敗・取り消しとして扱う
 * - ソートとフィルタは互いのジョブを取り消してしまうため、片方の実行中に他方を要求したら待たせ、終わってから送る。
 *   同じ種類は置き換える。検索中にソート・フィルタを要求したら検索を破棄する。ソート・フィルタ中の検索は送らない
 * - 適用済みの条件（applied）は完了で確定する。キャンセル・失敗では表示（ソートの印・フィルタの入力欄）を適用済みに戻す
 * - 編集しても並べ直さない（スナップショット方式）ので、再適用は適用済みの条件を送り直す
 */
export class LargeQueryController {
  private snapshot: QuerySnapshot = {
    sort: null,
    filterTexts: [],
    job: null,
    snapshotNotice: false,
    searchStatus: "idle",
    match: null,
    jump: null,
  };
  private readonly listeners = new Set<() => void>();

  private enabled = true;
  private nextJobId = 1;
  private nextJumpSeq = 1;
  private jobRequest: QueryRequest | null = null;
  private waiting: { sort?: SortRequest; filter?: FilterRequest } = {};
  private applied: AppliedConditions = { sort: null, filters: [] };
  /** 要求した（適用済みまたは適用中・待機中の）フィルタ条件。入力が変わったか判断する */
  private requestedFilters: LargeFilterCondition[] = [];
  private lastQuery: string | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly post: (message: LargeMessageToExtension) => void) {}

  readonly getSnapshot = (): QuerySnapshot => this.snapshot;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** false の間（インデックス作成中）はソート・フィルタ・検索を要求しない */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** 列ヘッダーのソート操作（昇順 → 降順 → 解除） */
  toggleSort(column: number): void {
    if (!this.enabled) {
      return;
    }
    const next = nextSort(this.snapshot.sort, column);
    // 解除は、解除する列を添えて送る
    const target = next ?? this.snapshot.sort;
    this.update({ sort: next });
    this.dispatch({
      kind: "sort",
      column: target?.column ?? column,
      direction: next?.direction ?? null,
    });
  }

  /** フィルタ入力の変更。入力はすぐ表示に反映し、送信はデバウンスする */
  setFilterText(column: number, text: string): void {
    if (!this.enabled) {
      return;
    }
    const texts = [...this.snapshot.filterTexts];
    while (texts.length <= column) {
      texts.push("");
    }
    texts[column] = text;
    this.update({ filterTexts: texts });
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flushFilter();
    }, FILTER_DEBOUNCE_MS);
  }

  /** 検索語の確定（Enter）。前回と同じ語で一致している最中なら続きの検索になる */
  submitSearch(query: string, context: SearchContext): void {
    if (query === "") {
      return;
    }
    const fresh = query !== this.lastQuery || this.snapshot.match === null;
    this.search(query, "forward", fresh, context);
  }

  /** 前へ/次へ。まだ検索していなければ何もしない */
  continueSearch(direction: LargeSearchDirection, context: SearchContext): void {
    if (this.lastQuery === null) {
      return;
    }
    this.search(this.lastQuery, direction, this.snapshot.match === null, context);
  }

  /** 実行中のジョブを取り消し、表示を適用済みの条件に戻す */
  cancel(): void {
    const job = this.snapshot.job;
    if (!job) {
      return;
    }
    this.post({ type: "large/cancel", jobId: job.jobId });
    this.abandonJob();
  }

  /** 適用済みの条件（フィルタ → ソート）を送り直して、編集後の内容で並べ直す */
  reapply(): void {
    if (!this.enabled) {
      return;
    }
    const { sort, filters } = this.applied;
    if (filters.length > 0) {
      this.dispatch({ kind: "filter", filters });
    }
    if (sort) {
      this.dispatch({ kind: "sort", column: sort.column, direction: sort.direction });
    }
  }

  handleMessage(message: LargeMessageToWebview): void {
    switch (message.type) {
      case "large/progress":
        this.handleProgress(message.kind, message.jobId, message.ratio);
        return;
      case "large/searchResult":
        this.handleSearchResult(message.jobId, message.match);
        return;
      case "large/error":
        // reqId つきは行取得などの失敗。ジョブの失敗・取り消し（保存の前など）だけを扱う
        if (message.reqId === undefined && this.snapshot.job) {
          this.abandonJob();
        }
        return;
      default:
        return;
    }
  }

  /** 開き直し（revert など）で、条件・ジョブ・検索の状態を捨てる。jobId は進め続ける */
  reset(): void {
    this.clearDebounce();
    this.jobRequest = null;
    this.waiting = {};
    this.applied = { sort: null, filters: [] };
    this.requestedFilters = [];
    this.lastQuery = null;
    this.update({
      sort: null,
      filterTexts: [],
      job: null,
      snapshotNotice: false,
      searchStatus: "idle",
      match: null,
      jump: null,
    });
  }

  dispose(): void {
    this.clearDebounce();
    this.listeners.clear();
  }

  private clearDebounce(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private flushFilter(): void {
    if (!this.enabled) {
      return;
    }
    const filters = toFilterConditions(this.snapshot.filterTexts);
    if (sameConditions(filters, this.requestedFilters)) {
      return;
    }
    this.dispatch({ kind: "filter", filters });
  }

  private search(
    query: string,
    direction: LargeSearchDirection,
    fresh: boolean,
    context: SearchContext
  ): void {
    const running = this.snapshot.job;
    if (!this.enabled || (running && running.kind !== "search")) {
      return;
    }
    const from = searchFrom({
      direction,
      rowCount: context.rowCount,
      selectedRow: context.selectedRow,
      lastMatchRow: this.snapshot.match?.row ?? null,
      fresh,
    });
    if (from === null) {
      return;
    }
    this.lastQuery = query;
    this.start({ kind: "search", query, from, direction });
    this.update({ searchStatus: "searching" });
  }

  /** ソート・フィルタの要求を、実行中のジョブとの関係に従って送るか待たせる */
  private dispatch(request: SortRequest | FilterRequest): void {
    if (request.kind === "filter") {
      this.requestedFilters = request.filters;
    }
    const running = this.snapshot.job;
    if (!running || running.kind === "search" || running.kind === request.kind) {
      delete this.waiting[request.kind];
      this.start(request);
      return;
    }
    // 別の種類のジョブの実行中。取り消さないよう、終わってから送る（同じ種類の待機は最新で置き換える）
    if (request.kind === "sort") {
      this.waiting.sort = request;
    } else {
      this.waiting.filter = request;
    }
  }

  private start(request: QueryRequest): void {
    const jobId = this.nextJobId++;
    switch (request.kind) {
      case "sort":
        this.post({
          type: "large/sort",
          jobId,
          column: request.column,
          direction: request.direction,
        });
        break;
      case "filter":
        this.post({ type: "large/filter", jobId, filters: request.filters });
        break;
      case "search":
        this.post({
          type: "large/search",
          jobId,
          query: request.query,
          from: request.from,
          direction: request.direction,
        });
        break;
    }
    this.jobRequest = request;
    this.update({
      job: { jobId, kind: request.kind, ratio: 0 },
      ...(request.kind === "search" ? {} : { searchStatus: "idle" as const }),
    });
  }

  private handleProgress(kind: string, jobId: number | undefined, ratio: number): void {
    const job = this.snapshot.job;
    if (!job || jobId === undefined || job.jobId !== jobId || job.kind !== kind) {
      return;
    }
    if (kind === "search" || ratio < 1) {
      this.update({ job: { ...job, ratio } });
      return;
    }
    this.completeJob();
  }

  /** ソート・フィルタの完了。適用済みの条件を確定し、待たせていた要求を送る */
  private completeJob(): void {
    const request = this.jobRequest;
    if (request?.kind === "sort") {
      this.applied = {
        ...this.applied,
        sort:
          request.direction === null
            ? null
            : { column: request.column, direction: request.direction },
      };
    } else if (request?.kind === "filter") {
      this.applied = { ...this.applied, filters: request.filters };
    }
    this.jobRequest = null;
    this.update({
      job: null,
      // 行の位置が変わったので、一致の記憶は捨てる
      match: null,
      searchStatus: "idle",
      snapshotNotice: this.hasApplied(),
    });
    const next = this.waiting.filter ?? this.waiting.sort;
    if (next) {
      delete this.waiting[next.kind];
      this.start(next);
    }
  }

  private handleSearchResult(jobId: number, match: { row: number; col: number } | null): void {
    const job = this.snapshot.job;
    if (!job || job.kind !== "search" || job.jobId !== jobId) {
      return;
    }
    this.jobRequest = null;
    if (match) {
      this.update({
        job: null,
        searchStatus: "found",
        match,
        jump: { row: match.row, col: match.col, seq: this.nextJumpSeq++ },
      });
    } else {
      this.update({ job: null, searchStatus: "notFound", match: null });
    }
  }

  /** 実行中のジョブをやめ、表示を適用済みの条件に戻す（キャンセル・失敗） */
  private abandonJob(): void {
    this.clearDebounce();
    this.jobRequest = null;
    this.waiting = {};
    this.requestedFilters = this.applied.filters;
    this.update({
      job: null,
      sort: this.applied.sort,
      filterTexts: textsOf(this.applied.filters),
      searchStatus: "idle",
    });
  }

  private hasApplied(): boolean {
    return this.applied.sort !== null || this.applied.filters.length > 0;
  }

  private update(partial: Partial<QuerySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
