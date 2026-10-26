import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

const postMessage = vi.hoisted(() => vi.fn());
const tableMount = vi.hoisted(() => vi.fn());

vi.mock("./utilities/vscode", () => ({
  vscode: { postMessage },
}));

// EditableTableはApp連携の検証に必要な最小限のスタブに置き換える
vi.mock("./components/editable-table/EditableTable", async () => {
  const React = await import("react");
  return {
    EditableTable: ({
      csvArray,
      setCSVArray,
      onApply,
    }: {
      csvArray: string[][];
      setCSVArray: (csv: string[][]) => void;
      onApply: () => void;
    }) => {
      React.useEffect(() => {
        tableMount();
      }, []);
      return (
        <div>
          <div data-testid="cells">{JSON.stringify(csvArray)}</div>
          <button
            onClick={() =>
              setCSVArray([
                ["a", "b"],
                ["1", "2"],
              ])
            }
          >
            edit1
          </button>
          <button
            onClick={() =>
              setCSVArray([
                ["a", "b"],
                ["1", "3"],
              ])
            }
          >
            edit2
          </button>
          <button onClick={onApply}>apply</button>
        </div>
      );
    },
  };
});

function receive(type: "init" | "update", payload: string) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type, payload, epoch: 0 } }));
  });
}

function updateCalls() {
  return postMessage.mock.calls.map((c) => c[0] as { type: string; payload?: string });
}

describe("App 拡張機能との同期", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    postMessage.mockClear();
    tableMount.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("編集後はデバウンスしてupdateメッセージを1回だけ送る", () => {
    render(<App />);
    receive("init", "a,b\n1,1\n");
    postMessage.mockClear();

    fireEvent.click(screen.getByText("edit1"));
    fireEvent.click(screen.getByText("edit2"));
    expect(updateCalls()).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(updateCalls()).toEqual([{ type: "update", payload: "a,b\n1,3\n" }]);
  });

  test("Ctrl+S相当のApplyで保留中のupdateを破棄し最新テキストでsaveを送る", () => {
    render(<App />);
    receive("init", "a,b\n1,1\n");
    postMessage.mockClear();

    fireEvent.click(screen.getByText("edit1"));
    fireEvent.click(screen.getByText("apply"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(updateCalls()).toEqual([{ type: "save", payload: "a,b\n1,2\n" }]);
  });

  test("自分の編集と同一テキストのupdateでは再パース・再生成しない", () => {
    render(<App />);
    receive("init", "a,b\n1,1\n");
    fireEvent.click(screen.getByText("edit1"));
    const mountCount = tableMount.mock.calls.length;

    receive("update", "a,b\n1,2\n");

    expect(tableMount.mock.calls.length).toBe(mountCount);
    expect(screen.getByTestId("cells").textContent).toBe(
      JSON.stringify([
        ["a", "b"],
        ["1", "2"],
      ])
    );
  });

  test("外部変更は反映し、未送信の編集を破棄してテーブルを作り直す(Undo履歴クリア)", () => {
    render(<App />);
    receive("init", "a,b\n1,1\n");
    fireEvent.click(screen.getByText("edit1"));
    postMessage.mockClear();
    const mountCount = tableMount.mock.calls.length;

    receive("update", "x,y\n9,9\n");
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("cells").textContent).toBe(
      JSON.stringify([
        ["x", "y"],
        ["9", "9"],
      ])
    );
    expect(tableMount.mock.calls.length).toBe(mountCount + 1);
    expect(updateCalls()).toHaveLength(0);
  });
});
