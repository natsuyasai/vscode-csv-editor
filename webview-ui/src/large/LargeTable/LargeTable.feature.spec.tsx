import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react/pure";
import { InMemoryRowSource } from "@/large/rowSource/InMemoryRowSource";
import type { RowSource } from "@/large/rowSource/RowSource";
import { GeneratedRowSource, PendingRowSource } from "@/test-utils/largeRowSources";
import { LargeTable } from "./LargeTable";

const feature = await loadFeature("./LargeTable.feature");

const MILLION = 1_000_000;

/** jsdom にはレイアウトが無いため、表示領域の高さを固定する（仮想スクロールの範囲計算に使われる） */
const VIEWPORT_HEIGHT = 600;

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  BeforeEachScenario(() => {
    // 仮想スクローラは clientHeight で表示領域を測る
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: VIEWPORT_HEIGHT,
    });
  });

  AfterEachScenario(() => {
    cleanup();
    // prototype に足したものを消して Element.prototype の定義に戻す
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  const show = (source: RowSource) => render(<LargeTable source={source} theme="light" />);

  const scroller = () => screen.getByRole("region", { name: "大容量CSVの表" });

  const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]).queryAllByRole("row");

  const busyRows = () => bodyRows().filter((row) => row.getAttribute("aria-busy") === "true");

  Scenario("列名と行番号が表示される", ({ Given, Then, And }) => {
    Given("3行の大容量ファイルを表示している", () => {
      show(
        new InMemoryRowSource(
          ["id", "name"],
          [
            ["1", "Alice"],
            ["2", "Bob"],
            ["3", "Carol"],
          ]
        )
      );
    });
    Then("列名が表示される", () => {
      expect(screen.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    });
    And("各行に1始まりの行番号と内容が表示される", () => {
      const rows = bodyRows();
      expect(rows).toHaveLength(3);
      expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("1");
      expect(within(rows[2]).getByRole("rowheader")).toHaveTextContent("3");
      expect(within(rows[1]).getByText("Bob")).toBeInTheDocument();
    });
  });

  Scenario("表示範囲の行だけを要求する", ({ Given, Then, And }) => {
    let source: GeneratedRowSource;
    Given("100万行の大容量ファイルを表示している", () => {
      source = new GeneratedRowSource(["id", "name"], MILLION);
      show(source);
    });
    Then("先頭付近の表示範囲の行だけが要求される", () => {
      const last = source.requests[source.requests.length - 1];
      expect(last[0]).toBe(0);
      expect(last[1]).toBeGreaterThan(0);
      expect(last[1]).toBeLessThan(100);
    });
    And("ファイル全体は要求されない", () => {
      expect(source.requests.every(([start, end]) => end - start < 100)).toBe(true);
      expect(bodyRows().length).toBeLessThan(100);
    });
  });

  Scenario("末尾までスクロールすると最終行が表示される", ({ Given, When, Then, And }) => {
    let source: GeneratedRowSource;
    Given("100万行の大容量ファイルを表示している", () => {
      source = new GeneratedRowSource(["id", "name"], MILLION);
      show(source);
    });
    When("スクロールバーで末尾まで移動する", () => {
      const element = scroller();
      // DOM 上の高さは上限に収まっている（実際の上限の検証は Storybook の実ブラウザで行う）
      const spacer = screen.getAllByRole("rowgroup")[1];
      const domHeight = parseFloat(spacer.style.height);
      expect(domHeight).toBeLessThan(MILLION * 40);
      Object.defineProperty(element, "scrollTop", {
        configurable: true,
        value: domHeight - (VIEWPORT_HEIGHT - 40),
      });
      act(() => {
        fireEvent.scroll(element);
      });
    });
    Then("最終行の行番号が表示される", () => {
      expect(screen.getByRole("rowheader", { name: String(MILLION) })).toBeInTheDocument();
      expect(screen.getByText(`name-${String(MILLION)}`)).toBeInTheDocument();
    });
    And("末尾付近の表示範囲の行が要求される", () => {
      const last = source.requests[source.requests.length - 1];
      expect(last[1]).toBe(MILLION);
      expect(last[0]).toBeGreaterThan(MILLION - 100);
    });
  });

  Scenario("未取得の行はプレースホルダーで表示される", ({ Given, When, Then }) => {
    let source: PendingRowSource;
    Given("行がまだ届いていない大容量ファイルを表示している", () => {
      source = new PendingRowSource(["id", "name"], MILLION);
      show(source);
    });
    Then("表示範囲の行は読み込み中として表示される", () => {
      expect(busyRows().length).toBeGreaterThan(0);
      expect(busyRows()).toHaveLength(bodyRows().length);
      expect(within(busyRows()[0]).getByRole("rowheader")).toHaveTextContent("1");
    });
    When("要求した行が届く", () => {
      act(() => {
        source.loadRequested();
      });
    });
    Then("行の内容が表示され読み込み中の表示は消える", () => {
      expect(busyRows()).toHaveLength(0);
      expect(screen.getByText("name-1")).toBeInTheDocument();
    });
  });
});
