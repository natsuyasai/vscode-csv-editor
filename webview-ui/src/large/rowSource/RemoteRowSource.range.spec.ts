import type { LargeMessageToExtension } from "@message/largeMessages";
import { RemoteRowSource } from "./RemoteRowSource";

type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;
type GetRange = Extract<LargeMessageToExtension, { type: "large/getRange" }>;

const PAGE = 10;

const createSource = (rowCount = 100) => {
  const sent: LargeMessageToExtension[] = [];
  const onError = vi.fn();
  const source = new RemoteRowSource({
    postMessage: (message) => sent.push(message),
    header: ["a", "b"],
    rowCount,
    pageSize: PAGE,
    prefetchPages: 0,
    onError,
  });
  const rowRequests = () => sent.filter((m): m is GetRows => m.type === "large/getRows");
  const rangeRequests = () => sent.filter((m): m is GetRange => m.type === "large/getRange");
  const respondRows = (request: GetRows, tag = "v") =>
    source.handleMessage({
      type: "large/rows",
      reqId: request.reqId,
      start: request.start,
      rows: Array.from({ length: request.count }, (_, i) => [
        `${tag}${String(request.start + i)}`,
        "x",
      ]),
      handles: Array.from({ length: request.count }, (_, i) => request.start + i + 1),
    });
  return { source, sent, rowRequests, rangeRequests, respondRows, onError };
};

describe("RemoteRowSource.getRange（コピー用）", () => {
  it("large/getRange を送り、同じ reqId の large/range の行で解決する", async () => {
    const { source, rangeRequests } = createSource();
    const range = { startRow: 2, endRow: 4, startCol: 0, endCol: 2 };
    const promise = source.getRange(range);
    expect(rangeRequests()).toHaveLength(1);
    expect(rangeRequests()[0].range).toEqual(range);

    expect(
      source.handleMessage({
        type: "large/range",
        reqId: rangeRequests()[0].reqId,
        rows: [["a", "b"]],
      })
    ).toBe(true);
    await expect(promise).resolves.toEqual([["a", "b"]]);
  });

  it("reqId は行の要求と重ならない", () => {
    const { source, rowRequests, rangeRequests } = createSource();
    source.ensureRange(0, 5);
    void source.getRange({ startRow: 0, endRow: 1, startCol: 0, endCol: 1 });
    expect(rangeRequests()[0].reqId).not.toBe(rowRequests()[0].reqId);
  });

  it("同じ reqId の large/error で失敗し、表全体のエラーとしては知らせない", async () => {
    const { source, rangeRequests, onError } = createSource();
    const promise = source.getRange({ startRow: 0, endRow: 1, startCol: 0, endCol: 1 });
    source.handleMessage({
      type: "large/error",
      message: "多すぎます",
      reqId: rangeRequests()[0].reqId,
    });
    await expect(promise).rejects.toThrow("多すぎます");
    expect(onError).not.toHaveBeenCalled();
  });

  it("無効化（large/invalidate）が届いても要求中の範囲は捨てない", async () => {
    const { source, rangeRequests } = createSource();
    const promise = source.getRange({ startRow: 0, endRow: 1, startCol: 0, endCol: 1 });
    source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 100 });
    source.handleMessage({ type: "large/range", reqId: rangeRequests()[0].reqId, rows: [["z"]] });
    await expect(promise).resolves.toEqual([["z"]]);
  });
});

describe("RemoteRowSource.fetchRows（貼り付け用）", () => {
  it("取得済みの行だけなら要求せずにキャッシュの行・ハンドルと現在の revision で解決する", async () => {
    const { source, rowRequests, respondRows } = createSource();
    source.handleMessage({ type: "large/invalidate", revision: 3, rowCount: 100 });
    source.ensureRange(0, 20);
    rowRequests().forEach((request) => respondRows(request));
    const before = rowRequests().length;

    const result = await source.fetchRows(5, 12);
    expect(rowRequests()).toHaveLength(before);
    expect(result.rows.map((row) => row[0])).toEqual(
      ["v5", "v6", "v7", "v8", "v9", "v10", "v11"].map(String)
    );
    expect(result.handles).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(result.revision).toBe(3);
  });

  it("未取得の行があれば、MAX_ROWS_PER_REQUEST 行ずつ getRows で取り寄せる", async () => {
    const { source, rowRequests, respondRows } = createSource(20000);
    const promise = source.fetchRows(100, 12100);
    const requests = rowRequests();
    expect(requests.map((r) => [r.start, r.count])).toEqual([
      [100, 5000],
      [5100, 5000],
      [10100, 2000],
    ]);
    requests.forEach((request) => respondRows(request));
    const result = await promise;
    expect(result.rows).toHaveLength(12000);
    expect(result.rows[0][0]).toBe("v100");
    expect(result.rows[11999][0]).toBe("v12099");
    expect(result.handles[0]).toBe(101);
    expect(result.revision).toBe(0);
  });

  it("取り寄せた行は表示用のキャッシュとは別に扱い、表示中の要求を妨げない", async () => {
    const { source, rowRequests, respondRows } = createSource();
    const promise = source.fetchRows(50, 55);
    const fetch = rowRequests()[0];
    source.ensureRange(50, 55);
    const page = rowRequests()[1];
    expect(page).toBeDefined();
    respondRows(fetch, "f");
    respondRows(page, "p");
    await expect(promise).resolves.toMatchObject({
      rows: [
        ["f50", "x"],
        ["f51", "x"],
        ["f52", "x"],
        ["f53", "x"],
        ["f54", "x"],
      ],
    });
    expect(source.getRow(50)).toEqual(["p50", "x"]);
  });

  it("取り寄せの途中で無効化が届いたら、取り直してから解決する", async () => {
    const { source, rowRequests, respondRows } = createSource();
    const promise = source.fetchRows(0, 3);
    const first = rowRequests()[0];
    source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 100 });
    respondRows(first, "old");
    const retry = rowRequests().find(
      (r) => r.reqId !== first.reqId && r.start === 0 && r.count === 3
    );
    expect(retry).toBeDefined();
    if (retry) {
      respondRows(retry, "new");
    }
    const result = await promise;
    expect(result.rows[0][0]).toBe("new0");
    expect(result.revision).toBe(1);
  });

  it("無効化が続いて取り直しの上限を超えたら失敗する", async () => {
    const { source, rowRequests, respondRows } = createSource();
    const promise = source.fetchRows(0, 3);
    for (let revision = 1; revision <= 5; revision++) {
      const pending = rowRequests().at(-1);
      source.handleMessage({ type: "large/invalidate", revision, rowCount: 100 });
      if (pending) {
        respondRows(pending);
      }
    }
    await expect(promise).rejects.toThrow();
  });

  it("末尾を超える分は切り詰める", async () => {
    const { source, rowRequests, respondRows } = createSource(10);
    const promise = source.fetchRows(8, 15);
    expect(rowRequests()[0]).toMatchObject({ start: 8, count: 2 });
    respondRows(rowRequests()[0]);
    const result = await promise;
    expect(result.rows).toHaveLength(2);
  });

  it("large/error で失敗する", async () => {
    const { source, rowRequests, onError } = createSource();
    const promise = source.fetchRows(0, 3);
    source.handleMessage({
      type: "large/error",
      message: "読めません",
      reqId: rowRequests()[0].reqId,
    });
    await expect(promise).rejects.toThrow("読めません");
    expect(onError).not.toHaveBeenCalled();
  });
});
