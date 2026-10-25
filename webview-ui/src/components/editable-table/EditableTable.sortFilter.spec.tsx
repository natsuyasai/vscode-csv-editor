import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * ソート・フィルター適用中の表示位置/データ位置の整合性テスト (issue #79)
 *
 * sortCsv(データ順):            num昇順ソート後の表示順:
 *   [0] a, 3                      view0 b, 1 (data1)
 *   [1] b, 1                      view1 c, 2 (data2)
 *   [2] c, 2                      view2 a, 3 (data0)
 */

type HeaderProps = {
  onInsertRow?: () => void;
  onDeleteRow?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onToggleFilters?: () => void;
};
type PortalProps = {
  searchProps: { onSearch: (t: string) => void; onNext: () => void };
  rowContextMenuProps: { onSelect: (v: string) => void };
};

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: (p: HeaderProps) => (
    <div>
      <button onClick={p.onInsertRow}>insert row</button>
      <button onClick={p.onDeleteRow}>delete row</button>
      <button onClick={p.onCopy}>copy</button>
      <button onClick={p.onPaste}>paste</button>
      <button onClick={p.onToggleFilters}>toggle filters</button>
    </div>
  ),
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: (p: PortalProps) => (
    <div>
      <button onClick={() => p.searchProps.onSearch("3")}>search 3</button>
      <button onClick={() => p.searchProps.onSearch("2")}>search 2</button>
      <button onClick={() => p.searchProps.onNext()}>search next</button>
      <button onClick={() => p.rowContextMenuProps.onSelect("insertRowAbove")}>
        ctx insert above
      </button>
      <button onClick={() => p.rowContextMenuProps.onSelect("deleteRow")}>ctx delete</button>
    </div>
  ),
}));

const sortCsv = [
  ["name", "num"],
  ["a", "3"],
  ["b", "1"],
  ["c", "2"],
];

// フィルター用: num列に "2" を含む行 → b(data1), d(data3) だけが表示される（データ位置が不連続）
const filterCsv = [
  ["name", "num"],
  ["a", "3"],
  ["b", "12"],
  ["c", "1"],
  ["d", "2"],
];

const writeText = vi.fn();
const readText = vi.fn();
const scrollToMock = vi.fn();

beforeEach(() => {
  // jsdomでは要素サイズが0になり仮想スクロールが行を描画しないため、サイズを与える
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollToMock,
  });
  scrollToMock.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText, readText },
  });
  writeText.mockReset().mockResolvedValue(undefined);
  readText.mockReset();
});

const setup = (csvArray: string[][] = sortCsv) => {
  const setCSVArray = vi.fn();
  render(
    <EditableTable csvArray={csvArray} theme="light" setCSVArray={setCSVArray} onApply={vi.fn()} />
  );
  return { setCSVArray };
};

