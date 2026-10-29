import * as assert from "assert";

suite("別の機能", () => {
  test("一つ目", () => {
    assert.ok(true);
  });
  test.skip('二つ目', () => {
    assert.ok(true);
  });
});
