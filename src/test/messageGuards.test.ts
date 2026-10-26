import * as assert from "assert";
import { suite, test } from "mocha";
import { isMessageToExtension } from "../message/messageTypeToExtension";
import { isMessageToWebview } from "../message/messageTypeToWebview";

suite("メッセージ型ガード (issue #89)", () => {
  suite("isMessageToExtension", () => {
    const valid: unknown[] = [
      { type: "init" },
      { type: "reload" },
      { type: "reload", payload: "a,b" },
      { type: "openAsText" },
      { type: "save" },
      { type: "applyOps", epoch: 0, ops: [] },
      {
        type: "applyOps",
        epoch: 3,
        ops: [{ type: "replaceRows", start: 0, deleteCount: 0, rows: [] }],
      },
      {
        type: "applyOps",
        epoch: 1,
        ops: [
          { type: "replaceRows", start: 2, deleteCount: 1, rows: [["a", ""], ["b"]] },
          { type: "replaceRows", start: 0, deleteCount: 0, rows: [[]] },
        ],
      },
    ];
    valid.forEach((v) => {
      test(`有効: ${JSON.stringify(v)}`, () => {
        assert.strictEqual(isMessageToExtension(v), true);
      });
    });

    const invalid: unknown[] = [
      undefined,
      null,
      "init",
      42,
      [],
      {},
      { type: 1 },
      { type: "unknown" },
      { type: "updateTheme", payload: "dark" },
      // webview→拡張の全文 update は廃止した（差分は applyOps で送る）
      { type: "update", payload: "a,b\n1,2" },
      { type: "update" },
      { type: "save", payload: {} },
      { type: "save", payload: 1 },
      { type: "applyOps" },
      { type: "applyOps", epoch: 0 },
      { type: "applyOps", ops: [] },
      { type: "applyOps", epoch: "1", ops: [] },
      { type: "applyOps", epoch: 1.5, ops: [] },
      { type: "applyOps", epoch: Number.NaN, ops: [] },
      { type: "applyOps", epoch: Infinity, ops: [] },
      { type: "applyOps", epoch: 0, ops: {} },
      { type: "applyOps", epoch: 0, ops: [null] },
      { type: "applyOps", epoch: 0, ops: [{}] },
      { type: "applyOps", epoch: 0, ops: [{ type: "x", start: 0, deleteCount: 0, rows: [] }] },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: -1, deleteCount: 0, rows: [] }],
      },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0.5, deleteCount: 0, rows: [] }],
      },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0, deleteCount: -1, rows: [] }],
      },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0, deleteCount: "1", rows: [] }],
      },
      { type: "applyOps", epoch: 0, ops: [{ type: "replaceRows", start: 0, deleteCount: 0 }] },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0, deleteCount: 0, rows: ["a"] }],
      },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0, deleteCount: 0, rows: [[1]] }],
      },
      {
        type: "applyOps",
        epoch: 0,
        ops: [{ type: "replaceRows", start: 0, deleteCount: 0, rows: [["a"]] }, 1],
      },
      { type: "reload", payload: 1 },
    ];
    invalid.forEach((v) => {
      test(`無効: ${JSON.stringify(v)}`, () => {
        assert.strictEqual(isMessageToExtension(v), false);
      });
    });
  });

  suite("isMessageToWebview", () => {
    test("有効なメッセージを受理する", () => {
      assert.strictEqual(isMessageToWebview({ type: "init", payload: "a", epoch: 1 }), true);
      assert.strictEqual(isMessageToWebview({ type: "update", payload: "a", epoch: 0 }), true);
      assert.strictEqual(isMessageToWebview({ type: "updateTheme", payload: "dark" }), true);
      assert.strictEqual(isMessageToWebview({ type: "updateTheme", payload: "light" }), true);
    });
    test("不正なメッセージを拒否する", () => {
      assert.strictEqual(isMessageToWebview(null), false);
      assert.strictEqual(isMessageToWebview("x"), false);
      assert.strictEqual(isMessageToWebview({ type: "nope" }), false);
      assert.strictEqual(isMessageToWebview({ type: "update", payload: 1 }), false);
      assert.strictEqual(isMessageToWebview({ type: "init", payload: 1 }), false);
      assert.strictEqual(isMessageToWebview({ type: "update", payload: "a" }), false);
      assert.strictEqual(isMessageToWebview({ type: "init", epoch: 1.5 }), false);
      assert.strictEqual(isMessageToWebview({ type: "init", epoch: "1" }), false);
      assert.strictEqual(isMessageToWebview({ type: "update", payload: "a", epoch: -1 }), false);
      assert.strictEqual(
        isMessageToWebview({ type: "update", payload: "a", epoch: Number.NaN }),
        false
      );
      assert.strictEqual(isMessageToWebview({ type: "updateTheme", payload: "blue" }), false);
      assert.strictEqual(isMessageToWebview({ type: "updateTheme" }), false);
    });
  });
});
