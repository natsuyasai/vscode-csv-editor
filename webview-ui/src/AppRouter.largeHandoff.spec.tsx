import { act, render, screen } from "@testing-library/react";
import AppRouter from "./AppRouter";

const postMessage = vi.hoisted(() => vi.fn());

vi.mock("@/utilities/vscode", () => ({
  vscode: { postMessage },
}));

vi.mock("./App", () => ({
  default: () => <div>normal-app</div>,
}));

const LARGE_INIT = {
  type: "large/init",
  header: ["id", "name"],
  rowCount: 3,
  indexing: true,
  encoding: "UTF-8",
  restrictions: ["オートフィル"],
};

const message = (data: unknown) => new MessageEvent("message", { data });

describe("AppRouter 大容量モードへの切り替え直後のメッセージ", () => {
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

  test("LargeApp の描画前に届いた進捗と行数の変化も反映する", () => {
    render(<AppRouter />);
    // large/init の直後（LargeApp がまだ描画されていない間）に続けて届く
    act(() => {
      window.dispatchEvent(message(LARGE_INIT));
      window.dispatchEvent(message({ type: "large/invalidate", revision: 1, rowCount: 5 }));
      window.dispatchEvent(message({ type: "large/progress", kind: "index", ratio: 1 }));
    });
    expect(screen.getByText("大容量モード（一部機能制限中）")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "5" })).toBeInTheDocument();
  });

  test("不正な大容量モードのメッセージは無視する", () => {
    render(<AppRouter />);
    act(() => {
      window.dispatchEvent(message(LARGE_INIT));
      window.dispatchEvent(message({ type: "large/progress", kind: "index", ratio: 5 }));
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  test("切り替え後に届いたメッセージも反映する", () => {
    render(<AppRouter />);
    act(() => {
      window.dispatchEvent(message(LARGE_INIT));
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(message({ type: "large/progress", kind: "index", ratio: 0.5 }));
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "50");
  });
});
