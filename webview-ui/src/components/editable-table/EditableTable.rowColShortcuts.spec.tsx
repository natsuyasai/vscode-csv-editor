import { fireEvent, render, screen } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * 行・列操作とフィルター切替のショートカット (issue #87)
 * Ctrl/Cmd+Shift+H: フィルター表示切替 / D: 削除 / I,B: 行を上,下に挿入 / L,R: 列を左,右に挿入
 */

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: () => <div />,
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

const csv = [
  ["name", "num"],
  ["a", "3"],
  ["b", "1"],
  ["c", "2"],
];

beforeEach(() => {
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

const setup = (csvArray: string[][] = csv) => {
  const setCSVArray = vi.fn();
  render(
    <EditableTable csvArray={csvArray} theme="light" setCSVArray={setCSVArray} onApply={vi.fn()} />
  );
  return { setCSVArray };
};

const dataRows = () => Array.from(document.querySelectorAll<HTMLElement>("tbody tr"));
const dataCellOf = (tr: HTMLElement, colIdx: number) =>
  tr.querySelector<HTMLElement>(`td:nth-child(${colIdx + 2}) > div[role="button"]`)!;
const rowByName = (name: string) => {
  const row = dataRows().find((tr) => dataCellOf(tr, 0)?.textContent === name);
  if (!row) throw new Error(`row ${name} not found`);
  return row;
};
const cellOf = (rowName: string, colIdx: number) => dataCellOf(rowByName(rowName), colIdx);
const rowIndexCellOf = (rowName: string) =>
  rowByName(rowName).querySelector<HTMLElement>('td:first-child div[role="button"]')!;
const headerOf = (text: string) => screen.getByText(text).closest<HTMLElement>("[tabindex]")!;

const selectCell = (rowName: string, colIdx: number) => {
  fireEvent.mouseDown(cellOf(rowName, colIdx));
  fireEvent.mouseUp(cellOf(rowName, colIdx));
};
const selectHeader = (text: string) => {
  const header = headerOf(text);
  fireEvent.focus(header);
  fireEvent.click(header);
};
const sortByNum = () => {
  selectHeader("num");
  fireEvent.keyDown(headerOf("num"), { key: "Enter" });
};
const press = (key: string, init: KeyboardEventInit = { ctrlKey: true }) =>
  fireEvent.keyDown(document.body, { key, shiftKey: true, ...init });

describe("EditableTable 行・列ショートカット (#87)", () => {
  describe("Ctrl+Shift+H フィルター切替", () => {
    it("押すたびにフィルター行が表示/非表示になる(Ctrl/Cmd両対応)", () => {
      setup();
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      press("H");
      expect(screen.queryAllByRole("textbox").length).toBeGreaterThan(0);
      press("H", { metaKey: true });
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });
  });

  describe("行の挿入/削除", () => {
    it("セルを選択して Ctrl+Shift+I で選択行の上に挿入する", () => {
      const { setCSVArray } = setup();
      selectCell("b", 0);
      press("I");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["", ""],
        ["b", "1"],
        ["c", "2"],
      ]);
    });

    it("セルを選択して Cmd+Shift+B で選択行の下に挿入する", () => {
      const { setCSVArray } = setup();
      selectCell("b", 0);
      press("B", { metaKey: true });
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["b", "1"],
        ["", ""],
        ["c", "2"],
      ]);
    });

    it("行番号で行選択して Ctrl+Shift+D で行を削除する", () => {
      const { setCSVArray } = setup();
      fireEvent.click(rowIndexCellOf("b"));
      press("D");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["c", "2"],
      ]);
    });

    it("セル選択中の Ctrl+Shift+D はそのセルの行を削除する", () => {
      const { setCSVArray } = setup();
      selectCell("c", 1);
      press("D");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["b", "1"],
      ]);
    });

    it("ソート中はデータ位置で操作される(表示上のcを削除するとデータ上のcが消える)", () => {
      const { setCSVArray } = setup();
      sortByNum(); // 表示順: b, c, a
      selectCell("c", 0);
      press("D");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["b", "1"],
      ]);
    });

    it("ソート中の挿入(下)は選択行のデータ位置の直後に入る", () => {
      const { setCSVArray } = setup();
      sortByNum(); // 表示順: b(data1), c(data2), a(data0)
      selectCell("a", 0); // data0
      press("B");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["", ""],
        ["b", "1"],
        ["c", "2"],
      ]);
    });

    it("対象が選択されていない場合は何もしない", () => {
      const { setCSVArray } = setup();
      press("D");
      press("I");
      press("B");
      expect(setCSVArray).not.toHaveBeenCalled();
    });
  });

  describe("列の挿入/削除", () => {
    it("列ヘッダーを選択して Ctrl+Shift+L で左に列を挿入する", () => {
      const { setCSVArray } = setup();
      selectHeader("num");
      press("L");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "new column", "num"],
        ["a", "", "3"],
        ["b", "", "1"],
        ["c", "", "2"],
      ]);
    });

    it("列ヘッダーを選択して Ctrl+Shift+R で右に列を挿入する", () => {
      const { setCSVArray } = setup();
      selectHeader("name");
      press("R");
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "new column", "num"],
        ["a", "", "3"],
        ["b", "", "1"],
        ["c", "", "2"],
      ]);
    });

    it("列ヘッダーを選択して Ctrl+Shift+D で列を削除する", () => {
      const { setCSVArray } = setup();
      selectHeader("name");
      press("D");
      expect(setCSVArray).toHaveBeenLastCalledWith([["num"], ["3"], ["1"], ["2"]]);
    });

    it("セル選択中の Cmd+Shift+L はそのセルの列の左に挿入する", () => {
      const { setCSVArray } = setup();
      selectCell("a", 1);
      press("L", { metaKey: true });
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "new column", "num"],
        ["a", "", "3"],
        ["b", "", "1"],
        ["c", "", "2"],
      ]);
    });
  });

  describe("入力欄では無効", () => {
    it("入力欄での Ctrl+Shift+D/I/B/L/R は処理されない", () => {
      const { setCSVArray } = setup();
      selectCell("b", 0);
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      for (const key of ["D", "I", "B", "L", "R"]) {
        expect(fireEvent.keyDown(input, { key, ctrlKey: true, shiftKey: true })).toBe(true);
      }
      expect(setCSVArray).not.toHaveBeenCalled();
      input.remove();
    });
  });
});
