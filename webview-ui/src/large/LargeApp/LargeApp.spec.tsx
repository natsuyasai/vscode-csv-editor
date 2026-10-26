import type { LargeMessageToExtension, LargeMessageToWebview } from "@message/largeMessages";
import { act, render, screen } from "@testing-library/react";
import { LargeApp } from "./LargeApp";
import { createLargeMessageHub, type LargeMessageHub } from "./largeMessageHub";

const postMessage = vi.hoisted(() => vi.fn());

vi.mock("@/utilities/vscode", () => ({
  vscode: { postMessage },
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

describe("LargeApp", () => {
  beforeEach(() => {
    postMessage.mockClear();
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
