import type { LargeMessageToExtension } from "@message/largeMessages";
import { RemoteRowSource, ROW_PAGE_SIZE, MAX_CACHED_PAGES } from "./RemoteRowSource";

type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;

const PAGE = 10;

const createSource = (
  options: {
    maxCachedPages?: number;
    prefetchPages?: number;
    pageSize?: number;
    rowCount?: number;
  } = {}
) => {
  const sent: LargeMessageToExtension[] = [];
  const onError = vi.fn();
  const source = new RemoteRowSource({
    postMessage: (message) => sent.push(message),
    header: ["a", "b"],
    rowCount: 100,
    pageSize: PAGE,
    prefetchPages: 0,
    onError,
    ...options,
  });
  const requests = () => sent.filter((m): m is GetRows => m.type === "large/getRows");
  const rowsOf = (start: number, count: number, tag = "v") =>
    Array.from({ length: count }, (_, i) => [`${tag}${start + i}`, "x"]);
  const respond = (request: GetRows, tag = "v") =>
    source.handleMessage({
      type: "large/rows",
      reqId: request.reqId,
      start: request.start,
      rows: rowsOf(request.start, request.count, tag),
      handles: Array.from({ length: request.count }, (_, i) => request.start + i),
    });
  return { source, sent, requests, respond, onError };
};

