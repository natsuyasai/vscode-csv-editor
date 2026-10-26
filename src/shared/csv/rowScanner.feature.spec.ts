import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { parseCsv } from "@/utilities/csvFormat";
import { scanRows, type RowBoundaries } from "./rowScanner";

const feature = await loadFeature("./rowScanner.feature");

const BOM = "﻿";

/** .featureの例の表に書かれたエスケープ表記（バックスラッシュ+n / +r）を実際の改行文字へ変換する */
function unescapeText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
}

/** "0,2,3" 形式の数値の並びを配列にする（空文字列は空配列） */
function parseOffsets(value: string): number[] {
  return value === "" ? [] : value.split(",").map(Number);
}

const DELIMITER_BY_NAME = { LF: "\n", CRLF: "\r\n", CR: "\r" } as const;

/** 書式ごとのCSVテキストと、期待する各行の開始位置 */
const SAMPLES: Record<string, { text: string; starts: number[] }> = {
  "LF・末尾改行あり": { text: "a,b\nc,d\n", starts: [0, 4] },
  "CRLF・末尾改行なし": { text: "a,b\r\nc,d", starts: [0, 5] },
  "BOM付き": { text: `${BOM}a,b\nc,d\n`, starts: [1, 5] },
  "クォート内に改行を含む": { text: '"a\nb","c\r\nd"\r\ne,"f\r"\r\ng\r\n', starts: [0, 14, 22] },
  "CRのみの改行": { text: "a,b\rc,d\r", starts: [0, 4] },
};

function parseOk(text: string): string[][] {
  const result = parseCsv(text);
  if (!result.ok) {
    throw new Error(`パースに失敗しました: ${result.error.message}`);
  }
  return result.rows;
}

/** 各行の「次の行の開始位置」までのテキストをパースすると、ちょうどその行までのレコードになることを確かめる */
function expectEachRowEndsAtRecordBoundary(text: string, boundaries: RowBoundaries) {
  boundaries.rows.forEach((row, index) => {
    expect(parseOk(text.slice(0, row.next))).toHaveLength(index + 1);
  });
}

describeFeature(feature, ({ ScenarioOutline, Scenario }) => {
  let text = "";
  let expectedStarts: number[] = [];
  let boundaries: RowBoundaries;

  const starts = () => boundaries.rows.map((row) => row.start);

  ScenarioOutline("書式の違いに関わらず行の開始位置を検出する", ({ Given, When, Then }, vars) => {
    Given('"<書式>" のCSVテキストがある', () => {
      const sample = SAMPLES[String(vars["書式"])];
      text = sample.text;
      expectedStarts = sample.starts;
    });
    When("行境界を検出する", () => {
      boundaries = scanRows(text);
    });
    Then("各行の開始位置が csv-parse のレコード分割と一致する", () => {
      expect(starts()).toEqual(expectedStarts);
      expect(boundaries.rows).toHaveLength(parseOk(text).length);
      expectEachRowEndsAtRecordBoundary(text, boundaries);
    });
  });

  ScenarioOutline("境界となるテキストの行数と開始位置", ({ Given, When, Then, And }, vars) => {
    Given('テキスト "<テキスト>" がある', () => {
      text = unescapeText(String(vars["テキスト"]));
    });
    When("行境界を検出する", () => {
      boundaries = scanRows(text);
    });
    Then("行数は <行数> になる", () => {
      expect(boundaries.rows).toHaveLength(Number(vars["行数"]));
    });
    And('各行の開始位置は "<開始位置>" になる', () => {
      expect(starts()).toEqual(parseOffsets(String(vars["開始位置"])));
    });
    And("行数は csv-parse のレコード数と一致する", () => {
      expect(boundaries.rows).toHaveLength(parseOk(text).length);
      expectEachRowEndsAtRecordBoundary(text, boundaries);
    });
  });

  Scenario("最初の改行と異なる種類の改行はセルの内容として扱う", ({ Given, When, Then, And }) => {
    Given('テキスト "a,b\\r\\nc,d\\ne,f" がある', () => {
      text = "a,b\r\nc,d\ne,f";
    });
    When("行境界を検出する", () => {
      boundaries = scanRows(text);
    });
    Then('行区切りは "CRLF" として検出される', () => {
      expect(boundaries.delimiter).toBe(DELIMITER_BY_NAME.CRLF);
    });
    And("行数は 2 になる", () => {
      expect(boundaries.rows).toHaveLength(2);
    });
    And('各行の開始位置は "0,5" になる', () => {
      expect(starts()).toEqual([0, 5]);
    });
    And("行数は csv-parse のレコード数と一致する", () => {
      expect(boundaries.rows).toHaveLength(parseOk(text).length);
      expectEachRowEndsAtRecordBoundary(text, boundaries);
    });
  });

  Scenario("行の終了位置は行区切りを含まない", ({ Given, When, Then, And }) => {
    Given('テキスト "a,b\\r\\nc,d\\r\\n" がある', () => {
      text = "a,b\r\nc,d\r\n";
    });
    When("行境界を検出する", () => {
      boundaries = scanRows(text);
    });
    Then('各行の終了位置は "3,8" になる', () => {
      expect(boundaries.rows.map((row) => row.end)).toEqual([3, 8]);
    });
    And('各行の次の行の開始位置は "5,10" になる', () => {
      expect(boundaries.rows.map((row) => row.next)).toEqual([5, 10]);
    });
  });
});
