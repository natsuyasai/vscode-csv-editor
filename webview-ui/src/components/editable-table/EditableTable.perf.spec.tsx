import { act, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { EditableTable } from "./EditableTable";

/**
 * 大きなCSV(1万行×20列)での1セル編集の処理時間の目安 (issue #90)
 * 結果は標準出力に記録する。閾値は環境差で落ちない程度に緩くしている。
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

const ROWS = 10_000;
const COLS = 20;

const createCsv = (): string[][] => {
  const header = Array.from({ length: COLS }, (_, c) => `h${c}`);
  const rows = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => `r${r}c${c}`)
  );
  return [header, ...rows];
};

const Wrapper = ({ initial }: { initial: string[][] }) => {
  const [csv, setCsv] = useState(initial);
  return <EditableTable csvArray={csv} theme="light" setCSVArray={setCsv} onApply={vi.fn()} />;
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

describe("EditableTable 性能の目安(1万行x20列)", () => {
  it("1セル編集の処理時間を計測する", () => {
    const initial = createCsv();
    const renderStart = performance.now();
    render(<Wrapper initial={initial} />);
    const renderMs = performance.now() - renderStart;

    const editOnce = (value: string) => {
      const cell = document.querySelector<HTMLElement>(
        'tbody tr td[data-col-index="0"] div[role="button"]'
      )!;
      fireEvent.click(cell);
      fireEvent.click(cell);
      const textarea = document.querySelector<HTMLTextAreaElement>("tbody textarea")!;
      fireEvent.change(textarea, { target: { value } });
      const start = performance.now();
      act(() => {
        fireEvent.keyDown(textarea, { key: "Enter" });
      });
      return performance.now() - start;
    };

    const samples = [editOnce("edited1"), editOnce("edited2"), editOnce("edited3")];
    const median = [...samples].sort((a, b) => a - b)[1];
    console.log(
      `[perf #90] 初期描画=${renderMs.toFixed(0)}ms 編集(3回)=${samples
        .map((s) => s.toFixed(0))
        .join("/")}ms 中央値=${median.toFixed(0)}ms`
    );

    expect(document.body.textContent).toContain("edited3");
    expect(median).toBeLessThan(5000);
  }, 120_000);
});
