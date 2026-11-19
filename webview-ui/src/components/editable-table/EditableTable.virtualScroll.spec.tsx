import { act, fireEvent, render } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * @tanstack/react-virtual 更新前後で仮想スクロールの描画結果が変わらないことを確かめる。
 * 既定の行の高さは 40px、表示領域の高さは 600px（約15行）、overscan は 10 行。
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

const ROW_COUNT = 200;
const ROW_HEIGHT = 40;
const bigCsv = [
  ["name", "num"],
  ...Array.from({ length: ROW_COUNT }, (_, i) => [`row${i}`, String(i)]),
];

beforeEach(() => {
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    value: ROW_COUNT * ROW_HEIGHT,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

const setup = () => {
  render(<EditableTable csvArray={bigCsv} theme="light" setCSVArray={vi.fn()} onApply={vi.fn()} />);
};

const renderedRows = () => Array.from(document.querySelectorAll<HTMLElement>("tbody tr"));
const nameOf = (tr: HTMLElement) =>
  tr.querySelector('td[data-col-index="0"] > div[role="button"]')?.textContent;

describe("EditableTable 仮想スクロール", () => {
  it("全行ではなく表示領域付近の行だけを描画する", () => {
    setup();
    const rows = renderedRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(ROW_COUNT);
    expect(nameOf(rows[0])).toBe("row0");
    expect(document.body.textContent).not.toContain(`row${ROW_COUNT - 1}`);
  });

  it("tbody の高さは全行の高さの合計になる", () => {
    setup();
    expect(document.querySelector<HTMLElement>("tbody")!.style.height).toBe(
      `${ROW_COUNT * ROW_HEIGHT}px`
    );
  });

  it("各行は表示位置×行の高さの位置へ配置される", () => {
    setup();
    renderedRows().forEach((tr, i) => {
      expect(tr.dataset.viewRowIndex).toBe(String(i));
      expect(tr.style.transform).toBe(`translateY(${i * ROW_HEIGHT}px)`);
      expect(tr.style.height).toBe(`${ROW_HEIGHT}px`);
    });
  });

  it("スクロールするとその位置付近の行が描画される", () => {
    setup();
    const container = document
      .querySelector<HTMLElement>("tbody")!
      .closest("table")!.parentElement!;
    act(() => {
      container.scrollTop = 100 * ROW_HEIGHT;
      fireEvent.scroll(container);
    });
    const names = renderedRows().map(nameOf);
    expect(names).toContain("row100");
    expect(names).not.toContain("row0");
    const row100 = renderedRows().find((tr) => nameOf(tr) === "row100")!;
    expect(row100.style.transform).toBe(`translateY(${100 * ROW_HEIGHT}px)`);
  });
});
