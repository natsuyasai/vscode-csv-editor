import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { LargeMessageToWebview } from "@message/largeMessages";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react/pure";
import { FakeLargeExtension } from "@/test-utils/fakeLargeExtension";
import { computeScrollScale, toDomOffset } from "../LargeTable/scrollScaling";
import { LargeApp } from "./LargeApp";
import { createLargeMessageHub, type LargeMessageHub } from "./largeMessageHub";
import { FILTER_DEBOUNCE_MS } from "./LargeQueryController";

const { webviewState } = vi.hoisted(() => {
  const state: { value: unknown } = { value: undefined };
  return { webviewState: state };
});

vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
    getState: () => webviewState.value,
    setState: (state: unknown) => {
      webviewState.value = state;
      return state;
    },
  },
}));

// 検索欄（VscodeTextfield は jsdom で操作できない）の代わり。実物の操作は Story（実ブラウザ）で確かめる
vi.mock("@/components/header/Search", () => ({
  Search: ({
    statusText,
    canNavigate,
    onSearch,
    onNext,
    onPrevious,
    onClose,
  }: {
    statusText?: string;
    canNavigate?: boolean;
    onSearch: (text: string) => void;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
  }) => (
    <div role="search">
      <input
        role="searchbox"
        aria-label="Search text input"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch(e.currentTarget.value);
          }
        }}
      />
      {statusText !== undefined && <div role="status">{statusText}</div>}
      <button
        type="button"
        aria-label="Previous search result"
        disabled={!canNavigate}
        onClick={onPrevious}
      />
      <button
        type="button"
        aria-label="Next search result"
        disabled={!canNavigate}
        onClick={onNext}
      />
      <button type="button" aria-label="Close search" onClick={onClose} />
    </div>
  ),
}));

const feature = await loadFeature("./LargeQuery.feature");

