import type { LargeMessageToExtension, LargeMessageToWebview } from "@message/largeMessages";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LargeApp } from "./LargeApp";
import { createLargeMessageHub, type LargeMessageHub } from "./largeMessageHub";

const { postMessage, webviewState } = vi.hoisted(() => {
  // webview の状態（vscode.getState / setState）の代わり
  const state: { value: unknown } = { value: undefined };
  return { postMessage: vi.fn(), webviewState: state };
});

vi.mock("@/utilities/vscode", () => ({
  vscode: {
    postMessage,
    getState: () => webviewState.value,
    setState: (state: unknown) => {
      webviewState.value = state;
      return state;
    },
  },
}));

type LargeInit = Extract<LargeMessageToWebview, { type: "large/init" }>;
type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;

const INIT: LargeInit = {
  type: "large/init",
  header: ["id", "name"],
  rowCount: 1_000_000,
  indexing: true,
  encoding: "UTF-8",
  restrictions: ["列の挿入・削除", "オートフィル"],
};

// メッセージの検証と振り分けは AppRouter が行い、LargeApp は中継（hub）から受け取る
let hub: LargeMessageHub;

function show(init: LargeInit = INIT) {
  hub = createLargeMessageHub();
  return render(<LargeApp init={init} theme="light" messages={hub} />);
}

function receive(data: LargeMessageToWebview) {
  act(() => {
    hub.dispatch(data);
  });
}

const sent = () => postMessage.mock.calls.map((call) => call[0] as { type: string });
const getRowsRequests = () =>
  sent().filter((message): message is GetRows => message.type === "large/getRows");

/** 最後の getRows に、ハンドルがファイルの行番号（1 始まり）の行で応答する */
function respondLatestRows() {
  const requests = getRowsRequests();
  const request = requests[requests.length - 1];
  receive({
    type: "large/rows",
    reqId: request.reqId,
    start: request.start,
    rows: Array.from({ length: request.count }, (_, i) => [String(i), `row${String(i)}`]),
    handles: Array.from({ length: request.count }, (_, i) => request.start + i + 1),
  });
}

const cellOf = (rowNumber: number, col: number) => {
  const row = screen.getByRole("rowheader", { name: String(rowNumber) }).closest("tr");
  if (!row) throw new Error("行が無い");
  return within(row).getAllByRole("gridcell")[col];
};

const applyOpsMessages = () => sent().filter((message) => message.type === "large/applyOps");