// ヘッダーはフォーカス→クリック(選択)→Enter でソートされる
const sortByNum = () => {
  const header = screen.getByText("num").closest<HTMLElement>("[tabindex]")!;
  fireEvent.focus(header);
  fireEvent.click(header);
  fireEvent.keyDown(header, { key: "Enter" });
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
const viewOrder = () => dataRows().map((tr) => dataCellOf(tr, 0).textContent);

describe("EditableTable ソート中の表示位置整合性", () => {
  it("ソートすると表示順が変わる（前提確認）", () => {
    setup();
    expect(viewOrder()).toEqual(["a", "b", "c"]);
    sortByNum();
    expect(viewOrder()).toEqual(["b", "c", "a"]);
  });

  it("行番号セルで選択した行がハイライトされる", () => {
    setup();
    sortByNum();
    fireEvent.click(rowIndexCellOf("c"));

    const highlighted = dataRows().filter((tr) =>
      (tr.querySelector("td") as HTMLElement).style.backgroundColor.includes(
        "activeSelectionBackground"
      )
    );
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toBe(rowByName("c"));
  });

  it("行選択後の行削除は選択した表示行を削除する", () => {
    const { setCSVArray } = setup();
    sortByNum();
    fireEvent.click(rowIndexCellOf("c"));
    fireEvent.click(screen.getByText("delete row"));
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "1"],
    ]);
  });

  it("範囲選択のコピーは画面に見えている値をコピーする", async () => {
    setup();
    sortByNum();
    // 表示上 b(view0) → a(view2) の name 列を範囲選択（データ位置では 1→0 で逆順）
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseEnter(cellOf("a", 0));
    fireEvent.mouseUp(cellOf("a", 0));
    fireEvent.click(screen.getByText("copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("b\nc\na"));
  });

  it("ペーストは画面上の行へ書き込まれる", async () => {
    const { setCSVArray } = setup();
    sortByNum();
    readText.mockResolvedValue("x\ny");
    // 表示上 c(view1) の name セルを選択してペースト → view1=c が x、view2=a が y になる
    fireEvent.mouseDown(cellOf("c", 0));
    fireEvent.mouseUp(cellOf("c", 0));
    fireEvent.click(screen.getByText("paste"));
    await waitFor(() =>
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["y", "3"],
        ["b", "1"],
        ["x", "2"],
      ])
    );
  });

  it("ペーストが表示行数を超える分は無視される", async () => {
    const { setCSVArray } = setup();
    sortByNum();
    readText.mockResolvedValue("x\ny\nz\nw");
    // 表示上 c(view1) から貼り付け → view1=c, view2=a のみ書き込み
    fireEvent.mouseDown(cellOf("c", 0));
    fireEvent.mouseUp(cellOf("c", 0));
    fireEvent.click(screen.getByText("paste"));
    await waitFor(() =>
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["y", "3"],
        ["b", "1"],
        ["x", "2"],
      ])
    );
  });

  it("オートフィルは画面上で下方向の行へ適用される", () => {
    const { setCSVArray } = setup();
    sortByNum();
    // view0(b, num=1) の num セルを選択し、フィルハンドルを view2(a) までドラッグ
    fireEvent.mouseDown(cellOf("b", 1));
    fireEvent.mouseUp(cellOf("b", 1));
    const handle = within(cellOf("b", 1)).getByLabelText("Auto fill handle");
    fireEvent.mouseDown(handle);
    fireEvent.mouseEnter(cellOf("c", 1));
    fireEvent.mouseEnter(cellOf("a", 1));
    act(() => {
      fireEvent.mouseUp(document);
    });
    // 連番: view1(c)=2, view2(a)=3
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "1"],
      ["c", "2"],
    ]);
  });

  it("オートフィルは文字列を画面上の下方向の行へコピーする", () => {
    const { setCSVArray } = setup();
    sortByNum();
    // view0(b) の name セルを view1(c) までフィル → c(data2) の name が b になる
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseUp(cellOf("b", 0));
    fireEvent.mouseDown(within(cellOf("b", 0)).getByLabelText("Auto fill handle"));
    fireEvent.mouseEnter(cellOf("c", 0));
    act(() => {
      fireEvent.mouseUp(document);
    });
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "1"],
      ["b", "2"],
    ]);
  });

  it("矢印キーは画面上の上下へ移動する", () => {
    setup();
    sortByNum();
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseUp(cellOf("b", 0));
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cellOf("c", 0));
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cellOf("a", 0));
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(document.activeElement).toBe(cellOf("c", 0));
  });

  it("検索は表示位置のセルを選択する", () => {
    setup();
    sortByNum();
    // "3" は a 行(view2)の num 列
    fireEvent.click(screen.getByText("search 3"));
    expect(document.activeElement).toBe(cellOf("a", 1));
  });

  it("行コンテキストメニューの行挿入はクリックした行の位置に挿入される", () => {
    const { setCSVArray } = setup();
    sortByNum();
    fireEvent.contextMenu(rowIndexCellOf("c"));
    fireEvent.click(screen.getByText("ctx insert above"));
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "1"],
      ["", ""],
      ["c", "2"],
    ]);
  });
});

describe("EditableTable ソート中の行挿入・削除", () => {
  it("行選択後のヘッダーからの行挿入は選択した行の位置に挿入される", () => {
    const { setCSVArray } = setup();
    sortByNum();
    fireEvent.click(rowIndexCellOf("c"));
    fireEvent.click(screen.getByText("insert row"));
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "1"],
      ["", ""],
      ["c", "2"],
    ]);
  });

  it("コンテキストメニューの行削除はクリックした表示行を削除する", () => {
    const { setCSVArray } = setup();
    sortByNum();
    fireEvent.contextMenu(rowIndexCellOf("b"));
    fireEvent.click(screen.getByText("ctx delete"));
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["c", "2"],
    ]);
  });
});