describe("RemoteRowSource", () => {
  it("既定の定数は500行単位・200ページ", () => {
    expect(ROW_PAGE_SIZE).toBe(500);
    expect(MAX_CACHED_PAGES).toBe(200);
  });

  it("初期状態はヘッダーと行数を持ち、行は未取得", () => {
    const { source } = createSource();
    expect(source.header).toEqual(["a", "b"]);
    expect(source.rowCount).toBe(100);
    expect(source.getRow(0)).toBeUndefined();
    expect(source.getHandle(0)).toBeUndefined();
  });

  it("ensureRange は範囲を含むページ単位で getRows を要求する", () => {
    const { source, requests } = createSource();
    source.ensureRange(12, 18);
    expect(requests()).toHaveLength(1);
    expect(requests()[0]).toMatchObject({ start: 10, count: 10 });
  });

  it("連続する複数ページは1回の要求にまとめる", () => {
    const { source, requests } = createSource();
    source.ensureRange(5, 35);
    expect(requests()).toHaveLength(1);
    expect(requests()[0]).toMatchObject({ start: 0, count: 40 });
  });

  it("1回の要求は MAX_ROWS_PER_REQUEST(5000) 行までに分割する", () => {
    const { source, requests } = createSource({ pageSize: 500, rowCount: 100_000 });
    source.ensureRange(0, 12_000);
    expect(requests().map((r) => r.count)).toEqual([5000, 5000, 2000]);
  });

  it("末尾ページの要求行数は rowCount を超えない", () => {
    const { source, requests } = createSource();
    source.ensureRange(95, 100);
    expect(requests()[0]).toMatchObject({ start: 90, count: 10 });
  });

  it("rowCount を超える範囲や空の範囲は要求しない", () => {
    const { source, requests } = createSource();
    source.ensureRange(100, 200);
    source.ensureRange(5, 5);
    source.ensureRange(-5, 0);
    expect(requests()).toHaveLength(0);
  });

  it("in-flight のページは再要求しない", () => {
    const { source, requests } = createSource();
    source.ensureRange(0, 10);
    source.ensureRange(0, 10);
    source.ensureRange(5, 15);
    expect(requests()).toHaveLength(2);
    expect(requests()[1]).toMatchObject({ start: 10, count: 10 });
  });

  it("取得済みのページは再要求しない", () => {
    const { source, requests, respond } = createSource();
    source.ensureRange(0, 10);
    respond(requests()[0]);
    source.ensureRange(0, 10);
    expect(requests()).toHaveLength(1);
  });

  it("reqId は要求ごとに異なる", () => {
    const { source, requests } = createSource();
    source.ensureRange(0, 10);
    source.ensureRange(20, 30);
    expect(new Set(requests().map((r) => r.reqId)).size).toBe(2);
  });

  it("large/rows が届くと getRow / getHandle が返し、購読者へ通知する", () => {
    const { source, requests, respond } = createSource();
    const listener = vi.fn();
    source.subscribe(listener);
    const before = source.getVersion();
    source.ensureRange(10, 20);
    respond(requests()[0]);
    expect(source.getRow(13)).toEqual(["v13", "x"]);
    expect(source.getHandle(13)).toBe(13);
    expect(source.getRow(9)).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getVersion()).not.toBe(before);
  });

  it("まとめた要求の応答は複数ページに分けて保持する", () => {
    const { source, requests, respond } = createSource();
    source.ensureRange(0, 30);
    respond(requests()[0]);
    expect(source.getRow(0)).toEqual(["v0", "x"]);
    expect(source.getRow(29)).toEqual(["v29", "x"]);
  });

  it("unsubscribe 後は通知しない", () => {
    const { source, requests, respond } = createSource();
    const listener = vi.fn();
    const unsubscribe = source.subscribe(listener);
    unsubscribe();
    source.ensureRange(0, 10);
    respond(requests()[0]);
    expect(listener).not.toHaveBeenCalled();
  });

  it("未知の reqId の応答は無視する", () => {
    const { source, requests, respond } = createSource();
    const listener = vi.fn();
    source.subscribe(listener);
    source.ensureRange(0, 10);
    respond({ ...requests()[0], reqId: 9999 });
    expect(source.getRow(0)).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it("同じ応答が二重に届いても二度目は無視する", () => {
    const { source, requests, respond } = createSource();
    source.ensureRange(0, 10);
    respond(requests()[0], "first");
    respond(requests()[0], "second");
    expect(source.getRow(0)).toEqual(["first0", "x"]);
  });

  it("先読みは表示範囲の前後ページを要求する", () => {
    const { source, requests } = createSource({ prefetchPages: 1 });
    source.ensureRange(30, 40);
    expect(requests()).toHaveLength(1);
    expect(requests()[0]).toMatchObject({ start: 20, count: 30 });
  });

  it("先読みは先頭・末尾でページ範囲内に収める", () => {
    const { source, requests } = createSource({ prefetchPages: 1 });
    source.ensureRange(0, 5);
    expect(requests()[0]).toMatchObject({ start: 0, count: 20 });
    source.ensureRange(95, 100);
    expect(requests()[1]).toMatchObject({ start: 80, count: 20 });
  });

  describe("無効化", () => {
    it("large/invalidate でキャッシュを破棄し rowCount を更新する", () => {
      const { source, requests, respond } = createSource();
      const listener = vi.fn();
      source.ensureRange(0, 10);
      respond(requests()[0]);
      source.subscribe(listener);
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 50 });
      expect(source.getRow(0)).toBeUndefined();
      expect(source.rowCount).toBe(50);
      expect(source.revision).toBe(1);
      expect(listener).toHaveBeenCalled();
    });

    it("無効化前に出した要求の応答は捨てる", () => {
      const { source, requests, respond } = createSource();
      source.ensureRange(0, 10);
      const stale = requests()[0];
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 100 });
      respond(stale, "old");
      expect(source.getRow(0)).not.toEqual(["old0", "x"]);
    });

    it("無効化後は直近の表示範囲を新しい要求で取り直す", () => {
      const { source, requests, respond } = createSource();
      source.ensureRange(20, 30);
      const stale = requests()[0];
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 100 });
      expect(requests()).toHaveLength(2);
      expect(requests()[1]).toMatchObject({ start: 20, count: 10 });
      expect(requests()[1].reqId).not.toBe(stale.reqId);
      respond(requests()[1], "new");
      expect(source.getRow(25)).toEqual(["new25", "x"]);
    });

    it("取り直しの範囲は新しい rowCount に収める", () => {
      const { source, requests } = createSource();
      source.ensureRange(90, 100);
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 95 });
      expect(requests()[1]).toMatchObject({ start: 90, count: 5 });
    });

    it("rowCount が表示範囲より小さくなったら再要求しない", () => {
      const { source, requests } = createSource();
      source.ensureRange(90, 100);
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 10 });
      expect(requests()).toHaveLength(1);
    });

    it("古い revision の invalidate は無視する", () => {
      const { source, requests, respond } = createSource();
      source.handleMessage({ type: "large/invalidate", revision: 5, rowCount: 100 });
      source.ensureRange(0, 10);
      respond(requests()[requests().length - 1]);
      source.handleMessage({ type: "large/invalidate", revision: 4, rowCount: 3 });
      expect(source.revision).toBe(5);
      expect(source.rowCount).toBe(100);
      expect(source.getRow(0)).toEqual(["v0", "x"]);
    });
  });

  describe("キャッシュ上限", () => {
    it("上限を超えると最も使われていないページから捨てる", () => {
      const { source, requests, respond } = createSource({ maxCachedPages: 2 });
      for (const start of [0, 10, 20]) {
        source.ensureRange(start, start + 10);
        respond(requests()[requests().length - 1]);
      }
      expect(source.getRow(0)).toBeUndefined();
      expect(source.getRow(10)).toBeDefined();
      expect(source.getRow(20)).toBeDefined();
    });

    it("getRow で参照したページは最近使ったものとして残る", () => {
      const { source, requests, respond } = createSource({ maxCachedPages: 2 });
      for (const start of [0, 10]) {
        source.ensureRange(start, start + 10);
        respond(requests()[requests().length - 1]);
      }
      source.getRow(0);
      source.ensureRange(20, 30);
      respond(requests()[requests().length - 1]);
      expect(source.getRow(0)).toBeDefined();
      expect(source.getRow(10)).toBeUndefined();
    });

    it("捨てたページは ensureRange で再要求する", () => {
      const { source, requests, respond } = createSource({ maxCachedPages: 1 });
      source.ensureRange(0, 10);
      respond(requests()[0]);
      source.ensureRange(10, 20);
      respond(requests()[1]);
      source.ensureRange(0, 10);
      expect(requests()).toHaveLength(3);
      expect(requests()[2]).toMatchObject({ start: 0, count: 10 });
    });
  });

  describe("その他のメッセージ", () => {
    it("large/init でヘッダーと行数を更新し、キャッシュを破棄する", () => {
      const { source, requests, respond } = createSource();
      source.ensureRange(0, 10);
      respond(requests()[0]);
      source.handleMessage({
        type: "large/init",
        header: ["x"],
        rowCount: 7,
        indexing: false,
        encoding: "utf8",
        restrictions: [],
      });
      expect(source.header).toEqual(["x"]);
      expect(source.rowCount).toBe(7);
      expect(source.getRow(0)).toBeUndefined();
    });

    it("reqId 付きの large/error は in-flight を解除し onError に渡す。再度 ensureRange で再要求できる", () => {
      const { source, requests, onError } = createSource();
      source.ensureRange(0, 10);
      source.handleMessage({ type: "large/error", message: "boom", reqId: requests()[0].reqId });
      expect(onError).toHaveBeenCalledWith("boom");
      source.ensureRange(0, 10);
      expect(requests()).toHaveLength(2);
    });

    it("対象外のメッセージは false を返し、対象のメッセージは true を返す", () => {
      const { source } = createSource();
      expect(source.handleMessage({ type: "large/progress", kind: "index", ratio: 0.5 })).toBe(
        false
      );
      expect(source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 1 })).toBe(
        true
      );
    });
  });
});