describe("LargeApp", () => {
  beforeEach(() => {
    postMessage.mockClear();
    webviewState.value = undefined;
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 600,
    });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  test("large/init の内容でバナーと表を表示し、先頭の行を要求する", () => {
    show();
    expect(screen.getByText("大容量モード（一部機能制限中）")).toBeInTheDocument();
    expect(screen.getByText("文字コード: UTF-8")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    const requests = getRowsRequests();
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0].start).toBe(0);
    // 全体ではなくページ単位で要求する
    expect(requests.every((request) => request.count <= 5000)).toBe(true);
  });

  test("届いた行を表示する", () => {
    show();
    const request = getRowsRequests()[0];
    receive({
      type: "large/rows",
      reqId: request.reqId,
      start: request.start,
      rows: Array.from({ length: request.count }, (_, i) => [String(i), `row${String(i)}`]),
      handles: Array.from({ length: request.count }, (_, i) => i),
    });
    expect(screen.getByText("row0")).toBeInTheDocument();
  });

  test("インデックス作成の進捗を表示し、完了したら消す", () => {
    show();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
    receive({ type: "large/progress", kind: "index", ratio: 0.5 });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "50");
    // インデックス以外の進捗はバナーのインデックス表示に影響しない
    receive({ type: "large/progress", kind: "sort", ratio: 0.9, jobId: 1 });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "50");
    receive({ type: "large/progress", kind: "index", ratio: 1 });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("インデックス作成済みなら進捗を表示しない", () => {
    show({ ...INIT, indexing: false });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("行数の変化（無効化）を表に反映する", () => {
    show({ ...INIT, rowCount: 3 });
    expect(screen.queryByRole("rowheader", { name: "5" })).not.toBeInTheDocument();
    receive({ type: "large/invalidate", revision: 1, rowCount: 5 });
    expect(screen.getByRole("rowheader", { name: "5" })).toBeInTheDocument();
  });

  test("拡張機能からのエラーを表示する", () => {
    show();
    receive({ type: "large/error", message: "読み込みに失敗しました" });
    expect(screen.getByRole("alert")).toHaveTextContent("読み込みに失敗しました");
  });

  test("window に直接届いたメッセージは処理しない（受信は AppRouter の中継だけ）", () => {
    show();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "large/progress", kind: "index", ratio: 1 } })
      );
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  test("セルを編集すると large/applyOps でハンドルを指定した行の置き換えを送り、即座に表示する", () => {
    show({ ...INIT, rowCount: 3, indexing: false });
    respondLatestRows();
    fireEvent.doubleClick(cellOf(2, 1));
    fireEvent.change(screen.getByRole("textbox", { name: "セルの編集" }), {
      target: { value: "edited" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "セルの編集" }), { key: "Enter" });
    expect(applyOpsMessages()).toEqual([
      { type: "large/applyOps", ops: [{ type: "setRow", handle: 2, row: ["1", "edited"] }] },
    ]);
    expect(cellOf(2, 1)).toHaveTextContent("edited");
  });

  test("インデックス作成中は編集できず、作成が終わると編集できる", () => {
    show({ ...INIT, rowCount: 3, indexing: true });
    respondLatestRows();
    fireEvent.doubleClick(cellOf(1, 1));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    receive({ type: "large/progress", kind: "index", ratio: 1 });
    fireEvent.doubleClick(cellOf(1, 1));
    expect(screen.getByRole("textbox", { name: "セルの編集" })).toHaveValue("row0");
  });

  test("インデックス作成中の large/init で開き直すと編集できなくなる", () => {
    show({ ...INIT, rowCount: 3, indexing: false });
    receive({ ...INIT, rowCount: 3, indexing: true });
    respondLatestRows();
    expect(cellOf(1, 1)).toHaveTextContent("row0");
    fireEvent.doubleClick(cellOf(1, 1));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("追加行のハンドルは webview の状態に保存した続きから採番し、次の値を保存する", () => {
    webviewState.value = { largeNextHandle: -7 };
    show({ ...INIT, rowCount: 3, indexing: false });
    respondLatestRows();
    fireEvent.mouseDown(cellOf(1, 0));
    fireEvent.keyDown(cellOf(1, 0), { key: "I", ctrlKey: true, shiftKey: true });
    expect(applyOpsMessages()).toEqual([
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", beforeHandle: 1, handles: [-7], rows: [["", ""]] }],
      },
    ]);
    expect(webviewState.value).toEqual({ largeNextHandle: -8 });
  });

  test("large/init の nextHandle が webview の状態の値より小さければ、そこから採番する", () => {
    webviewState.value = { largeNextHandle: -2 };
    show({ ...INIT, rowCount: 3, indexing: false, nextHandle: -9 });
    respondLatestRows();
    fireEvent.mouseDown(cellOf(1, 0));
    fireEvent.keyDown(cellOf(1, 0), { key: "I", ctrlKey: true, shiftKey: true });
    expect(applyOpsMessages()).toEqual([
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", beforeHandle: 1, handles: [-9], rows: [["", ""]] }],
      },
    ]);
    expect(webviewState.value).toEqual({ largeNextHandle: -10 });
  });

  test("開き直しの large/init の nextHandle でも採番の起点を進める", () => {
    show({ ...INIT, rowCount: 3, indexing: false });
    receive({ ...INIT, rowCount: 3, indexing: false, nextHandle: -5 });
    respondLatestRows();
    fireEvent.mouseDown(cellOf(1, 0));
    fireEvent.keyDown(cellOf(1, 0), { key: "I", ctrlKey: true, shiftKey: true });
    expect(applyOpsMessages()).toEqual([
      {
        type: "large/applyOps",
        ops: [{ type: "insertRows", beforeHandle: 1, handles: [-5], rows: [["", ""]] }],
      },
    ]);
  });

  test("large/invalidate の header で列名を更新する", () => {
    show({ ...INIT, rowCount: 3, indexing: false });
    receive({ type: "large/invalidate", revision: 1, rowCount: 3, header: ["id", "氏名"] });
    expect(screen.getByRole("columnheader", { name: "氏名" })).toBeInTheDocument();
  });

  test.each([
    ["z", false],
    ["y", false],
    ["z", true],
    ["s", false],
  ])(
    "Ctrl+%s（Shift: %s）は処理せず止めもしない（VSCode の Undo/Redo に委ねる）",
    (key, shiftKey) => {
      show();
      postMessage.mockClear();
      const reached = vi.fn();
      window.addEventListener("keydown", reached);
      const event = new KeyboardEvent("keydown", {
        key,
        ctrlKey: true,
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        document.body.dispatchEvent(event);
      });
      window.removeEventListener("keydown", reached);
      expect(reached).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(false);
      expect(sent()).toEqual([]);
    }
  );
});
