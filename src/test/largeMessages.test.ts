import * as assert from "assert";
import { suite, test } from "mocha";
import {
  isLargeMessageToExtension,
  isLargeMessageToWebview,
  MAX_ROWS_PER_REQUEST,
} from "../message/largeMessages";

const check = (guard: (v: unknown) => boolean, valid: unknown[], invalid: unknown[]): void => {
  valid.forEach((v) => {
    test(`有効: ${JSON.stringify(v)}`, () => {
      assert.strictEqual(guard(v), true);
    });
  });
  invalid.forEach((v) => {
    test(`無効: ${JSON.stringify(v)}`, () => {
      assert.strictEqual(guard(v), false);
    });
  });
};

suite("大容量モードのメッセージ型ガード", () => {
  suite("isLargeMessageToExtension", () => {
    const range = { startRow: 0, endRow: 10, startCol: 0, endCol: 3 };
    const valid: unknown[] = [
      { type: "large/ready" },
      { type: "large/getRows", reqId: 1, start: 0, count: 500 },
      { type: "large/getRows", reqId: 0, start: 4999999, count: MAX_ROWS_PER_REQUEST },
      { type: "large/applyOps", ops: [] },
      {
        type: "large/applyOps",
        ops: [
          { type: "setRow", handle: 3, row: ["a", ""] },
          { type: "insertRows", beforeHandle: 3, handles: [-1, -2], rows: [["a"], []] },
          { type: "insertRows", beforeHandle: null, handles: [-3], rows: [["a"]] },
          { type: "deleteRows", handles: [0, -1] },
          { type: "setHeader", header: ["x", "y"] },
        ],
      },
      { type: "large/sort", jobId: 1, column: 2, direction: "asc" },
      { type: "large/sort", jobId: 1, column: 0, direction: "desc" },
      { type: "large/sort", jobId: 1, column: 0, direction: null },
      { type: "large/filter", jobId: 2, filters: [] },
      { type: "large/filter", jobId: 2, filters: [{ column: 1, text: "a" }] },
      { type: "large/search", jobId: 3, query: "abc", from: 0, direction: "forward" },
      { type: "large/search", jobId: 3, query: "", from: 10, direction: "backward" },
      { type: "large/cancel", jobId: 3 },
      { type: "large/getRange", reqId: 4, range },
      {
        type: "large/getRange",
        reqId: 4,
        range: { startRow: 0, endRow: 100000, startCol: 0, endCol: 1 },
      },
    ];
    const invalid: unknown[] = [
      undefined,
      null,
      "large/ready",
      42,
      [],
      {},
      { type: 1 },
      { type: "ready" },
      { type: "init" },
      { type: "applyOps", epoch: 0, ops: [] },
      { type: "large/unknown" },
      { type: "large/rows" },
      { type: "large/getRows" },
      { type: "large/getRows", reqId: 1, start: 0 },
      { type: "large/getRows", reqId: 1, start: 0, count: 0 },
      { type: "large/getRows", reqId: 1, start: 0, count: MAX_ROWS_PER_REQUEST + 1 },
      { type: "large/getRows", reqId: -1, start: 0, count: 1 },
      { type: "large/getRows", reqId: 1, start: -1, count: 1 },
      { type: "large/getRows", reqId: 1.5, start: 0, count: 1 },
      { type: "large/getRows", reqId: "1", start: 0, count: 1 },
      { type: "large/getRows", reqId: 1, start: Number.NaN, count: 1 },
      { type: "large/getRows", reqId: 1, start: 0, count: Infinity },
      { type: "large/applyOps" },
      { type: "large/applyOps", ops: {} },
      { type: "large/applyOps", ops: [null] },
      { type: "large/applyOps", ops: [{ type: "x" }] },
      { type: "large/applyOps", ops: [{ type: "setRow", handle: 1.5, row: [] }] },
      { type: "large/applyOps", ops: [{ type: "setRow", handle: 1, row: [1] }] },
      { type: "large/applyOps", ops: [{ type: "setRow", handle: 1 }] },
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", beforeHandle: 1, handles: [-1], rows: [] }],
      },
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", handles: [], rows: [] }],
      },
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", beforeHandle: 1, handles: [0], rows: [["a"]] }],
      },
      { type: "large/applyOps", ops: [{ type: "deleteRows", handles: ["a"] }] },
      { type: "large/applyOps", ops: [{ type: "setHeader", header: [1] }] },
      { type: "large/sort", jobId: 1, column: 0, direction: "up" },
      { type: "large/sort", jobId: 1, column: -1, direction: "asc" },
      { type: "large/sort", column: 0, direction: "asc" },
      { type: "large/filter", jobId: 1 },
      { type: "large/filter", jobId: 1, filters: [{ column: 0 }] },
      { type: "large/filter", jobId: 1, filters: [{ column: -1, text: "a" }] },
      { type: "large/search", jobId: 1, query: 1, from: 0, direction: "forward" },
      { type: "large/search", jobId: 1, query: "a", from: -1, direction: "forward" },
      { type: "large/search", jobId: 1, query: "a", from: 0, direction: "x" },
      { type: "large/cancel" },
      { type: "large/cancel", jobId: -1 },
      { type: "large/getRange", reqId: 1 },
      { type: "large/getRange", reqId: 1, range: { ...range, endRow: "1" } },
      { type: "large/getRange", reqId: 1, range: { ...range, startRow: 5, endRow: 4 } },
      { type: "large/getRange", reqId: 1, range: { ...range, startCol: -1 } },
      { type: "large/getRange", reqId: 1, range: null },
      {
        type: "large/getRange",
        reqId: 1,
        range: { startRow: 0, endRow: 100001, startCol: 0, endCol: 1 },
      },
    ];
    check(isLargeMessageToExtension, valid, invalid);
  });

  suite("isLargeMessageToWebview", () => {
    const init = {
      type: "large/init",
      header: ["a", "b"],
      rowCount: 100,
      indexing: false,
      encoding: "utf8",
      restrictions: ["列の挿入・削除"],
    };
    const valid: unknown[] = [
      init,
      { ...init, header: [], rowCount: 0, indexing: true, restrictions: [] },
      // nextHandle: 次に使う追加行の負のハンドル（webview はこれより小さい値から採番する）
      { ...init, nextHandle: -1 },
      { ...init, nextHandle: -42 },
      { type: "large/rows", reqId: 1, start: 0, rows: [["a"], []], handles: [0, -1] },
      { type: "large/rows", reqId: 1, start: 5, rows: [], handles: [] },
      { type: "large/progress", kind: "index", ratio: 0 },
      { type: "large/progress", kind: "sort", ratio: 0.5, jobId: 2 },
      { type: "large/progress", kind: "filter", ratio: 1 },
      { type: "large/progress", kind: "search", ratio: 0.25 },
      { type: "large/invalidate", revision: 0, rowCount: 0 },
      { type: "large/invalidate", revision: 3, rowCount: 10 },
      // header の省略は「ヘッダーは変わっていない」
      { type: "large/invalidate", revision: 1, rowCount: 3, header: ["id", "name"] },
      { type: "large/invalidate", revision: 1, rowCount: 3, header: [] },
      { type: "large/searchResult", jobId: 1, match: null },
      { type: "large/searchResult", jobId: 1, match: { row: 5, col: 2 } },
      { type: "large/range", reqId: 2, rows: [["a", "b"]] },
      { type: "large/error", message: "失敗" },
      { type: "large/error", message: "失敗", reqId: 3 },
    ];
    const invalid: unknown[] = [
      undefined,
      null,
      "large/init",
      [],
      {},
      { type: "init", epoch: 0 },
      { type: "update", payload: "a", epoch: 0 },
      { type: "large/unknown" },
      { ...init, header: [1] },
      { ...init, header: "a" },
      { ...init, rowCount: -1 },
      { ...init, rowCount: 1.5 },
      { ...init, rowCount: "1" },
      { ...init, indexing: "no" },
      { ...init, encoding: 1 },
      { ...init, restrictions: [1] },
      { ...init, nextHandle: 0 },
      { ...init, nextHandle: 1 },
      { ...init, nextHandle: -1.5 },
      { ...init, nextHandle: "-1" },
      { ...init, nextHandle: null },
      { type: "large/init" },
      { type: "large/rows", reqId: 1, start: 0, rows: [["a"]] },
      { type: "large/rows", reqId: 1, start: 0, rows: [["a"]], handles: [] },
      { type: "large/rows", reqId: 1, start: 0, rows: [["a"]], handles: ["0"] },
      { type: "large/rows", reqId: 1, start: 0, rows: [["a"]], handles: [0.5] },
      { type: "large/rows", reqId: 1, start: 0, rows: [[1]], handles: [0] },
      { type: "large/rows", reqId: -1, start: 0, rows: [], handles: [] },
      { type: "large/rows", reqId: 1, start: -1, rows: [], handles: [] },
      { type: "large/progress", kind: "x", ratio: 0 },
      { type: "large/progress", kind: "index", ratio: -0.1 },
      { type: "large/progress", kind: "index", ratio: 1.1 },
      { type: "large/progress", kind: "index", ratio: Number.NaN },
      { type: "large/progress", kind: "index", ratio: "0" },
      { type: "large/progress", kind: "sort", ratio: 0, jobId: -1 },
      { type: "large/invalidate", revision: -1, rowCount: 0 },
      { type: "large/invalidate", revision: 0, rowCount: 1.5 },
      { type: "large/invalidate", revision: 0 },
      { type: "large/invalidate", revision: 1, rowCount: 3, header: ["id", 1] },
      { type: "large/invalidate", revision: 1, rowCount: 3, header: "id" },
      { type: "large/invalidate", revision: 1, rowCount: 3, header: [null] },
      { type: "large/invalidate", revision: 1, rowCount: 3, header: null },
      { type: "large/searchResult", jobId: 1 },
      { type: "large/searchResult", jobId: 1, match: { row: -1, col: 0 } },
      { type: "large/searchResult", jobId: 1, match: { row: 0 } },
      { type: "large/range", reqId: 1 },
      { type: "large/range", reqId: 1, rows: [[1]] },
      { type: "large/error" },
      { type: "large/error", message: 1 },
      { type: "large/error", message: "a", reqId: -1 },
    ];
    check(isLargeMessageToWebview, valid, invalid);
  });
});
