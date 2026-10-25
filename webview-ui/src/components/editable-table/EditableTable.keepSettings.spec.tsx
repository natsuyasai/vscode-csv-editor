import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { CellAlignment } from "@/types";
import { EditableTable } from "./EditableTable";

/**
 * 列・行の挿入/削除でも、列幅・文字寄せ・行の高さが同じ列・行に付いたままになる (issue #86)
 */

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: (props: {
    onAlignmentChange?: (alignment: CellAlignment) => void;
    onInsertColumn?: () => void;
    onInsertRow?: () => void;
  }) => (
    <div>
      <button
        onClick={() => props.onAlignmentChange?.({ vertical: "center", horizontal: "right" })}
      >
        align-right
      </button>
      <button onClick={() => props.onInsertColumn?.()}>insert-column</button>
      <button onClick={() => props.onInsertRow?.()}>insert-row</button>
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
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

const dataRows = () => Array.from(document.querySelectorAll<HTMLElement>("tbody tr"));
const rowByName = (name: string) => {
  const row = dataRows().find((tr) =>
    Array.from(tr.querySelectorAll('td[data-col-index] > div[role="button"]')).some(
      (cell) => cell.textContent === name
    )
  );
  if (!row) throw new Error(`row ${name} not found`);
  return row;
};
const tdOf = (rowName: string, colIdx: number) =>
  rowByName(rowName).querySelector<HTMLElement>(`td[data-col-index="${colIdx}"]`)!;
const rowIndexCellOf = (rowName: string) =>
  rowByName(rowName).querySelector<HTMLElement>('td:first-child div[role="button"]')!;
const headerOf = (text: string) => screen.getByText(text).closest<HTMLElement>("[tabindex]")!;
const selectHeader = (text: string) => {
  const header = headerOf(text);
  fireEvent.focus(header);
  fireEvent.click(header);
};
const drag = (handle: Element, axis: "x" | "y", delta: number) => {
  fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(document, axis === "x" ? { clientX: delta } : { clientY: delta });
  fireEvent.mouseUp(document);
};
const widthOf = (td: HTMLElement) => td.style.width;
const press = (key: string) =>
  fireEvent.keyDown(document.body, { key, shiftKey: true, ctrlKey: true });

describe("EditableTable 設定の追従 (#86)", () => {
  it("列幅: 左に列を挿入しても、広げた列の幅がその列に付いたままになる", () => {
    render(<Wrapper />);
    const handle = headerOf("num").closest("th")!.querySelector('[class*="headerResizeHandle"]')!;
    act(() => drag(handle, "x", 100));
    expect(widthOf(tdOf("a", 1))).toBe("250px");

    selectHeader("name");
    fireEvent.click(screen.getByText("insert-column")); // name の左に挿入

    expect(widthOf(tdOf("a", 2))).toBe("250px"); // num は右へずれて幅を維持
    expect(widthOf(tdOf("a", 0))).toBe("150px"); // 新しい列は既定幅
    expect(widthOf(tdOf("a", 1))).toBe("150px"); // name も既定幅
  });

  it("文字寄せ: 左に列を挿入しても、右寄せの列がその列に付いたままになる", () => {
    render(<Wrapper />);
    selectHeader("num");
    fireEvent.click(screen.getByText("align-right"));
    expect(tdOf("a", 1).style.textAlign).toBe("right");

    selectHeader("name");
    fireEvent.click(screen.getByText("insert-column"));

    expect(tdOf("a", 2).style.textAlign).toBe("right");
    expect(tdOf("a", 1).style.textAlign).toBe("left");
    expect(tdOf("a", 0).style.textAlign).toBe("left");
  });

  it("列削除: 左の列を削除しても、広げた列の幅と右寄せがその列に付いたままになる", () => {
    render(<Wrapper />);
    const handle = headerOf("num").closest("th")!.querySelector('[class*="headerResizeHandle"]')!;
    act(() => drag(handle, "x", 100));
    selectHeader("num");
    fireEvent.click(screen.getByText("align-right"));

    selectHeader("name");
    press("D"); // 列削除

    // name 列が消え、先頭の num 列(値 "3" の列)に幅と右寄せが残る
    expect(widthOf(tdOf("3", 0))).toBe("250px");
    expect(tdOf("3", 0).style.textAlign).toBe("right");
  });

  it("行の高さ: 上に行を挿入しても、高さを変えた行がその行に付いたままになる", () => {
    render(<Wrapper />);
    const handle = rowByName("b").querySelector('[class*="_resizeHandle"]')!;
    act(() => drag(handle, "y", 60));
    expect(rowByName("b").style.height).toBe("100px");

    fireEvent.click(rowIndexCellOf("a"));
    fireEvent.click(screen.getByText("insert-row")); // a の上に挿入

    expect(rowByName("b").style.height).toBe("100px");
    expect(rowByName("a").style.height).toBe("40px");
    expect(rowByName("c").style.height).toBe("40px");
  });

  it("行削除: 上の行を削除しても、高さを変えた行がその行に付いたままになる", () => {
    render(<Wrapper />);
    const handle = rowByName("b").querySelector('[class*="_resizeHandle"]')!;
    act(() => drag(handle, "y", 60));

    fireEvent.click(rowIndexCellOf("a"));
    press("D"); // 行削除

    expect(rowByName("b").style.height).toBe("100px");
    expect(rowByName("c").style.height).toBe("40px");
  });
});
