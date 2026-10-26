// largeMessages の型ガードの基本は src/test/largeMessages.test.ts（拡張機能側の mocha）で確かめている。
// ここでは webview が依存する `large/invalidate` の header（2-2 で追加）だけを確かめる
import { isLargeMessageToWebview } from "@message/largeMessages";

describe("isLargeMessageToWebview: large/invalidate の header", () => {
  it("header を省略した invalidate を受け付ける（ヘッダーは変わっていない）", () => {
    expect(isLargeMessageToWebview({ type: "large/invalidate", revision: 1, rowCount: 3 })).toBe(
      true
    );
  });

  it("文字列の配列の header を受け付ける", () => {
    expect(
      isLargeMessageToWebview({
        type: "large/invalidate",
        revision: 1,
        rowCount: 3,
        header: ["id", "name"],
      })
    ).toBe(true);
  });

  it.each([[["id", 1]], ["id"], [null]])("文字列の配列でない header（%j）は拒否する", (header) => {
    expect(
      isLargeMessageToWebview({ type: "large/invalidate", revision: 1, rowCount: 3, header })
    ).toBe(false);
  });
});
