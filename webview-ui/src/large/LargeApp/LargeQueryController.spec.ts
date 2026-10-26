import type { LargeMessageToExtension } from "@message/largeMessages";
import { FILTER_DEBOUNCE_MS, LargeQueryController } from "./LargeQueryController";

function setup() {
  const posted: LargeMessageToExtension[] = [];
  const controller = new LargeQueryController((message) => posted.push(message));
  const progress = (kind: "sort" | "filter" | "search", jobId: number, ratio: number) =>
    controller.handleMessage({ type: "large/progress", kind, jobId, ratio });
  const found = (jobId: number, row: number, col: number) =>
    controller.handleMessage({ type: "large/searchResult", jobId, match: { row, col } });
  const ofType = <T extends LargeMessageToExtension["type"]>(type: T) =>
    posted.filter((m): m is Extract<LargeMessageToExtension, { type: T }> => m.type === type);
  return { controller, posted, progress, found, ofType };
}

const CTX = { rowCount: 1000, selectedRow: null };

describe("LargeQueryController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("ソート", () => {
    test("列を指定すると jobId つきで昇順の large/sort を送り、実行中のジョブになる", () => {
      const { controller, posted } = setup();
      controller.toggleSort(2);
      expect(posted).toEqual([{ type: "large/sort", jobId: 1, column: 2, direction: "asc" }]);
      const snapshot = controller.getSnapshot();
      expect(snapshot.sort).toEqual({ column: 2, direction: "asc" });
      expect(snapshot.job).toEqual({ jobId: 1, kind: "sort", ratio: 0 });
    });

    test("進捗で割合が更新され、完了（ratio 1）でジョブが終わり再適用の注記が出る", () => {
      const { controller, progress } = setup();
      controller.toggleSort(0);
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
      progress("sort", 1, 0.4);
      expect(controller.getSnapshot().job?.ratio).toBe(0.4);
      progress("sort", 1, 1);
      expect(controller.getSnapshot().job).toBeNull();
      expect(controller.getSnapshot().snapshotNotice).toBe(true);
    });

    test("昇順 → 降順 → 解除 の順に要求し、解除では direction が null になる", () => {
      const { controller, progress, ofType } = setup();
      controller.toggleSort(1);
      progress("sort", 1, 1);
      controller.toggleSort(1);
      progress("sort", 2, 1);
      controller.toggleSort(1);
      expect(ofType("large/sort").map((m) => [m.jobId, m.column, m.direction])).toEqual([
        [1, 1, "asc"],
        [2, 1, "desc"],
        [3, 1, null],
      ]);
      progress("sort", 3, 1);
      expect(controller.getSnapshot().sort).toBeNull();
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
    });

    test("実行中に同じ種類のジョブを要求すると置き換える（古い進捗は無視する）", () => {
      const { controller, progress, ofType } = setup();
      controller.toggleSort(0);
      controller.toggleSort(0);
      expect(ofType("large/sort").map((m) => [m.jobId, m.direction])).toEqual([
        [1, "asc"],
        [2, "desc"],
      ]);
      progress("sort", 1, 1);
      expect(controller.getSnapshot().job?.jobId).toBe(2);
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
    });

    test("古い jobId の進捗・完了は無視する", () => {
      const { controller, progress } = setup();
      controller.toggleSort(0);
      progress("sort", 99, 0.9);
      expect(controller.getSnapshot().job?.ratio).toBe(0);
      progress("sort", 99, 1);
      expect(controller.getSnapshot().job).not.toBeNull();
    });

    test("jobId の無い進捗は無視する", () => {
      const { controller } = setup();
      controller.toggleSort(0);
      controller.handleMessage({ type: "large/progress", kind: "sort", ratio: 1 });
      expect(controller.getSnapshot().job).not.toBeNull();
    });

    test("kind が違う進捗は同じ jobId でも無視する", () => {
      const { controller, progress } = setup();
      controller.toggleSort(0);
      progress("filter", 1, 1);
      expect(controller.getSnapshot().job).not.toBeNull();
    });

    test("index の進捗は扱わない", () => {
      const { controller } = setup();
      controller.toggleSort(0);
      controller.handleMessage({ type: "large/progress", kind: "index", ratio: 1, jobId: 1 });
      expect(controller.getSnapshot().job).not.toBeNull();
    });
  });

  describe("フィルタ", () => {
    test("入力はデバウンスしてから large/filter を送る（途中の入力はまとめる）", () => {
      const { controller, ofType } = setup();
      controller.setFilterText(1, "a");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1);
      controller.setFilterText(1, "ab");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1);
      expect(ofType("large/filter")).toEqual([]);
      expect(controller.getSnapshot().filterTexts[1]).toBe("ab");
      vi.advanceTimersByTime(1);
      expect(ofType("large/filter")).toEqual([
        { type: "large/filter", jobId: 1, filters: [{ column: 1, text: "ab" }] },
      ]);
      expect(controller.getSnapshot().job?.kind).toBe("filter");
    });

    test("複数の列の入力は1つの large/filter にまとめる", () => {
      const { controller, ofType } = setup();
      controller.setFilterText(0, "x");
      controller.setFilterText(2, "y");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(ofType("large/filter")[0].filters).toEqual([
        { column: 0, text: "x" },
        { column: 2, text: "y" },
      ]);
    });

    test("適用済みの条件をすべて消すと空配列（解除）を送る", () => {
      const { controller, progress, ofType } = setup();
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      progress("filter", 1, 1);
      expect(controller.getSnapshot().snapshotNotice).toBe(true);
      controller.setFilterText(0, "");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(ofType("large/filter")[1]).toEqual({ type: "large/filter", jobId: 2, filters: [] });
      progress("filter", 2, 1);
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
    });

    test("条件が変わらなければ送らない", () => {
      const { controller, ofType } = setup();
      controller.setFilterText(0, "x");
      controller.setFilterText(0, "");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(ofType("large/filter")).toEqual([]);
    });
  });

  describe("ソートとフィルタの両立", () => {
    test("フィルタの実行中のソートは、フィルタが終わってから送る（先のジョブを取り消さない）", () => {
      const { controller, progress, posted } = setup();
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      controller.toggleSort(1);
      expect(posted.map((m) => m.type)).toEqual(["large/filter"]);
      expect(controller.getSnapshot().sort).toEqual({ column: 1, direction: "asc" });
      progress("filter", 1, 1);
      expect(posted.map((m) => m.type)).toEqual(["large/filter", "large/sort"]);
      expect(controller.getSnapshot().job).toEqual({ jobId: 2, kind: "sort", ratio: 0 });
    });

    test("ソートの実行中のフィルタも、ソートが終わってから送る", () => {
      const { controller, progress, posted } = setup();
      controller.toggleSort(1);
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(posted.map((m) => m.type)).toEqual(["large/sort"]);
      progress("sort", 1, 1);
      expect(posted.map((m) => m.type)).toEqual(["large/sort", "large/filter"]);
    });
  });

  describe("キャンセル", () => {
    test("実行中のジョブを large/cancel で取り消し、ソートの表示を適用済みに戻す", () => {
      const { controller, ofType } = setup();
      controller.toggleSort(1);
      controller.cancel();
      expect(ofType("large/cancel")).toEqual([{ type: "large/cancel", jobId: 1 }]);
      expect(controller.getSnapshot().job).toBeNull();
      expect(controller.getSnapshot().sort).toBeNull();
    });

    test("適用済みのソートがあるときは、そのソートの表示に戻る", () => {
      const { controller, progress } = setup();
      controller.toggleSort(1);
      progress("sort", 1, 1);
      controller.toggleSort(1);
      expect(controller.getSnapshot().sort?.direction).toBe("desc");
      controller.cancel();
      expect(controller.getSnapshot().sort).toEqual({ column: 1, direction: "asc" });
    });

    test("フィルタの入力欄も適用済みの内容に戻し、待たせていた要求は捨てる", () => {
      const { controller, posted } = setup();
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      controller.toggleSort(2);
      controller.cancel();
      expect(controller.getSnapshot().filterTexts.filter(Boolean)).toEqual([]);
      expect(controller.getSnapshot().sort).toBeNull();
      expect(posted.map((m) => m.type)).toEqual(["large/filter", "large/cancel"]);
    });

    test("取り消したジョブの進捗・完了は無視する", () => {
      const { controller, progress } = setup();
      controller.toggleSort(1);
      controller.cancel();
      progress("sort", 1, 1);
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
    });

    test("ジョブが無ければ何も送らない", () => {
      const { controller, posted } = setup();
      controller.cancel();
      expect(posted).toEqual([]);
    });

    test("reqId の無い large/error（保存前の取り消しなど）でジョブを終わらせ、表示を戻す", () => {
      const { controller } = setup();
      controller.toggleSort(1);
      controller.handleMessage({ type: "large/error", message: "保存のため取り消しました" });
      expect(controller.getSnapshot().job).toBeNull();
      expect(controller.getSnapshot().sort).toBeNull();
    });

    test("reqId つきの large/error（行取得の失敗）はジョブに影響しない", () => {
      const { controller } = setup();
      controller.toggleSort(1);
      controller.handleMessage({ type: "large/error", message: "失敗", reqId: 3 });
      expect(controller.getSnapshot().job).not.toBeNull();
    });
  });

  describe("再適用", () => {
    test("適用済みのソートを同じ条件で送り直す", () => {
      const { controller, progress, ofType } = setup();
      controller.toggleSort(3);
      progress("sort", 1, 1);
      controller.reapply();
      expect(ofType("large/sort")[1]).toEqual({
        type: "large/sort",
        jobId: 2,
        column: 3,
        direction: "asc",
      });
    });

    test("ソートとフィルタの両方があるときは、フィルタ → ソートの順に1つずつ送る", () => {
      const { controller, progress, posted } = setup();
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      progress("filter", 1, 1);
      controller.toggleSort(1);
      progress("sort", 2, 1);
      posted.length = 0;
      controller.reapply();
      expect(posted.map((m) => m.type)).toEqual(["large/filter"]);
      progress("filter", 3, 1);
      expect(posted.map((m) => m.type)).toEqual(["large/filter", "large/sort"]);
    });

    test("適用済みの条件が無ければ何も送らない", () => {
      const { controller, posted } = setup();
      controller.reapply();
      expect(posted).toEqual([]);
    });
  });

  describe("検索", () => {
    test("選択セルの行を from にして large/search を送る", () => {
      const { controller, ofType } = setup();
      controller.submitSearch("abc", { rowCount: 1000, selectedRow: 40 });
      expect(ofType("large/search")).toEqual([
        { type: "large/search", jobId: 1, query: "abc", from: 40, direction: "forward" },
      ]);
      expect(controller.getSnapshot().searchStatus).toBe("searching");
      expect(controller.getSnapshot().job?.kind).toBe("search");
    });

    test("一致が返ると、その位置へ移動する要求（jump）を出す", () => {
      const { controller, found } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      const snapshot = controller.getSnapshot();
      expect(snapshot.searchStatus).toBe("found");
      expect(snapshot.match).toEqual({ row: 7, col: 2 });
      expect(snapshot.jump).toMatchObject({ row: 7, col: 2 });
      expect(snapshot.job).toBeNull();
    });

    test("同じ位置に続けて一致しても、jump の seq が増えて再度移動できる", () => {
      const { controller, found } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      const first = controller.getSnapshot().jump?.seq;
      controller.continueSearch("forward", { rowCount: 1000, selectedRow: 7 });
      found(2, 7, 2);
      expect(controller.getSnapshot().jump?.seq).toBeGreaterThan(first ?? 0);
    });

    test("一致が無ければ見つからない状態になり、移動しない", () => {
      const { controller } = setup();
      controller.submitSearch("abc", CTX);
      controller.handleMessage({ type: "large/searchResult", jobId: 1, match: null });
      expect(controller.getSnapshot().searchStatus).toBe("notFound");
      expect(controller.getSnapshot().jump).toBeNull();
    });

    test("古い jobId の結果は無視する", () => {
      const { controller, found } = setup();
      controller.submitSearch("abc", CTX);
      controller.submitSearch("abcd", CTX);
      found(1, 3, 0);
      expect(controller.getSnapshot().jump).toBeNull();
      expect(controller.getSnapshot().searchStatus).toBe("searching");
    });

    test("続きの検索は、直前の一致のセル（行・列）をそのまま送る", () => {
      const { controller, found, ofType } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      controller.continueSearch("forward", { rowCount: 1000, selectedRow: 7 });
      found(2, 9, 0);
      controller.continueSearch("backward", { rowCount: 1000, selectedRow: 9 });
      expect(ofType("large/search").map((m) => [m.query, m.from, m.fromCol, m.direction])).toEqual([
        ["abc", 0, undefined, "forward"],
        ["abc", 7, 2, "forward"],
        ["abc", 9, 0, "backward"],
      ]);
    });

    test("検索語が前回と同じで一致している状態の Enter は続きの検索になる", () => {
      const { controller, found, ofType } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      controller.submitSearch("abc", { rowCount: 1000, selectedRow: 7 });
      expect(ofType("large/search")[1]).toMatchObject({ from: 7, fromCol: 2 });
    });

    test("検索の結果を待っている間の前へ/次へも、直前の一致を基準にする", () => {
      const { controller, found, ofType } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      controller.continueSearch("forward", { rowCount: 1000, selectedRow: 7 });
      controller.continueSearch("backward", { rowCount: 1000, selectedRow: 7 });
      expect(ofType("large/search").map((m) => [m.from, m.fromCol, m.direction])).toEqual([
        [0, undefined, "forward"],
        [7, 2, "forward"],
        [7, 2, "backward"],
      ]);
    });

    test("見つからなかった後は、選択中の行から新しく探す", () => {
      const { controller, ofType } = setup();
      controller.submitSearch("abc", CTX);
      controller.handleMessage({ type: "large/searchResult", jobId: 1, match: null });
      controller.submitSearch("abc", { rowCount: 1000, selectedRow: 30 });
      expect(ofType("large/search")[1].from).toBe(30);
    });

    test("検索語を変えると、選択中の行から新しく探す", () => {
      const { controller, found, ofType } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      controller.submitSearch("xyz", { rowCount: 1000, selectedRow: 7 });
      expect(ofType("large/search")[1]).toMatchObject({ query: "xyz", from: 7 });
    });

    test("検索語が空なら送らない。まだ検索していなければ続きの検索も送らない", () => {
      const { controller, posted } = setup();
      controller.submitSearch("", CTX);
      controller.continueSearch("forward", CTX);
      expect(posted).toEqual([]);
    });

    test("行が無ければ送らない", () => {
      const { controller, posted } = setup();
      controller.submitSearch("a", { rowCount: 0, selectedRow: null });
      expect(posted).toEqual([]);
    });

    test("ソート・フィルタの実行中は検索を送らない（先のジョブを取り消さない）", () => {
      const { controller, ofType } = setup();
      controller.toggleSort(0);
      controller.submitSearch("abc", CTX);
      expect(ofType("large/search")).toEqual([]);
      expect(controller.getSnapshot().job?.kind).toBe("sort");
    });

    test("検索の実行中にソートを要求すると、検索は破棄される", () => {
      const { controller, found } = setup();
      controller.submitSearch("abc", CTX);
      controller.toggleSort(0);
      expect(controller.getSnapshot().job?.kind).toBe("sort");
      expect(controller.getSnapshot().searchStatus).toBe("idle");
      found(1, 1, 1);
      expect(controller.getSnapshot().jump).toBeNull();
    });

    test("検索のキャンセルで検索の状態が戻る", () => {
      const { controller } = setup();
      controller.submitSearch("abc", CTX);
      controller.cancel();
      expect(controller.getSnapshot().searchStatus).toBe("idle");
    });

    test("ソート・フィルタが完了すると、行の位置が変わるので一致の記憶を捨てる", () => {
      const { controller, progress, found, ofType } = setup();
      controller.submitSearch("abc", CTX);
      found(1, 7, 2);
      controller.toggleSort(0);
      progress("sort", 2, 1);
      expect(controller.getSnapshot().match).toBeNull();
      expect(controller.getSnapshot().searchStatus).toBe("idle");
      controller.submitSearch("abc", { rowCount: 1000, selectedRow: 5 });
      expect(ofType("large/search")[1].from).toBe(5);
    });
  });

  describe("無効化と初期化", () => {
    test("無効な間（インデックス作成中）は何も要求しない", () => {
      const { controller, posted } = setup();
      controller.setEnabled(false);
      controller.toggleSort(0);
      controller.setFilterText(0, "x");
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      controller.submitSearch("a", CTX);
      expect(posted).toEqual([]);
    });

    test("reset で状態を初期に戻し、入力待ちのフィルタも捨てる", () => {
      const { controller, posted, progress } = setup();
      controller.toggleSort(0);
      progress("sort", 1, 1);
      controller.setFilterText(1, "x");
      controller.reset();
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(posted.map((m) => m.type)).toEqual(["large/sort"]);
      expect(controller.getSnapshot()).toMatchObject({
        sort: null,
        job: null,
        snapshotNotice: false,
        searchStatus: "idle",
        match: null,
        jump: null,
      });
      expect(controller.getSnapshot().filterTexts.filter(Boolean)).toEqual([]);
    });

    test("dispose すると入力待ちのフィルタを送らない", () => {
      const { controller, posted } = setup();
      controller.setFilterText(0, "x");
      controller.dispose();
      vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
      expect(posted).toEqual([]);
    });
  });

  describe("拡張機能が持つ条件との同期", () => {
    test("古いジョブの jobId つき large/error は実行中のジョブに影響しない", () => {
      const { controller } = setup();
      controller.toggleSort(1);
      controller.handleMessage({ type: "large/error", message: "取り消し", jobId: 99 });
      expect(controller.getSnapshot().job).not.toBeNull();
    });

    test("実行中のジョブの jobId つき large/error はそのジョブを終わらせ、表示を戻す", () => {
      const { controller } = setup();
      controller.toggleSort(1);
      controller.handleMessage({ type: "large/error", message: "取り消し", jobId: 1 });
      expect(controller.getSnapshot().job).toBeNull();
      expect(controller.getSnapshot().sort).toBeNull();
    });

    test("large/invalidate の query で適用済みの条件・表示・注記を合わせる", () => {
      const { controller } = setup();
      controller.handleMessage({
        type: "large/invalidate",
        revision: 1,
        rowCount: 10,
        query: { sort: { column: 2, direction: "desc" }, filters: [{ column: 1, text: "a" }] },
      });
      const snapshot = controller.getSnapshot();
      expect(snapshot.sort).toEqual({ column: 2, direction: "desc" });
      expect(snapshot.filterTexts[1]).toBe("a");
      expect(snapshot.snapshotNotice).toBe(true);
    });

    test("query が空なら条件を解除する（revert など）。query が無い invalidate は何も変えない", () => {
      const { controller, progress } = setup();
      controller.toggleSort(1);
      progress("sort", 1, 1);
      controller.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 10 });
      expect(controller.getSnapshot().snapshotNotice).toBe(true);
      controller.handleMessage({
        type: "large/invalidate",
        revision: 2,
        rowCount: 10,
        query: { sort: null, filters: [] },
      });
      expect(controller.getSnapshot().sort).toBeNull();
      expect(controller.getSnapshot().snapshotNotice).toBe(false);
    });

    test("ジョブの実行中の query は適用済みだけを更新し、実行中のジョブの表示は変えない", () => {
      const { controller } = setup();
      controller.toggleSort(1);
      controller.handleMessage({
        type: "large/invalidate",
        revision: 1,
        rowCount: 10,
        query: { sort: null, filters: [{ column: 0, text: "x" }] },
      });
      expect(controller.getSnapshot().sort).toEqual({ column: 1, direction: "asc" });
      expect(controller.getSnapshot().job).not.toBeNull();
      expect(controller.getSnapshot().snapshotNotice).toBe(true);
    });

    test("reset に query を渡すと、その条件が適用済みの状態から始まる", () => {
      const { controller, ofType } = setup();
      controller.reset({ sort: { column: 1, direction: "asc" }, filters: [] });
      expect(controller.getSnapshot().sort).toEqual({ column: 1, direction: "asc" });
      expect(controller.getSnapshot().snapshotNotice).toBe(true);
      controller.reapply();
      expect(ofType("large/sort")).toHaveLength(1);
    });
  });

  describe("購読", () => {
    test("状態が変わると通知し、変わらない間は同じスナップショットを返す", () => {
      const { controller } = setup();
      const listener = vi.fn();
      const unsubscribe = controller.subscribe(listener);
      const before = controller.getSnapshot();
      expect(controller.getSnapshot()).toBe(before);
      controller.toggleSort(0);
      expect(listener).toHaveBeenCalled();
      expect(controller.getSnapshot()).not.toBe(before);
      unsubscribe();
      listener.mockClear();
      controller.cancel();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