/** jsdom にはレイアウトが無いため、表示領域の高さを固定する（仮想スクロールの範囲計算に使われる） */
const VIEWPORT_HEIGHT = 600;
const HEADER_HEIGHT = 40;
const HEADER = ["id", "name"];
const MILLION = 1_000_000;

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let hub: LargeMessageHub;
  let ext: FakeLargeExtension;
  let scrollTop = 0;

  BeforeEachScenario(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: VIEWPORT_HEIGHT,
    });
    webviewState.value = undefined;
    scrollTop = 0;
  });

  AfterEachScenario(() => {
    cleanup();
    vi.useRealTimers();
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  const open = (indexing = false) => {
    hub = createLargeMessageHub();
    ext = new FakeLargeExtension({
      header: HEADER,
      rowCount: MILLION,
      deliver: (message: LargeMessageToWebview) => {
        act(() => {
          hub.dispatch(message);
        });
      },
    });
    render(
      <LargeApp
        init={{
          type: "large/init",
          header: HEADER,
          rowCount: MILLION,
          indexing,
          encoding: "UTF-8",
          restrictions: [],
        }}
        theme="light"
        messages={hub}
        postMessage={ext.post}
      />
    );
    // jsdom の scrollTop は保持されないため、値を保持する scrollTop を付ける
    Object.defineProperty(scroller(), "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    ext.respondRows();
  };

  const scroller = () => screen.getByRole("region", { name: "大容量CSVの表" });
  const cellOf = (n: number, column: string) => {
    const row = screen.getByRole("rowheader", { name: String(n) }).closest("tr");
    if (!row) throw new Error(`${String(n)}行目が無い`);
    return within(row).getAllByRole("gridcell")[HEADER.indexOf(column)];
  };
  const clickCell = (element: Element) => {
    act(() => {
      fireEvent.mouseDown(element);
      fireEvent.mouseUp(element);
      fireEvent.click(element);
    });
  };
  const sortButton = (column: string) =>
    screen.getByRole("button", { name: `列「${column}」をソート` });
  const columnHeader = (column: string) => screen.getByRole("columnheader", { name: column });
  const click = (element: Element) => {
    act(() => {
      fireEvent.click(element);
    });
  };
  const pressSort = (column: string) => click(sortButton(column));
  /** ソートを押し、拡張機能が完了を返す */
  const pressSortAndComplete = (column: string) => {
    pressSort(column);
    ext.complete("sort", ext.last("large/sort").jobId);
    ext.respondRows();
  };
  const searchbox = () => screen.getByRole("searchbox");
  const openSearchAndSubmit = (query: string) => {
    act(() => {
      fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    });
    fireEvent.change(searchbox(), { target: { value: query } });
    act(() => {
      fireEvent.keyDown(searchbox(), { key: "Enter" });
    });
  };
  const pressEnterInSearch = () => {
    act(() => {
      fireEvent.keyDown(searchbox(), { key: "Enter" });
    });
  };
  const filterRowToggle = () => screen.getByRole("button", { name: "フィルタ" });
  const filterInput = (column: string) =>
    screen.getByRole("textbox", { name: `列「${column}」のフィルター` });
  const typeFilter = (column: string, text: string) => {
    fireEvent.change(filterInput(column), { target: { value: text } });
  };

  Scenario("列のソートボタンを押すと昇順のソートが要求される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("列「name」のソートボタンを押す", () => pressSort("name"));
    Then("列「name」の昇順のソートが要求される", () => {
      expect(ext.sent("large/sort")).toEqual([
        { type: "large/sort", jobId: 1, column: 1, direction: "asc" },
      ]);
    });
    And("列「name」が昇順で並べ替えられていると表示される", () => {
      expect(columnHeader("name")).toHaveAttribute("aria-sort", "ascending");
      expect(columnHeader("name")).toHaveTextContent("🔼");
      expect(columnHeader("id")).toHaveAttribute("aria-sort", "none");
    });
  });

  Scenario("昇順のあとにもう一度押すと降順のソートが要求される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("列「name」のソートボタンを押して完了する", () => pressSortAndComplete("name"));
    And("列「name」のソートボタンをもう一度押す", () => pressSort("name"));
    Then("列「name」の降順のソートが要求される", () => {
      expect(ext.last("large/sort")).toEqual({
        type: "large/sort",
        jobId: 2,
        column: 1,
        direction: "desc",
      });
    });
    And("列「name」が降順で並べ替えられていると表示される", () => {
      expect(columnHeader("name")).toHaveAttribute("aria-sort", "descending");
      expect(columnHeader("name")).toHaveTextContent("🔽");
    });
  });

  Scenario("降順のあとにさらに押すとソートの解除が要求される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("列「name」のソートボタンを押して完了する", () => pressSortAndComplete("name"));
    And("列「name」のソートボタンをもう一度押して完了する", () => pressSortAndComplete("name"));
    And("列「name」のソートボタンをさらに押す", () => pressSort("name"));
    Then("列「name」のソートの解除が要求される", () => {
      expect(ext.last("large/sort")).toEqual({
        type: "large/sort",
        jobId: 3,
        column: 1,
        direction: null,
      });
    });
    And("列「name」の並べ替えの表示が無くなる", () => {
      expect(columnHeader("name")).toHaveAttribute("aria-sort", "none");
      expect(columnHeader("name")).not.toHaveTextContent("🔼");
      expect(columnHeader("name")).not.toHaveTextContent("🔽");
    });
  });

  Scenario(
    "フィルタ行に入力すると、入力が止まってから絞り込みが要求される",
    ({ Given, When, Then, And }) => {
      Given("100万行の大容量ファイルを開いている", () => open());
      When("フィルタ行を表示する", () => {
        vi.useFakeTimers();
        expect(screen.queryByRole("textbox", { name: "列「name」のフィルター" })).toBeNull();
        click(filterRowToggle());
      });
      And("列「name」のフィルタに「abc」を入力する", () => typeFilter("name", "abc"));
      Then("入力が止まるまでは絞り込みは要求されない", () => {
        act(() => {
          vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1);
        });
        expect(ext.sent("large/filter")).toEqual([]);
        expect(filterInput("name")).toHaveValue("abc");
      });
      And("入力が止まると列「name」が「abc」を含む行への絞り込みが要求される", () => {
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(ext.sent("large/filter")).toEqual([
          { type: "large/filter", jobId: 1, filters: [{ column: 1, text: "abc" }] },
        ]);
      });
    }
  );

  Scenario(
    "絞り込みが完了すると行数が減り、フィルタを空にすると解除が要求される",
    ({ Given, When, Then, And }) => {
      Given("100万行の大容量ファイルを開いている", () => open());
      When("フィルタ行を表示する", () => {
        vi.useFakeTimers();
        click(filterRowToggle());
      });
      And("列「name」のフィルタに「abc」を入力して絞り込みが完了する", () => {
        typeFilter("name", "abc");
        act(() => {
          vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
        });
        ext.complete("filter", ext.last("large/filter").jobId, 120);
      });
      Then("表の行数が絞り込み後の件数になる", () => {
        expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "121");
      });
      When("列「name」のフィルタを空にする", () => {
        typeFilter("name", "");
        act(() => {
          vi.advanceTimersByTime(FILTER_DEBOUNCE_MS);
        });
      });
      Then("絞り込みの解除が要求される", () => {
        expect(ext.last("large/filter")).toEqual({ type: "large/filter", jobId: 2, filters: [] });
      });
    }
  );

  Scenario(
    "Ctrl+F で検索を開いて Enter を押すと、選択中のセルの行から前方に探す",
    ({ Given, When, Then, And }) => {
      Given("100万行の大容量ファイルを開いている", () => open());
      When("2行目の「name」列のセルをクリックする", () => clickCell(cellOf(2, "name")));
      And("Ctrl+F で検索を開き「abc」を入力して Enter を押す", () => openSearchAndSubmit("abc"));
      Then("2行目から前方に「abc」を探す検索が要求される", () => {
        expect(ext.sent("large/search")).toEqual([
          { type: "large/search", jobId: 1, query: "abc", from: 1, direction: "forward" },
        ]);
      });
    }
  );

  Scenario(
    "検索で一致したセルが選択され、その行までスクロールされる",
    ({ Given, When, Then, And }) => {
      Given("100万行の大容量ファイルを開いている", () => open());
      When("Ctrl+F で検索を開き「abc」を入力して Enter を押す", () => openSearchAndSubmit("abc"));
      And("拡張機能が50万行目の「name」列に一致したと返す", () => {
        ext.found(ext.last("large/search").jobId, { row: 499_999, col: 1 });
      });
      Then("50万行目の「name」列のセルが選択される", () => {
        expect(cellOf(500_000, "name")).toHaveAttribute("aria-selected", "true");
      });
      And("表がその行の位置までスクロールされる", () => {
        const scale = computeScrollScale(MILLION, 40, VIEWPORT_HEIGHT - HEADER_HEIGHT);
        expect(scrollTop).toBeGreaterThan(0);
        expect(scrollTop).toBeCloseTo(toDomOffset(499_999 * 40, scale), 0);
      });
      And("一致した位置が検索欄に表示される", () => {
        expect(screen.getByRole("status")).toHaveTextContent("行 500000・列「name」");
      });
    }
  );

  Scenario("検索の次へ・前へは直前に一致したセルを基準に探す", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルで「abc」が50万行目の「name」列に一致している", () => {
      open();
      openSearchAndSubmit("abc");
      ext.found(ext.last("large/search").jobId, { row: 499_999, col: 1 });
    });
    When("検索の次へを押す", () => {
      click(screen.getByRole("button", { name: "Next search result" }));
    });
    Then("50万行目の「name」列を基準に前方へ探す検索が要求される", () => {
      expect(ext.last("large/search")).toMatchObject({
        from: 499_999,
        fromCol: 1,
        direction: "forward",
        query: "abc",
      });
    });
    When("拡張機能が50万1行目の「name」列に一致したと返す", () => {
      ext.found(ext.last("large/search").jobId, { row: 500_000, col: 1 });
    });
    And("検索の前へを押す", () => {
      click(screen.getByRole("button", { name: "Previous search result" }));
    });
    Then("50万1行目の「name」列を基準に後方へ探す検索が要求される", () => {
      expect(ext.last("large/search")).toMatchObject({
        from: 500_000,
        fromCol: 1,
        direction: "backward",
        query: "abc",
      });
    });
  });

  Scenario("一致が見つからないと「見つかりません」と表示される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("2行目の「name」列のセルをクリックする", () => clickCell(cellOf(2, "name")));
    And("Ctrl+F で検索を開き「zzz」を入力して Enter を押す", () => openSearchAndSubmit("zzz"));
    And("拡張機能が一致なしと返す", () => {
      ext.found(ext.last("large/search").jobId, null);
    });
    Then("「見つかりません」と表示される", () => {
      expect(screen.getByRole("status")).toHaveTextContent("見つかりません");
    });
    And("選択は2行目の「name」列のままである", () => {
      expect(cellOf(2, "name")).toHaveAttribute("aria-selected", "true");
    });
  });

  Scenario("実行中のジョブの進捗が表示され、キャンセルできる", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("列「name」のソートボタンを押す", () => pressSort("name"));
    And("拡張機能がソートの進捗45%を返す", () => {
      ext.progress("sort", ext.last("large/sort").jobId, 0.45);
    });
    Then("ソートの進捗45%が表示される", () => {
      expect(screen.getByRole("progressbar", { name: "ソート中" })).toHaveAttribute("value", "45");
      expect(screen.getByText("ソート中 45%")).toBeInTheDocument();
    });
    When("キャンセルを押す", () => {
      click(screen.getByRole("button", { name: "キャンセル" }));
    });
    Then("ソートのキャンセルが要求される", () => {
      expect(ext.sent("large/cancel")).toEqual([{ type: "large/cancel", jobId: 1 }]);
    });
    And("進捗の表示が消える", () => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
    And("列「name」の並べ替えの表示が無くなる", () => {
      expect(columnHeader("name")).toHaveAttribute("aria-sort", "none");
    });
  });

  Scenario("古いジョブの結果は無視される", ({ Given, When, Then, And }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    When("Ctrl+F で検索を開き「abc」を入力して Enter を押す", () => openSearchAndSubmit("abc"));
    And("検索を開き直さずにもう一度 Enter を押す", () => pressEnterInSearch());
    And("拡張機能が最初の検索の結果として10行目の「name」列に一致したと返す", () => {
      expect(ext.sent("large/search").map((m) => m.jobId)).toEqual([1, 2]);
      ext.found(1, { row: 9, col: 1 });
    });
    Then("10行目の「name」列のセルは選択されない", () => {
      expect(cellOf(10, "name")).toHaveAttribute("aria-selected", "false");
    });
    And("検索中と表示されたままである", () => {
      expect(screen.getByRole("status")).toHaveTextContent("検索中");
    });
  });

  Scenario(
    "ソートを適用中は編集しても並べ直されない旨の注記が出て、再適用できる",
    ({ Given, When, Then }) => {
      Given("100万行の大容量ファイルを開いている", () => open());
      When("列「name」のソートボタンを押して完了する", () => pressSortAndComplete("name"));
      Then("編集しても並び替え・絞り込みは再実行されないという注記が表示される", () => {
        expect(
          screen.getByText(/編集しても並び替え・絞り込みは再実行されません/)
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "再適用" })).toBeEnabled();
      });
      When("再適用を押す", () => {
        click(screen.getByRole("button", { name: "再適用" }));
      });
      Then("列「name」の昇順のソートが再度要求される", () => {
        expect(ext.sent("large/sort")).toEqual([
          { type: "large/sort", jobId: 1, column: 1, direction: "asc" },
          { type: "large/sort", jobId: 2, column: 1, direction: "asc" },
        ]);
      });
    }
  );

  Scenario("ソートもフィルタも適用していないときは注記を出さない", ({ Given, Then }) => {
    Given("100万行の大容量ファイルを開いている", () => open());
    Then("編集しても並び替え・絞り込みは再実行されないという注記は表示されない", () => {
      expect(screen.queryByText(/編集しても並び替え・絞り込みは再実行されません/)).toBeNull();
      expect(screen.queryByRole("button", { name: "再適用" })).toBeNull();
    });
  });

  Scenario(
    "行インデックスを作成している間は検索・ソート・フィルタを使えない",
    ({ Given, When, Then }) => {
      Given("行インデックスを作成中の大容量ファイルを開いている", () => open(true));
      Then("列「name」のソートボタン、フィルタ、検索のボタンが使えない", () => {
        expect(sortButton("name")).toBeDisabled();
        expect(filterRowToggle()).toBeDisabled();
        expect(screen.getByRole("button", { name: "検索" })).toBeDisabled();
      });
      When("Ctrl+F を押す", () => {
        act(() => {
          fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
        });
      });
      Then("検索欄は開かない", () => {
        expect(screen.queryByRole("searchbox")).toBeNull();
      });
      When("行インデックスの作成が完了する", () => {
        act(() => {
          hub.dispatch({ type: "large/progress", kind: "index", ratio: 1 });
        });
      });
      Then("列「name」のソートボタン、フィルタ、検索のボタンが使える", () => {
        expect(sortButton("name")).toBeEnabled();
        expect(filterRowToggle()).toBeEnabled();
        expect(screen.getByRole("button", { name: "検索" })).toBeEnabled();
      });
    }
  );
});
