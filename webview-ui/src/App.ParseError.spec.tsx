import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const postMessage = vi.hoisted(() => vi.fn());

vi.mock("./utilities/vscode", () => ({
  vscode: { postMessage },
}));

// EditableTableはApp連携の検証に必要な最小限のスタブに置き換える
vi.mock("./components/editable-table/EditableTable", () => ({
  EditableTable: ({ csvArray }: { csvArray: string[][] }) => (
    <div data-testid="cells">{JSON.stringify(csvArray)}</div>
  ),
}));

function receive(type: "init" | "update", payload: string) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type, payload } }));
  });
}

function sentMessages() {
  return postMessage.mock.calls.map((c) => c[0] as { type: string; payload?: string });
}

const QUOTE_NOT_CLOSED = 'a,b\n"x,1\n';

describe("App CSV解析エラー", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMessage.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("列数不揃いのCSVは空セルで補ってテーブルに表示する", () => {
    render(<App />);
    receive("init", "a,b,c\n1,2\n");

    expect(screen.getByTestId("cells").textContent).toBe(
      JSON.stringify([
        ["a", "b", "c"],
        ["1", "2", ""],
      ])
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("構文エラーのCSVはエラーを表示し、拡張機能へupdateを送らない", () => {
    render(<App />);
    receive("init", QUOTE_NOT_CLOSED);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("alert").textContent).toContain("2行目");
    expect(screen.queryByTestId("cells")).toBeNull();
    expect(sentMessages().filter((m) => m.type === "update")).toHaveLength(0);
  });

  test("エラー表示のボタンでopenAsTextメッセージを送る", () => {
    render(<App />);
    receive("init", QUOTE_NOT_CLOSED);
    postMessage.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "テキストエディタで開き直す" }));

    expect(sentMessages()).toEqual([{ type: "openAsText" }]);
  });

  test("エラー後に正しい内容へ更新されるとテーブル表示に復帰する", () => {
    render(<App />);
    receive("init", QUOTE_NOT_CLOSED);
    receive("update", "a,b\n1,2\n");

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("cells").textContent).toBe(
      JSON.stringify([
        ["a", "b"],
        ["1", "2"],
      ])
    );
  });

  test("空ファイルは例外にならない", () => {
    render(<App />);
    expect(() => receive("init", "")).not.toThrow();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