describe("EditableTable フィルター中の表示位置整合性", () => {
  const filterNumBy2 = () => {
    fireEvent.click(screen.getByText("toggle filters"));
    const inputs = screen.getAllByPlaceholderText("フィルター...");
    fireEvent.change(inputs[inputs.length - 1], { target: { value: "2" } });
  };

  it("フィルターすると該当行だけが表示される（前提確認）", () => {
    setup(filterCsv);
    filterNumBy2();
    expect(viewOrder()).toEqual(["b", "d"]);
  });

  it("コピーは表示されている行の値をコピーする", async () => {
    setup(filterCsv);
    filterNumBy2();
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseEnter(cellOf("d", 1));
    fireEvent.mouseUp(cellOf("d", 1));
    fireEvent.click(screen.getByText("copy"));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("b\t12\nd\t2"));
  });

  it("ペーストは表示されている行へ書き込まれる", async () => {
    const { setCSVArray } = setup(filterCsv);
    filterNumBy2();
    readText.mockResolvedValue("x\ny");
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseUp(cellOf("b", 0));
    fireEvent.click(screen.getByText("paste"));
    await waitFor(() =>
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["name", "num"],
        ["a", "3"],
        ["x", "12"],
        ["c", "1"],
        ["y", "2"],
      ])
    );
  });

  it("矢印キーは表示されている行の範囲内で移動する", () => {
    setup(filterCsv);
    filterNumBy2();
    fireEvent.mouseDown(cellOf("b", 0));
    fireEvent.mouseUp(cellOf("b", 0));
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cellOf("d", 0));
    // 最終表示行より下へは進まない
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cellOf("d", 0));
  });

  it("検索は表示中の行だけを対象にする", () => {
    setup(filterCsv);
    filterNumBy2();
    // "2" は b(12), d(2) にマッチ。フィルターで非表示の行は対象外
    fireEvent.click(screen.getByText("search 2"));
    expect(document.activeElement).toBe(cellOf("b", 1));
    fireEvent.click(screen.getByText("search next"));
    expect(document.activeElement).toBe(cellOf("d", 1));
  });

  it("行選択後の行削除は選択した表示行を削除する", () => {
    const { setCSVArray } = setup(filterCsv);
    filterNumBy2();
    fireEvent.click(rowIndexCellOf("d"));
    fireEvent.click(screen.getByText("delete row"));
    expect(setCSVArray).toHaveBeenLastCalledWith([
      ["name", "num"],
      ["a", "3"],
      ["b", "12"],
      ["c", "1"],
    ]);
  });
});

describe("EditableTable 仮想スクロールとフォーカス", () => {
  const bigCsv = [
    ["name", "num"],
    ...Array.from({ length: 100 }, (_, i) => [`row${i}`, String(i)]),
  ];

  it("描画範囲外の行へ矢印キーで移動するとその表示位置へスクロールする", () => {
    setup(bigCsv);
    fireEvent.mouseDown(cellOf("row0", 0));
    fireEvent.mouseUp(cellOf("row0", 0));
    scrollToMock.mockClear();
    // 描画範囲(約25行)を超える位置まで移動
    for (let i = 0; i < 40; i++) {
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
    }
    const tops = scrollToMock.mock.calls.map((c) => (c[0] as { top: number }).top);
    // 表示位置40行目(40行 * 40px)付近まで下方向へスクロールが要求される
    expect(Math.max(...tops)).toBeGreaterThan(1000);
  });
});

describe("EditableTable 行のドラッグ&ドロップ", () => {
  const dataTransfer = {
    setData: vi.fn(),
    getData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: "all",
    dropEffect: "move",
    types: [],
  };

  it("ソート・フィルターなしでは行をドラッグできる", () => {
    setup();
    expect(fireEvent.dragStart(rowIndexCellOf("a"), { dataTransfer })).toBe(true);
  });

  it("ソート中は行をドラッグできない", () => {
    setup();
    sortByNum();
    expect(fireEvent.dragStart(rowIndexCellOf("c"), { dataTransfer })).toBe(false);
  });

  it("フィルター中は行をドラッグできない", () => {
    setup(filterCsv);
    fireEvent.click(screen.getByText("toggle filters"));
    const inputs = screen.getAllByPlaceholderText("フィルター...");
    fireEvent.change(inputs[inputs.length - 1], { target: { value: "2" } });
    expect(fireEvent.dragStart(rowIndexCellOf("b"), { dataTransfer })).toBe(false);
  });
});
