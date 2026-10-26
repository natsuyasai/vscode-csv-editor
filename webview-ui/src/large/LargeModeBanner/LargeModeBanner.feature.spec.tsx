import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react/pure";
import { LargeModeBanner } from "./LargeModeBanner";

const feature = await loadFeature("./LargeModeBanner.feature");

const RESTRICTIONS = ["列の挿入・削除", "行・列のドラッグ&ドロップによる並び替え", "オートフィル"];

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  AfterEachScenario(() => {
    cleanup();
  });

  const toggle = () => screen.getByRole("button", { name: "制限している機能" });

  Scenario("機能制限中であることが表示される", ({ Given, Then, And }) => {
    Given("大容量モードで開いている", () => {
      render(
        <LargeModeBanner restrictions={RESTRICTIONS} encoding="Shift_JIS" indexingRatio={null} />
      );
    });
    Then("大容量モードで一部の機能を制限していると表示される", () => {
      expect(screen.getByText("大容量モード（一部機能制限中）")).toBeInTheDocument();
    });
    And("文字コードが表示される", () => {
      expect(screen.getByText("文字コード: Shift_JIS")).toBeInTheDocument();
    });
  });

  Scenario("制限している機能の一覧を確認できる", ({ Given, When, Then }) => {
    Given("大容量モードで開いている", () => {
      render(<LargeModeBanner restrictions={RESTRICTIONS} encoding="UTF-8" indexingRatio={null} />);
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
    When("制限している機能の一覧を開く", () => {
      fireEvent.click(toggle());
    });
    Then("制限している機能がすべて表示される", () => {
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      const list = screen.getByRole("list", { name: "制限している機能" });
      expect(toggle()).toHaveAttribute("aria-controls", list.id);
      expect(
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent)
      ).toEqual(RESTRICTIONS);
    });
    When("一覧を閉じる", () => {
      fireEvent.click(toggle());
    });
    Then("一覧は表示されない", () => {
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  Scenario("インデックス作成中は進捗が表示される", ({ Given, When, Then }) => {
    let rerender: (ui: React.ReactNode) => void;
    Given("行インデックスを作成中の大容量ファイルを開いている", () => {
      ({ rerender } = render(
        <LargeModeBanner restrictions={RESTRICTIONS} encoding="UTF-8" indexingRatio={0.42} />
      ));
    });
    Then("作成の進捗が表示される", () => {
      const progress = screen.getByRole("progressbar", { name: "行インデックスを作成中" });
      expect(progress).toHaveAttribute("value", "42");
      expect(progress).toHaveAttribute("max", "100");
      expect(screen.getByText("行インデックスを作成中 42%")).toBeInTheDocument();
    });
    When("作成が完了する", () => {
      rerender(
        <LargeModeBanner restrictions={RESTRICTIONS} encoding="UTF-8" indexingRatio={null} />
      );
    });
    Then("進捗は表示されなくなる", () => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
