import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { LargeMessageToExtension } from "@message/largeMessages";
import { RemoteRowSource } from "./RemoteRowSource";

const feature = await loadFeature("./RowSource.feature");

type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;

const PAGE_SIZE = 500;

describeFeature(feature, ({ Scenario }) => {
  let sent: LargeMessageToExtension[] = [];
  let source: RemoteRowSource;
  let notified = 0;

  const requests = () => sent.filter((m): m is GetRows => m.type === "large/getRows");

  const open = (maxCachedPages?: number) => {
    sent = [];
    notified = 0;
    source = new RemoteRowSource({
      postMessage: (message) => sent.push(message),
      header: ["id", "name"],
      rowCount: 1_000_000,
      prefetchPages: 0,
      maxCachedPages,
    });
    source.subscribe(() => {
      notified += 1;
    });
  };

  const respond = (request: GetRows, tag = "v") => {
    source.handleMessage({
      type: "large/rows",
      reqId: request.reqId,
      start: request.start,
      rows: Array.from({ length: request.count }, (_, i) => [`${tag}${request.start + i}`, "x"]),
      handles: Array.from({ length: request.count }, (_, i) => request.start + i),
    });
  };

  const showPageAt = (row: number) => source.ensureRange(row, row + 30);

  Scenario("表示範囲の行だけを要求する", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("1200行目から1230行目を表示する", () => showPageAt(1200));
    Then("1200行目を含む500行単位のページだけを1回要求する", () => {
      expect(requests()).toHaveLength(1);
      expect(requests()[0].start).toBe(1000);
      expect(requests()[0].count).toBe(PAGE_SIZE);
    });
    And("ファイル全体は要求しない", () => {
      expect(requests().reduce((sum, r) => sum + r.count, 0)).toBeLessThan(source.rowCount);
    });
  });

  Scenario("同じページを二重に要求しない", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("1200行目から1230行目を表示する", () => showPageAt(1200));
    And("応答を待つ間に同じ範囲をもう一度表示する", () => showPageAt(1200));
    Then("要求は1回のままである", () => {
      expect(requests()).toHaveLength(1);
    });
  });

  Scenario("届いた行が表示される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    And("1200行目から1230行目を表示している", () => showPageAt(1200));
    When("拡張機能から該当ページの行が届く", () => respond(requests()[0]));
    Then("1200行目の内容を取得できる", () => {
      expect(source.getRow(1200)).toEqual(["v1200", "x"]);
    });
    And("画面に再描画が通知される", () => {
      expect(notified).toBeGreaterThan(0);
    });
  });

  Scenario("取得済みのページは再要求しない", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    And("1200行目から1230行目を表示して行が届いている", () => {
      showPageAt(1200);
      respond(requests()[0]);
    });
    When("同じ範囲を表示し直す", () => showPageAt(1200));
    Then("要求は1回のままである", () => {
      expect(requests()).toHaveLength(1);
    });
  });

  Scenario("無効化されると古い応答は捨てられ再要求される", ({ Given, When, Then, And }) => {
    let stale: GetRows;
    Given("100万行の大容量ファイルを開いている", () => open());
    And("1200行目から1230行目を表示している", () => {
      showPageAt(1200);
      stale = requests()[0];
    });
    When("拡張機能が編集などでキャッシュの無効化を通知する", () => {
      source.handleMessage({ type: "large/invalidate", revision: 1, rowCount: 1_000_000 });
    });
    And("無効化の前に出した要求の応答が届く", () => respond(stale, "old"));
    Then("古い応答の行は表示されない", () => {
      expect(source.getRow(1200)).toBeUndefined();
    });
    And("同じ範囲が新しい要求で取り直される", () => {
      expect(requests()).toHaveLength(2);
      expect(requests()[1].start).toBe(1000);
      expect(requests()[1].reqId).not.toBe(stale.reqId);
    });
  });

  Scenario("キャッシュ上限を超えると古いページが捨てられる", ({ Given, When, Then, And }) => {
    Given("キャッシュ上限が2ページの大容量ファイルを開いている", () => open(2));
    When("3つの離れたページを順に表示して行が届く", () => {
      for (const row of [1000, 5000, 9000]) {
        showPageAt(row);
        respond(requests()[requests().length - 1]);
      }
    });
    Then("最初のページの行は取得できなくなる", () => {
      expect(source.getRow(1000)).toBeUndefined();
    });
    And("後の2ページの行は取得できる", () => {
      expect(source.getRow(5000)).toBeDefined();
      expect(source.getRow(9000)).toBeDefined();
    });
    And("最初のページを表示し直すと再要求される", () => {
      const before = requests().length;
      showPageAt(1000);
      expect(requests()).toHaveLength(before + 1);
    });
  });
});
