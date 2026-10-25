import * as assert from "assert";
import { suite, test } from "mocha";
import { getNonce } from "../util/util";

suite("getNonce (issue #89)", () => {
  test("CSP nonce として妥当な文字種（base64 文字のみ）で十分な長さを持つ", () => {
    const nonce = getNonce();
    assert.match(nonce, /^[A-Za-z0-9+/]+={0,2}$/);
    assert.ok(nonce.length >= 22, `length: ${String(nonce.length)}`);
  });

  test("毎回異なる値になる", () => {
    const set = new Set(Array.from({ length: 1000 }, () => getNonce()));
    assert.strictEqual(set.size, 1000);
  });

  test("Math.random に依存しない", () => {
    const original = Math.random;
    Math.random = () => 0;
    try {
      assert.notStrictEqual(getNonce(), getNonce());
    } finally {
      Math.random = original;
    }
  });
});
