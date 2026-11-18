import { fireEvent, render } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * ソートの並びが @tanstack/react-table v8 の既定(sortingFn: "auto")と同じであることのテスト。
 * v8 は自動判定の標本に先頭10行を除いた行を使っていたため、行数で比較方法が変わる。
 * - 10行以下: 大文字小文字を区別する文字列の辞書順
 * - 11行以上で11行目以降に数字を含む値がある: 数字部分を数値として比べる自然順
 */

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: () => null,
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

beforeEach(() => {
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: () => {} });
});

const renderTable = (csv: string[][]) =>
  render(<EditableTable csvArray={csv} theme="light" setCSVArray={vi.fn()} onApply={vi.fn()} />);

const headerButtonOf = (name: string) => {
  const th = Array.from(document.querySelectorAll<HTMLElement>("thead tr:first-child th")).find(
    (h) => (h.textContent ?? "").replace(/ [🔼🔽]/u, "").trim() === name
  );
  if (!th) throw new Error(`header ${name} not found`);
  return th.querySelector<HTMLElement>("[tabindex]")!;
};

const toggleSortOnce = (name: string) => {
  // ヘッダーはフォーカス→クリック(選択)→Enter でソートされる
  const header = headerButtonOf(name);
  fireEvent.focus(header);
  fireEvent.click(header);
  fireEvent.keyDown(header, { key: "Enter" });
};

const columnValues = (colIndex: number) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      `tbody tr td[data-col-index="${colIndex}"] > div[role="button"]`
    )
  ).map((cell) => cell.textContent);

describe("EditableTable のソート(v8 互換)", () => {
  it("10行以下では大文字小文字を区別する辞書順で並ぶ", () => {
    renderTable([["name"], ["b"], ["B"], ["a"], ["A"]]);

    toggleSortOnce("name");

    expect(columnValues(0)).toEqual(["A", "B", "a", "b"]);
  });

  it("11行以上で11行目以降に数字を含む値があれば数字部分を数値として比べる", () => {
    const nums = ["3", "12", "1", "2", "30", "4", "100", "5", "6", "7", "8", "9"];
    renderTable([["num"], ...nums.map((n) => [n])]);

    toggleSortOnce("num");

    expect(columnValues(0)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "12",
      "30",
      "100",
    ]);
  });
});
