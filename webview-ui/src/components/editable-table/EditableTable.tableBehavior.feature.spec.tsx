import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react/pure";
import { useEffect, useState } from "react";
import { EditableTable } from "./EditableTable";

/**
 * ライブラリ（@tanstack/react-table / react-dnd）更新前後で表の振る舞いが変わらないことを確かめる
 * キャラクタリゼーションテスト。コンポーネントの外から観測できる表示だけを検証する。
 */

// ステップをまたいで vi.fn の記録は消えるため、保存された CSV は配列で記録する
const recorder = vi.hoisted(() => ({
  saved: [] as string[][][],
  setExternalCsv: null as ((csv: string[][]) => void) | null,
}));

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: (p: { onToggleFilters?: () => void; onClearFilters?: () => void }) => (
    <div>
      <button onClick={p.onToggleFilters}>toggle filters</button>
      <button onClick={p.onClearFilters}>clear filters</button>
    </div>
  ),
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

const feature = await loadFeature("./EditableTable.tableBehavior.feature");

/** .feature 中の "a,b\n1,2" 形式（\n はバックスラッシュ文字のまま）を CSV 配列にする */
const parseCsv = (text: string): string[][] => text.split("\\n").map((line) => line.split(","));
const toCsvText = (csv: string[][]) => csv.map((row) => row.join(",")).join("\\n");
const splitList = (text: string) => (text === "" ? [] : text.split(","));

/** 編集結果（setCSVArray）を反映し、外部からのデータ更新も受け付けるラッパー */
const Wrapper = ({ initialCsv }: { initialCsv: string[][] }) => {
  const [csv, setCsv] = useState(initialCsv);
  useEffect(() => {
    recorder.setExternalCsv = setCsv;
    return () => {
      recorder.setExternalCsv = null;
    };
  }, []);
  const handleSetCsv = (next: string[][]) => {
    recorder.saved.push(next);
    setCsv(next);
  };
  return (
    <EditableTable csvArray={csv} theme="light" setCSVArray={handleSetCsv} onApply={vi.fn()} />
  );
};

const setupDomSize = () => {
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: () => {} });
};

const dataRows = () => Array.from(document.querySelectorAll<HTMLElement>("tbody tr"));
const dataCellsOf = (tr: HTMLElement) =>
  Array.from(tr.querySelectorAll<HTMLElement>('td[data-col-index] > div[role="button"]')).filter(
    (cell) => cell.parentElement?.getAttribute("data-col-index") !== "-1"
  );
const rowByCellValue = (value: string) => {
  const row = dataRows().find((tr) => dataCellsOf(tr).some((cell) => cell.textContent === value));
  if (!row) throw new Error(`row ${value} not found`);
  return row;
};
const headerThs = () =>
  Array.from(document.querySelectorAll<HTMLElement>("thead tr:first-child th")).slice(1);
const headerTexts = () =>
  headerThs().map((th) => (th.textContent ?? "").replace(/ [🔼🔽]/u, "").trim());
const headerThOf = (name: string) => {
  const th = headerThs().find((h) => (h.textContent ?? "").replace(/ [🔼🔽]/u, "").trim() === name);
  if (!th) throw new Error(`header ${name} not found`);
  return th;
};
const headerButtonOf = (name: string) => headerThOf(name).querySelector<HTMLElement>("[tabindex]")!;
const columnIndexOf = (name: string) => headerThs().indexOf(headerThOf(name));
const filterInputs = () => screen.queryAllByPlaceholderText<HTMLInputElement>("フィルター...");

const toggleSortOnce = (name: string) => {
  // ヘッダーはフォーカス→クリック(選択)→Enter でソートされる
  const header = headerButtonOf(name);
  fireEvent.focus(header);
  fireEvent.click(header);
  fireEvent.keyDown(header, { key: "Enter" });
};

const dragAndDrop = (source: HTMLElement, target: HTMLElement) => {
  const dataTransfer = {
    setData: () => {},
    getData: () => "",
    setDragImage: () => {},
    effectAllowed: "all",
    dropEffect: "move",
    types: [],
  };
  fireEvent.dragStart(source, { dataTransfer });
  fireEvent.dragEnter(target, { dataTransfer });
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });
  fireEvent.dragEnd(source, { dataTransfer });
};

