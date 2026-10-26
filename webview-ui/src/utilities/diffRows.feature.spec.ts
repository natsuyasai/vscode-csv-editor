import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { RowOp } from "@shared/csv/ops";
import { diffRows } from "./diffRows";

const feature = await loadFeature("./diffRows.feature");

describeFeature(feature, ({ Scenario }) => {
  let prev: string[][] = [];
  let next: string[][] = [];
  let ops: RowOp[] = [];

  const expectOp = (start: number, deleteCount: number, rowCount: number) => {
    expect(ops[0].start).toBe(start);
    expect(ops[0].deleteCount).toBe(deleteCount);
    expect(ops[0].rows).toHaveLength(rowCount);
  };

  const createTable = () => [
    ["id", "name"],
    ["1", "Alice"],
    ["2", "Bob"],
  ];

  Scenario("1セルの編集は1行の置換になる", ({ Given, When, Then, And }) => {
    Given("3行の表がある", () => {
      prev = createTable();
    });
    When("2行目のセルだけを編集した新しい行に差し替える", () => {
      next = [prev[0], ["1", "Alicia"], prev[2]];
      ops = diffRows(prev, next);
    });
    Then("操作は 1 件になる", () => {
      expect(ops).toHaveLength(1);
    });
    And("操作は 1 行目から 1 行を 1 行へ置換する", () => {
      expectOp(1, 1, 1);
    });
  });

  Scenario("行の挿入は削除0件の置換になる", ({ Given, When, Then, And }) => {
    Given("3行の表がある", () => {
      prev = createTable();
    });
    When("2行目と3行目の間に新しい行を挿入する", () => {
      next = [prev[0], prev[1], ["9", "Carol"], prev[2]];
      ops = diffRows(prev, next);
    });
    Then("操作は 1 件になる", () => {
      expect(ops).toHaveLength(1);
    });
    And("操作は 2 行目から 0 行を 1 行へ置換する", () => {
      expectOp(2, 0, 1);
    });
  });

  Scenario("行の削除は追加0件の置換になる", ({ Given, When, Then, And }) => {
    Given("3行の表がある", () => {
      prev = createTable();
    });
    When("2行目を削除する", () => {
      next = [prev[0], prev[2]];
      ops = diffRows(prev, next);
    });
    Then("操作は 1 件になる", () => {
      expect(ops).toHaveLength(1);
    });
    And("操作は 1 行目から 1 行を 0 行へ置換する", () => {
      expectOp(1, 1, 0);
    });
  });

  Scenario("変更がなければ操作は作られない", ({ Given, When, Then }) => {
    Given("3行の表がある", () => {
      prev = createTable();
    });
    When("何も変更しない", () => {
      next = [...prev];
      ops = diffRows(prev, next);
    });
    Then("操作は 0 件になる", () => {
      expect(ops).toHaveLength(0);
    });
  });

  Scenario("列の挿入は全行の置換になる", ({ Given, When, Then, And }) => {
    Given("3行の表がある", () => {
      prev = createTable();
    });
    When("全行に新しい列を挿入する", () => {
      next = prev.map((row) => [row[0], "", row[1]]);
      ops = diffRows(prev, next);
    });
    Then("操作は 1 件になる", () => {
      expect(ops).toHaveLength(1);
    });
    And("操作は 0 行目から 3 行を 3 行へ置換する", () => {
      expectOp(0, 3, 3);
    });
  });

  Scenario("先頭と末尾の一致範囲が重なっても正しい範囲になる", ({ Given, When, Then, And }) => {
    Given("行 a, b, a の表がある", () => {
      const a = ["a"];
      prev = [a, ["b"], a];
    });
    When("行 a だけの表に変更する", () => {
      next = [prev[0]];
      ops = diffRows(prev, next);
    });
    Then("操作は 1 件になる", () => {
      expect(ops).toHaveLength(1);
    });
    And("操作は 1 行目から 2 行を 0 行へ置換する", () => {
      expectOp(1, 2, 0);
    });
  });
});
