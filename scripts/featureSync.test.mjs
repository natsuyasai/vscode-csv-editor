import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkDirectory,
  compareFeatureWithTest,
  parseFeature,
  parseTestNames,
} from "./featureSync.mjs";

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "feature-sync"
);
const fixture = (name) => path.join(fixtures, name);

describe("parseFeature", () => {
  it("機能名とシナリオ名（アウトライン含む）を抽出する", () => {
    const text = [
      "# language: ja",
      "機能: 保存",
      "  シナリオ: 通常保存",
      "  シナリオアウトライン: 形式別保存",
    ].join("\n");
    assert.deepEqual(parseFeature(text), {
      featureName: "保存",
      scenarios: ["通常保存", "形式別保存"],
    });
  });

  it("コメント行は無視し、前後空白をトリムし、CRLFでも動く", () => {
    const text =
      "  # 機能: コメント\r\n機能:   名前  \r\n  # シナリオ: 無効\r\n  シナリオ:  有効 \r\n";
    assert.deepEqual(parseFeature(text), { featureName: "名前", scenarios: ["有効"] });
  });

  it("機能行が無ければ featureName は null", () => {
    assert.deepEqual(parseFeature("シナリオ: a"), { featureName: null, scenarios: ["a"] });
  });
});

describe("parseTestNames", () => {
  it("suite / test の文字列リテラル（\" ' `）を抽出する", () => {
    const text = [
      'suite("A", () => {',
      "  test('b', () => {});",
      "  test(`c`, () => {});",
      "});",
    ].join("\n");
    assert.deepEqual(parseTestNames(text), { suites: ["A"], tests: ["b", "c"] });
  });

  it("only / skip も名前として拾う", () => {
    const text =
      'suite.only("A", () => {\n test.skip("b", () => {});\n suite.skip("C", () => {});\n});';
    assert.deepEqual(parseTestNames(text), { suites: ["A", "C"], tests: ["b"] });
  });

  it("エスケープされた引用符を含む名前を扱える", () => {
    assert.deepEqual(parseTestNames('test("a\\"b", () => {});').tests, ['a"b']);
  });

  it("埋め込みを含むテンプレートリテラルは無視する", () => {
    assert.deepEqual(parseTestNames("test(`a${x}`, () => {});").tests, []);
  });

  it("mytest( など別の識別子は拾わない", () => {
    assert.deepEqual(parseTestNames('mytest("x", () => {}); obj.test("y", f);').tests, []);
  });
});

describe("compareFeatureWithTest", () => {
  const feature = { featureName: "F", scenarios: ["s1", "s2"] };

  it("一致すれば問題なし", () => {
    const names = { suites: ["F"], tests: ["s2", "s1"] };
    assert.deepEqual(compareFeatureWithTest(feature, names), []);
  });

  it("不足・余剰・機能名不一致をそれぞれ報告する", () => {
    const problems = compareFeatureWithTest(feature, { suites: ["X"], tests: ["s1", "zzz"] });
    assert.equal(problems.length, 3);
    assert.ok(problems.some((p) => p.includes("機能名") && p.includes("F") && p.includes("X")));
    assert.ok(problems.some((p) => p.includes("不足") && p.includes("s2")));
    assert.ok(problems.some((p) => p.includes("余剰") && p.includes("zzz")));
  });

  it("機能行が無い .feature は問題として報告する", () => {
    const problems = compareFeatureWithTest(
      { featureName: null, scenarios: [] },
      { suites: [], tests: [] }
    );
    assert.ok(problems.some((p) => p.includes("機能:")));
  });
});

describe("checkDirectory", () => {
  it("正常な対（サンプル1件）は問題なし", () => {
    const result = checkDirectory(fixture("ok"));
    assert.equal(result.checked, 1);
    assert.deepEqual(result.problems, []);
  });

  it("対の .test.ts が無ければパス付きで報告する", () => {
    const { problems } = checkDirectory(fixture("missing-test"));
    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes("sample.feature"));
    assert.ok(problems[0].includes("sample.test.ts"));
  });

  it(".feature にあるが test が無ければ不足として報告する", () => {
    const { problems } = checkDirectory(fixture("missing-scenario"));
    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes("不足") && problems[0].includes("二つ目"));
    assert.ok(problems[0].includes("sample.feature"));
  });

  it("test にあるが .feature に無ければ余剰として報告する", () => {
    const { problems } = checkDirectory(fixture("extra-test"));
    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes("余剰") && problems[0].includes("余分"));
  });

  it("機能名と suite 名の不一致を報告する", () => {
    const { problems } = checkDirectory(fixture("name-mismatch"));
    assert.equal(problems.length, 1);
    assert.ok(problems[0].includes("機能名"));
  });

  it(".feature を持たない既存 .test.ts は無視する", () => {
    assert.deepEqual(checkDirectory(fixture("ignored")), { checked: 0, problems: [] });
  });

  it("再帰的に探索する", () => {
    const result = checkDirectory(fixtures);
    assert.equal(result.checked, 5);
    assert.equal(result.problems.length, 4);
  });

  it("存在しないルートは 0 件として扱う", () => {
    assert.deepEqual(checkDirectory(fixture("nothing-here")), { checked: 0, problems: [] });
  });
});
