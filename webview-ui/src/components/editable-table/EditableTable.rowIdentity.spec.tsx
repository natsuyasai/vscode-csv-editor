import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { EditableTable } from "./EditableTable";

/**
 * 行IDが安定しているため、行の追加・削除・編集で他の行のDOMが作り直されない (issue #90)
 */

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: (props: { onInsertRow?: () => void; onDeleteRow?: () => void }) => (
    <div>
      <button onClick={() => props.onInsertRow?.()}>insert-row</button>
      <button onClick={() => props.onDeleteRow?.()}>delete-row</button>
    </div>
  ),
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

const initialCsv = [
  ["name", "num"],
  ["a", "3"],
  ["b", "1"],
  ["c", "2"],
];

const Wrapper = () => {
  const [csv, setCsv] = useState(initialCsv);
  return <EditableTable csvArray={csv} theme="light" setCSVArray={setCsv} onApply={vi.fn()} />;
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

const rowByName = (name: string) => {
  const row = Array.from(document.querySelectorAll<HTMLElement>("tbody tr")).find((tr) =>
    Array.from(tr.querySelectorAll('td[data-col-index] > div[role="button"]')).some(
      (cell) => cell.textContent === name
    )
  );
  if (!row) throw new Error(`row ${name} not found`);
  return row;
};
const rowIndexCellOf = (name: string) =>
  rowByName(name).querySelector<HTMLElement>('td:first-child div[role="button"]')!;

describe("EditableTable 行の同一性", () => {
  it("先頭に行を挿入しても既存行のDOMが再利用される", () => {
    render(<Wrapper />);
    const rowA = rowByName("a");
    const rowC = rowByName("c");

    fireEvent.click(rowIndexCellOf("a"));
    fireEvent.click(screen.getByText("insert-row"));

    expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(rowByName("a")).toBe(rowA);
    expect(rowByName("c")).toBe(rowC);
  });

  it("先頭の行を削除しても残りの行のDOMが再利用される", () => {
    render(<Wrapper />);
    const rowB = rowByName("b");
    const rowC = rowByName("c");

    fireEvent.click(rowIndexCellOf("a"));
    fireEvent.click(screen.getByText("delete-row"));

    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(rowByName("b")).toBe(rowB);
    expect(rowByName("c")).toBe(rowC);
  });

  it("セルを編集しても他の行のDOMが再利用される", () => {
    render(<Wrapper />);
    const rowB = rowByName("b");
    const cell = rowByName("a").querySelector<HTMLElement>(
      'td[data-col-index="0"] div[role="button"]'
    )!;

    fireEvent.click(cell);
    fireEvent.click(cell);
    const textarea = document.querySelector<HTMLTextAreaElement>("tbody textarea")!;
    fireEvent.change(textarea, { target: { value: "A2" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(rowByName("A2")).toBeTruthy();
    expect(rowByName("b")).toBe(rowB);
  });
});