describeFeature(feature, ({ Scenario, ScenarioOutline, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    setupDomSize();
    recorder.saved = [];
  });

  AfterEachScenario(() => {
    cleanup();
  });

  const givenTable = (csvText: string) => {
    render(<Wrapper initialCsv={parseCsv(csvText)} />);
  };
  const expectHeaders = (expected: string) => {
    expect(headerTexts()).toEqual(splitList(expected));
  };
  const expectNameOrder = (expected: string) => {
    expect(dataRows().map((tr) => dataCellsOf(tr)[0]?.textContent)).toEqual(splitList(expected));
  };
  const expectRowCells = (cellValue: string, expected: string) => {
    expect(dataCellsOf(rowByCellValue(cellValue)).map((c) => c.textContent)).toEqual(
      expected.split(",")
    );
  };
  const expectRowIndexes = (expected: string) => {
    expect(
      dataRows().map(
        (tr) => tr.querySelector<HTMLElement>('td:first-child div[role="button"]')?.textContent
      )
    ).toEqual(splitList(expected));
  };
  const expectSortIndicator = (name: string, expected: string) => {
    const text = headerThOf(name).textContent ?? "";
    if (expected === "なし") {
      expect(text).not.toMatch(/[🔼🔽]/u);
    } else {
      expect(text).toContain(` ${expected}`);
    }
  };
  const toggleFilters = () => {
    fireEvent.click(screen.getByText("toggle filters"));
  };
  const inputFilter = (name: string, value: string) => {
    fireEvent.change(filterInputs()[columnIndexOf(name)], { target: { value } });
  };
  const updateData = (csvText: string) => {
    act(() => {
      recorder.setExternalCsv?.(parseCsv(csvText));
    });
  };
  const dragHeader = (source: string, target: string) => {
    act(() => {
      dragAndDrop(headerButtonOf(source), headerButtonOf(target));
    });
  };
  const widenColumn = (name: string, delta: number) => {
    const handle = headerThOf(name).querySelector('[class*="headerResizeHandle"]')!;
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: delta });
      fireEvent.mouseUp(document);
    });
  };
  const expectColumnWidth = (name: string, expected: string) => {
    const colIdx = columnIndexOf(name);
    expect(headerThOf(name).style.width).toBe(expected);
    for (const tr of dataRows()) {
      expect(tr.querySelector<HTMLElement>(`td[data-col-index="${colIdx}"]`)!.style.width).toBe(
        expected
      );
    }
  };

  Scenario("ヘッダーとセルの値・行番号が表示される", ({ Given, Then, And }) => {
    Given('"name,num\\na,3\\nb,1\\nc," の表を表示している', () =>
      givenTable("name,num\\na,3\\nb,1\\nc,")
    );
    Then('ヘッダーは "name,num" の順に表示される', () => expectHeaders("name,num"));
    And('表示されている行の name 列は "a,b,c" の順である', () => expectNameOrder("a,b,c"));
    And('"a" 行のセルは "a,3" である', () => expectRowCells("a", "a,3"));
    And('"c" 行のセルは "c," である', () => expectRowCells("c", "c,"));
    And('行番号は "1,2,3" の順である', () => expectRowIndexes("1,2,3"));
  });

  ScenarioOutline(
    "ヘッダーで Enter を押すたびに昇順・降順・なしの順でソートが切り替わる",
    ({ Given, When, Then, And }, vars) => {
      Given('"name,num\\na,3\\nb,1\\nc,2" の表を表示している', () =>
        givenTable("name,num\\na,3\\nb,1\\nc,2")
      );
      When('"num" 列のヘッダーで <回数> 回ソートを切り替える', () => {
        const count = Number(vars["回数"]);
        for (let i = 0; i < count; i++) toggleSortOnce("num");
      });
      Then('表示されている行の name 列は "<表示順>" の順である', () =>
        expectNameOrder(String(vars["表示順"]))
      );
      And('"num" 列のヘッダーのソート表示は "<表示>" である', () =>
        expectSortIndicator("num", String(vars["表示"]))
      );
      And('行番号は "<行番号>" の順である', () => expectRowIndexes(String(vars["行番号"])));
    }
  );

  Scenario("別の列でソートすると前の列のソートは解除される", ({ Given, When, Then, And }) => {
    Given('"name,num\\na,3\\nb,1\\nc,2" の表を表示している', () =>
      givenTable("name,num\\na,3\\nb,1\\nc,2")
    );
    When('"num" 列のヘッダーで 1 回ソートを切り替える', () => toggleSortOnce("num"));
    And('"name" 列のヘッダーで 2 回ソートを切り替える', () => {
      toggleSortOnce("name");
      toggleSortOnce("name");
    });
    Then('表示されている行の name 列は "c,b,a" の順である', () => expectNameOrder("c,b,a"));
    And('"name" 列のヘッダーのソート表示は "🔽" である', () => expectSortIndicator("name", "🔽"));
    And('"num" 列のヘッダーのソート表示は "なし" である', () => expectSortIndicator("num", "なし"));
  });

  Scenario("桁数の異なる数字の列は文字列の辞書順で並ぶ", ({ Given, When, Then }) => {
    Given('"name,num\\na,3\\nb,12\\nc,1\\nd,2" の表を表示している', () =>
      givenTable("name,num\\na,3\\nb,12\\nc,1\\nd,2")
    );
    When('"num" 列のヘッダーで 1 回ソートを切り替える', () => toggleSortOnce("num"));
    Then('表示されている行の name 列は "c,b,d,a" の順である', () => expectNameOrder("c,b,d,a"));
  });

  Scenario(
    "フィルター行の表示を切り替えるとデータ列ごとに入力欄が出し入れされる",
    ({ Given, When, Then }) => {
      Given('"name,num\\na,3\\nb,1\\nc,2" の表を表示している', () =>
        givenTable("name,num\\na,3\\nb,1\\nc,2")
      );
      When("フィルター行の表示を切り替える", () => toggleFilters());
      Then("フィルター入力欄が 2 個表示される", () => expect(filterInputs()).toHaveLength(2));
      When("もう一度フィルター行の表示を切り替える", () => toggleFilters());
      Then("フィルター入力欄が 0 個表示される", () => expect(filterInputs()).toHaveLength(0));
    }
  );

  const fruitsCsv = "name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2";

  Scenario("フィルターは部分一致かつ大文字小文字を区別しない", ({ Given, When, Then, And }) => {
    Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
      givenTable(fruitsCsv)
    );
    When("フィルター行の表示を切り替える", () => toggleFilters());
    And('"name" 列のフィルターに "AP" を入力する', () => inputFilter("name", "AP"));
    Then('表示されている行の name 列は "Apple,apricot" の順である', () =>
      expectNameOrder("Apple,apricot")
    );
  });

  Scenario(
    "複数列のフィルターはすべての条件を満たす行だけを表示する",
    ({ Given, When, Then, And }) => {
      Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
        givenTable(fruitsCsv)
      );
      When("フィルター行の表示を切り替える", () => toggleFilters());
      And('"name" 列のフィルターに "ap" を入力する', () => inputFilter("name", "ap"));
      And('"num" 列のフィルターに "2" を入力する', () => inputFilter("num", "2"));
      Then('表示されている行の name 列は "apricot" の順である', () => expectNameOrder("apricot"));
    }
  );

  Scenario("フィルターの入力を空にすると全行が表示される", ({ Given, When, Then, And }) => {
    Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
      givenTable(fruitsCsv)
    );
    When("フィルター行の表示を切り替える", () => toggleFilters());
    And('"name" 列のフィルターに "ap" を入力する', () => inputFilter("name", "ap"));
    And('"name" 列のフィルターに "" を入力する', () => inputFilter("name", ""));
    Then('表示されている行の name 列は "Apple,banana,cherry,apricot" の順である', () =>
      expectNameOrder("Apple,banana,cherry,apricot")
    );
  });

  Scenario(
    "フィルター行を隠してもフィルターは適用されたままになる",
    ({ Given, When, Then, And }) => {
      Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
        givenTable(fruitsCsv)
      );
      When("フィルター行の表示を切り替える", () => toggleFilters());
      And('"name" 列のフィルターに "ap" を入力する', () => inputFilter("name", "ap"));
      And("もう一度フィルター行の表示を切り替える", () => toggleFilters());
      Then('表示されている行の name 列は "Apple,apricot" の順である', () =>
        expectNameOrder("Apple,apricot")
      );
    }
  );

  Scenario("フィルターのクリアで全行が表示される", ({ Given, When, Then, And }) => {
    Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
      givenTable(fruitsCsv)
    );
    When("フィルター行の表示を切り替える", () => toggleFilters());
    And('"name" 列のフィルターに "ap" を入力する', () => inputFilter("name", "ap"));
    And("フィルターをクリアする", () => {
      fireEvent.click(screen.getByText("clear filters"));
    });
    Then('表示されている行の name 列は "Apple,banana,cherry,apricot" の順である', () =>
      expectNameOrder("Apple,banana,cherry,apricot")
    );
  });

  Scenario("データが更新されてもフィルターは維持される", ({ Given, When, Then, And }) => {
    Given('"name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2" の表を表示している', () =>
      givenTable(fruitsCsv)
    );
    When("フィルター行の表示を切り替える", () => toggleFilters());
    And('"name" 列のフィルターに "ap" を入力する', () => inputFilter("name", "ap"));
    And(
      '表のデータが "name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2\\ngrape,5" に更新される',
      () => updateData("name,num\\nApple,3\\nbanana,12\\ncherry,1\\napricot,2\\ngrape,5")
    );
    Then('表示されている行の name 列は "Apple,apricot,grape" の順である', () =>
      expectNameOrder("Apple,apricot,grape")
    );
    And('"name" 列のフィルター入力欄の値は "ap" である', () =>
      expect(filterInputs()[columnIndexOf("name")].value).toBe("ap")
    );
  });

  Scenario("データが更新されてもソートは維持される", ({ Given, When, Then, And }) => {
    Given('"name,num\\na,3\\nb,1\\nc,2" の表を表示している', () =>
      givenTable("name,num\\na,3\\nb,1\\nc,2")
    );
    When('"num" 列のヘッダーで 1 回ソートを切り替える', () => toggleSortOnce("num"));
    And('表のデータが "name,num\\na,3\\nb,1\\nc,2\\nd,0" に更新される', () =>
      updateData("name,num\\na,3\\nb,1\\nc,2\\nd,0")
    );
    Then('表示されている行の name 列は "d,b,c,a" の順である', () => expectNameOrder("d,b,c,a"));
    And('"num" 列のヘッダーのソート表示は "🔼" である', () => expectSortIndicator("num", "🔼"));
  });

  Scenario("列ヘッダーをドラッグ&ドロップすると列が並び替わる", ({ Given, When, Then, And }) => {
    Given('"name,num,memo\\na,3,x\\nb,1,y" の表を表示している', () =>
      givenTable("name,num,memo\\na,3,x\\nb,1,y")
    );
    When('"memo" 列のヘッダーを "name" 列のヘッダーへドラッグ&ドロップする', () =>
      dragHeader("memo", "name")
    );
    Then('ヘッダーは "memo,name,num" の順に表示される', () => expectHeaders("memo,name,num"));
    And('"a" 行のセルは "x,a,3" である', () => expectRowCells("a", "x,a,3"));
    And('最後に保存された CSV は "memo,name,num\\nx,a,3\\ny,b,1" である', () =>
      expect(toCsvText(recorder.saved[recorder.saved.length - 1])).toBe(
        "memo,name,num\\nx,a,3\\ny,b,1"
      )
    );
  });

  Scenario(
    "列幅を広げるとヘッダーとセルの幅が変わり既定幅は 150px である",
    ({ Given, When, Then, And }) => {
      Given('"name,num\\na,3\\nb,1" の表を表示している', () => givenTable("name,num\\na,3\\nb,1"));
      When('"num" 列の幅を 100px 広げる', () => widenColumn("num", 100));
      Then('"num" 列のヘッダーとセルの幅は "250px" である', () =>
        expectColumnWidth("num", "250px")
      );
      And('"name" 列のヘッダーとセルの幅は "150px" である', () =>
        expectColumnWidth("name", "150px")
      );
    }
  );

  Scenario(
    "幅を変えた列を並び替えても幅はその列に付いたままになる",
    ({ Given, When, Then, And }) => {
      Given('"name,num\\na,3\\nb,1" の表を表示している', () => givenTable("name,num\\na,3\\nb,1"));
      When('"num" 列の幅を 100px 広げる', () => widenColumn("num", 100));
      And('"num" 列のヘッダーを "name" 列のヘッダーへドラッグ&ドロップする', () =>
        dragHeader("num", "name")
      );
      Then('ヘッダーは "num,name" の順に表示される', () => expectHeaders("num,name"));
      And('"num" 列のヘッダーとセルの幅は "250px" である', () => expectColumnWidth("num", "250px"));
      And('"name" 列のヘッダーとセルの幅は "150px" である', () =>
        expectColumnWidth("name", "150px")
      );
    }
  );
});
