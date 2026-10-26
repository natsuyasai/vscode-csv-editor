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

    it("large/init に revision があれば以後の revision にする", () => {
      const { source } = createSource();
      source.handleMessage({
        type: "large/init",
        header: ["x"],
        rowCount: 7,
        indexing: false,
        encoding: "utf8",
        restrictions: [],
        revision: 9,
      });
      expect(source.revision).toBe(9);
      source.handleMessage({ type: "large/invalidate", revision: 8, rowCount: 1 });
      expect(source.rowCount).toBe(7);
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

  describe("applyOps（楽観的更新）", () => {
    type ApplyOps = Extract<LargeMessageToExtension, { type: "large/applyOps" }>;

    /** 30行（3ページ）をすべて取得済みにした RowSource。ハンドルは行位置と同じ */
    const loaded = (rowCount = 30, range: [number, number] = [0, rowCount]) => {
      const created = createSource({ rowCount });
      created.source.ensureRange(range[0], range[1]);
      for (const request of created.requests()) {
        created.respond(request);
      }
      created.sent.length = 0;
      return created;
    };

    it("large/applyOps で op をそのまま拡張機能へ送る", () => {
      const { source, sent } = loaded();
      const ops = [{ type: "setRow" as const, handle: 3, row: ["new", "x"] }];
      source.applyOps(ops);
      expect(sent[0]).toEqual({ type: "large/applyOps", revision: 0, ops });
    });

    it("large/applyOps に最後に受け取った invalidate の revision を載せる", () => {
      const { source, sent } = loaded();
      source.handleMessage({ type: "large/invalidate", revision: 4, rowCount: 30 });
      sent.length = 0;
      const ops = [{ type: "setRow" as const, handle: 3, row: ["new", "x"] }];
      source.applyOps(ops);
      expect(sent[0]).toEqual({ type: "large/applyOps", revision: 4, ops });
    });

    it("revision を渡すと、それを op のハンドルを得たときの revision として載せる", () => {
      const { source, sent } = loaded();
      source.handleMessage({ type: "large/invalidate", revision: 6, rowCount: 30 });
      sent.length = 0;
      const ops = [{ type: "setRow" as const, handle: 3, row: ["new", "x"] }];
      source.applyOps(ops, 2);
      expect(sent[0]).toEqual({ type: "large/applyOps", revision: 2, ops });
    });

    it("setRow はキャッシュ内の同じハンドルの行を即座に置き換え、購読者へ通知する", () => {
      const { source, requests } = loaded();
      const listener = vi.fn();
      source.subscribe(listener);
      source.applyOps([{ type: "setRow", handle: 13, row: ["edited", "y"] }]);
      expect(source.getRow(13)).toEqual(["edited", "y"]);
      expect(source.getHandle(13)).toBe(13);
      expect(source.getRow(12)).toEqual(["v12", "x"]);
      expect(listener).toHaveBeenCalled();
      // 取得済みの行は取り直さない
      expect(requests()).toHaveLength(0);
    });

    it("op より前に送った要求の応答（編集前の行）は捨て、op を送った後に取り直す", () => {
      const { source, sent, requests, respond } = createSource({ rowCount: 30 });
      source.ensureRange(0, 10);
      const stale = requests()[0];
      source.applyOps([{ type: "setRow", handle: 3, row: ["edited", "y"] }]);
      // 編集前の内容で遅れて届いた応答は使わない
      respond(stale, "old");
      expect(source.getRow(3)).toBeUndefined();
      // applyOps の後に同じ範囲を要求し直す（拡張機能は op を適用してから応答する）
      const types = sent.map((m) => m.type);
      expect(types.indexOf("large/applyOps")).toBeLessThan(types.lastIndexOf("large/getRows"));
      const retry = requests()[requests().length - 1];
      expect(retry.reqId).not.toBe(stale.reqId);
      expect(retry.start).toBe(0);
    });

    it("insertRows は beforeHandle の位置に行を差し込み、行数と後ろの行をずらす", () => {
      const { source } = loaded();
      source.applyOps([
        { type: "insertRows", beforeHandle: 15, handles: [-1, -2], rows: [["n1"], ["n2"]] },
      ]);
      expect(source.rowCount).toBe(32);
      expect(source.getRow(14)).toEqual(["v14", "x"]);
      expect(source.getRow(15)).toEqual(["n1"]);
      expect(source.getHandle(15)).toBe(-1);
      expect(source.getHandle(16)).toBe(-2);
      expect(source.getRow(17)).toEqual(["v15", "x"]);
      expect(source.getHandle(17)).toBe(15);
      expect(source.getRow(31)).toEqual(["v29", "x"]);
    });

    it("beforeHandle が null の insertRows は末尾に追加する", () => {
      const { source } = loaded();
      source.applyOps([{ type: "insertRows", beforeHandle: null, handles: [-1], rows: [["n"]] }]);
      expect(source.rowCount).toBe(31);
      expect(source.getRow(30)).toEqual(["n"]);
      expect(source.getHandle(30)).toBe(-1);
      expect(source.getRow(29)).toEqual(["v29", "x"]);
    });

    it("deleteRows はハンドルの行を除き、行数と後ろの行を詰める", () => {
      const { source } = loaded();
      source.applyOps([{ type: "deleteRows", handles: [15] }]);
      expect(source.rowCount).toBe(29);
      expect(source.getRow(14)).toEqual(["v14", "x"]);
      expect(source.getRow(15)).toEqual(["v16", "x"]);
      expect(source.getHandle(15)).toBe(16);
      expect(source.getRow(28)).toEqual(["v29", "x"]);
      expect(source.getRow(29)).toBeUndefined();
    });

    it("位置がずれて中身が揃わなくなったページは捨てて取り直す", () => {
      // 100行のうち 0〜19 行目（2ページ）と 50〜59 行目（離れた1ページ）だけを取得済みにする
      const { source, requests, respond, sent } = createSource({ rowCount: 100 });
      source.ensureRange(50, 60);
      source.ensureRange(0, 20);
      for (const request of requests()) {
        respond(request);
      }
      sent.length = 0;
      source.applyOps([{ type: "insertRows", beforeHandle: 5, handles: [-1], rows: [["n"]] }]);
      expect(source.getRow(5)).toEqual(["n"]);
      expect(source.getRow(19)).toEqual(["v18", "x"]);
      // 20行目は未取得だった次のページの行がずれて入るはずなので、空のまま取り直す
      expect(source.getRow(20)).toBeUndefined();
      expect(source.getRow(55)).toBeUndefined();
      // 直近の表示範囲（0〜19）は揃っているので、取り直しは不要
      expect(requests()).toHaveLength(0);
    });

    it("キャッシュに無いハンドルへの挿入は位置が分からないため、行数だけ変えて全体を取り直す", () => {
      const { source, requests } = loaded(30, [0, 10]);
      source.applyOps([{ type: "insertRows", beforeHandle: 25, handles: [-1], rows: [["n"]] }]);
      expect(source.rowCount).toBe(31);
      expect(source.getRow(0)).toBeUndefined();
      expect(requests()).toHaveLength(1);
      expect(requests()[0].start).toBe(0);
    });

    it("setHeader はヘッダーを即座に置き換える", () => {
      const { source } = loaded();
      const listener = vi.fn();
      source.subscribe(listener);
      source.applyOps([{ type: "setHeader", header: ["A", "B"] }]);
      expect(source.header).toEqual(["A", "B"]);
      expect(listener).toHaveBeenCalled();
    });

    it("op を送った後の large/invalidate で拡張機能の状態に収束する", () => {
      const { source, requests, respond, sent } = loaded();
      source.applyOps([{ type: "setRow", handle: 3, row: ["optimistic", "x"] }]);
      expect((sent[0] as ApplyOps).type).toBe("large/applyOps");
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 30 });
      expect(source.getRow(3)).toBeUndefined();
      for (const request of requests()) {
        respond(request, "server");
      }
      expect(source.getRow(3)).toEqual(["server3", "x"]);
    });

    it("large/invalidate の header でヘッダーを置き換え、header が無ければそのまま", () => {
      const { source } = loaded();
      source.applyOps([{ type: "setHeader", header: ["optimistic", "b"] }]);
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 30 });
      expect(source.header).toEqual(["optimistic", "b"]);
      source.handleMessage({
        type: "large/invalidate",
        revision: 2,
        rowCount: 30,
        header: ["a", "b"],
      });
      expect(source.header).toEqual(["a", "b"]);
    });

    it("空の ops は送らない", () => {
      const { source, sent } = loaded();
      source.applyOps([]);
      expect(sent).toHaveLength(0);
    });
  });
});
