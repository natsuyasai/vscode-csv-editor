import * as assert from "assert";
import { suite, test } from "mocha";
import { TextDecoder } from "util";

import { decoderLabel, isLargeEncoding, LARGE_ENCODINGS, skipsBom } from "../large/largeEncoding";

/** 大容量モードで選べる文字コード */
suite("largeEncoding（大容量モードの文字コード）", () => {
  test("UTF-8 / UTF-8(BOM) / Shift_JIS / EUC-JP の4つを選べる", () => {
    assert.deepStrictEqual([...LARGE_ENCODINGS], ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"]);
  });

  test("型ガードは一覧の値だけを受け付ける", () => {
    assert.ok(LARGE_ENCODINGS.every(isLargeEncoding));
    for (const value of ["utf8", "UTF-8", "utf-16le", "", 1, null, undefined]) {
      assert.strictEqual(isLargeEncoding(value), false, String(value));
    }
  });

  test("TextDecoder のラベルは UTF-8(BOM) も utf-8 になる", () => {
    assert.deepStrictEqual(LARGE_ENCODINGS.map(decoderLabel), [
      "utf-8",
      "utf-8",
      "shift_jis",
      "euc-jp",
    ]);
  });

  test("BOM を飛ばすのは UTF-8 系だけ", () => {
    assert.deepStrictEqual(LARGE_ENCODINGS.map(skipsBom), [true, true, false, false]);
  });

  test("ラベルはすべて TextDecoder で使える", () => {
    for (const encoding of LARGE_ENCODINGS) {
      assert.doesNotThrow(() => new TextDecoder(decoderLabel(encoding)), encoding);
    }
  });
});
