// .feature（日本語Gherkin）と mocha テスト（suite/test）の名前の整合を検査する純粋ロジック。
import fs from "node:fs";
import path from "node:path";

const FEATURE_LINE = /^\s*機能\s*:\s*(.*?)\s*$/;
const SCENARIO_LINE = /^\s*シナリオ(?:アウトライン)?\s*:\s*(.*?)\s*$/;

/**
 * .feature のテキストから機能名とシナリオ名を抽出する。
 * @param {string} text
 * @returns {{ featureName: string | null, scenarios: string[] }}
 */
export function parseFeature(text) {
  let featureName = null;
  const scenarios = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) continue;
    const feature = FEATURE_LINE.exec(line);
    if (feature) {
      featureName ??= feature[1];
      continue;
    }
    const scenario = SCENARIO_LINE.exec(line);
    if (scenario) scenarios.push(scenario[1]);
  }
  return { featureName, scenarios };
}

const DOUBLE_QUOTED = /"((?:\\.|[^"\\\n])*)"/;
const SINGLE_QUOTED = /'((?:\\.|[^'\\\n])*)'/;
// 埋め込み（${...}）を含むテンプレートリテラルにはマッチしない
const TEMPLATE = /`((?:\\.|[^`\\$]|\$(?!\{))*)`/;
const STRING_LITERAL = [DOUBLE_QUOTED, SINGLE_QUOTED, TEMPLATE].map((r) => r.source).join("|");
const TEST_CALL = new RegExp(
  String.raw`(?<![\w.$])(suite|test)(?:\.(?:only|skip))?\s*\(\s*(?:${STRING_LITERAL})`,
  "g"
);

/**
 * .test.ts のテキストから suite / test の第1引数（文字列リテラル）を抽出する。
 * @param {string} text
 * @returns {{ suites: string[], tests: string[] }}
 */
export function parseTestNames(text) {
  const suites = [];
  const tests = [];
  for (const match of text.matchAll(TEST_CALL)) {
    const raw = match[2] ?? match[3] ?? match[4];
    const name = raw.replace(/\\(.)/g, "$1");
    (match[1] === "suite" ? suites : tests).push(name);
  }
  return { suites, tests };
}

/**
 * パース済みの .feature とテスト名を照合し、問題の説明を返す。
 * @param {{ featureName: string | null, scenarios: string[] }} feature
 * @param {{ suites: string[], tests: string[] }} names
 * @returns {string[]}
 */
export function compareFeatureWithTest(feature, names) {
  if (feature.featureName === null) {
    return ["「機能:」行が見つかりません"];
  }
  const problems = [];
  if (!names.suites.includes(feature.featureName)) {
    const actual = names.suites.length > 0 ? names.suites.map((s) => `"${s}"`).join(", ") : "なし";
    problems.push(
      `機能名と suite 名が一致しません: 機能 "${feature.featureName}" / suite ${actual}`
    );
  }
  for (const scenario of feature.scenarios) {
    if (!names.tests.includes(scenario)) {
      problems.push(`不足: .feature にあるが test がありません: "${scenario}"`);
    }
  }
  for (const test of names.tests) {
    if (!feature.scenarios.includes(test)) {
      problems.push(`余剰: test にあるが .feature にありません: "${test}"`);
    }
  }
  return problems;
}

/** @param {string} dir @returns {string[]} */
function findFeatureFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findFeatureFiles(full));
    else if (entry.name.endsWith(".feature")) found.push(full);
  }
  return found.sort();
}

/**
 * ルート以下の .feature を再帰的に検査する。.feature を持たない .test.ts は対象外。
 * @param {string} root
 * @returns {{ checked: number, problems: string[] }}
 */
export function checkDirectory(root) {
  const featurePaths = findFeatureFiles(root);
  const problems = [];
  for (const featurePath of featurePaths) {
    const testPath = featurePath.replace(/\.feature$/, ".test.ts");
    const label = path.relative(process.cwd(), featurePath);
    if (!fs.existsSync(testPath)) {
      problems.push(`${label}: 対の ${path.relative(process.cwd(), testPath)} がありません`);
      continue;
    }
    const feature = parseFeature(fs.readFileSync(featurePath, "utf8"));
    const names = parseTestNames(fs.readFileSync(testPath, "utf8"));
    for (const problem of compareFeatureWithTest(feature, names)) {
      problems.push(`${label}: ${problem}`);
    }
  }
  return { checked: featurePaths.length, problems };
}
