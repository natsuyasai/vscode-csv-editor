import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { parseCsv, type ParseCsvResult } from "./csvFormat";

const feature = await loadFeature("./csvFormat.feature");

const BOM = String.fromCharCode(0xfeff);

/** .featureの例の表に書かれたエスケープ表記（バックスラッシュ+n / +r）を実際の改行文字へ変換する */
function unescapeText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
}

const EOL_BY_NAME = { LF: "\n", CRLF: "\r\n" } as const;

function expectOk(result: ParseCsvResult) {
  if (!result.ok) {
    throw new Error(`パースに失敗しました: ${result.error.message}`);
  }
  return result;
}

describeFeature(feature, ({ ScenarioOutline, Scenario }) => {
  let text = "";
  let result: ParseCsvResult;

  ScenarioOutline("改行コードを検出する", ({ Given, When, Then, And }, vars) => {
    Given('テキスト "<テキスト>" がある', () => {
      text = unescapeText(String(vars["テキスト"]));
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then('改行コードは "<改行コード>" として検出される', () => {
      const name = vars["改行コード"] as keyof typeof EOL_BY_NAME;
      expect(expectOk(result).format.eol).toBe(EOL_BY_NAME[name]);
    });
    And("表は <行数> 行になる", () => {
      expect(expectOk(result).rows).toHaveLength(Number(vars["行数"]));
    });
  });

  Scenario(
    "改行コードが混在する場合は最初の改行だけが行区切りになる",
    ({ Given, When, Then, And }) => {
      Given('テキスト "a,b\\r\\nc,d\\ne,f" がある', () => {
        text = "a,b\r\nc,d\ne,f";
      });
      When("CSVを読み込む", () => {
        result = parseCsv(text);
      });
      Then('改行コードは "CRLF" として検出される', () => {
        expect(expectOk(result).format.eol).toBe("\r\n");
      });
      And("表は 2 行になる", () => {
        expect(expectOk(result).rows).toHaveLength(2);
      });
      And('2行目2列目のセルは "d\\ne" になる', () => {
        expect(expectOk(result).rows[1][1]).toBe("d\ne");
      });
    }
  );

  Scenario("セル内の改行は行区切りとして扱わない", ({ Given, When, Then, And }) => {
    Given('テキスト "\\"a\\nb\\",c\\r\\nd,e\\r\\n" がある', () => {
      text = '"a\nb",c\r\nd,e\r\n';
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then('改行コードは "CRLF" として検出される', () => {
      expect(expectOk(result).format.eol).toBe("\r\n");
    });
    And('1行1列目のセルは "a\\nb" になる', () => {
      expect(expectOk(result).rows[0][0]).toBe("a\nb");
    });
    And("表は 2 行になる", () => {
      expect(expectOk(result).rows).toHaveLength(2);
    });
  });

  Scenario(
    "BOM付きファイルはBOMをセル値に含めず書式として保持する",
    ({ Given, When, Then, And }) => {
      Given('BOM付きのテキスト "name,age\\nAlice,30\\n" がある', () => {
        text = `${BOM}name,age\nAlice,30\n`;
      });
      When("CSVを読み込む", () => {
        result = parseCsv(text);
      });
      Then("BOMありとして検出される", () => {
        expect(expectOk(result).format.bom).toBe(true);
      });
      And('1行1列目のセルは "name" になる', () => {
        expect(expectOk(result).rows[0][0]).toBe("name");
      });
    }
  );

  ScenarioOutline("末尾の改行の有無を検出する", ({ Given, When, Then }, vars) => {
    Given('テキスト "<テキスト>" がある', () => {
      text = unescapeText(String(vars["テキスト"]));
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then("末尾改行は <有無> と検出される", () => {
      expect(expectOk(result).format.trailingNewline).toBe(vars["有無"] === "あり");
    });
  });

  Scenario("列数が揃わない行は空セルで補われる", ({ Given, When, Then, And }) => {
    Given('テキスト "a,b,c\\nd\\ne,f\\n" がある', () => {
      text = "a,b,c\nd\ne,f\n";
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then("すべての行が 3 列になる", () => {
      for (const row of expectOk(result).rows) {
        expect(row).toHaveLength(3);
      }
    });
    And('2行目は "d", "", "" になる', () => {
      expect(expectOk(result).rows[1]).toEqual(["d", "", ""]);
    });
  });

  Scenario("空のテキストは既定の書式の空の表になる", ({ Given, When, Then, And }) => {
    Given('テキスト "" がある', () => {
      text = "";
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then("表は 0 行になる", () => {
      expect(expectOk(result).rows).toHaveLength(0);
    });
    And('改行コードは "LF" として検出される', () => {
      expect(expectOk(result).format.eol).toBe("\n");
    });
    And("末尾改行は あり と検出される", () => {
      expect(expectOk(result).format.trailingNewline).toBe(true);
    });
  });

  Scenario("クォートが閉じていないCSVは例外ではなくエラーとして返る", ({ Given, When, Then }) => {
    Given('テキスト "a,\\"b\\n" がある', () => {
      text = 'a,"b\n';
    });
    When("CSVを読み込む", () => {
      result = parseCsv(text);
    });
    Then("読み込みは失敗しエラー情報が返る", () => {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBeTruthy();
      }
    });
  });
});
