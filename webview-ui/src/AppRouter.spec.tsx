import { act, render, screen } from "@testing-library/react";
import AppRouter from "./AppRouter";

// 通常モード・大容量モードのルートは、どちらが描画されたか分かる最小のスタブにする
vi.mock("./App", () => ({
  default: () => <div>normal-app</div>,
}));

vi.mock("./large/LargeApp/LargeApp", () => ({
  LargeApp: ({ init, theme }: { init: { rowCount: number }; theme: string }) => (
    <div>
      large-app rows={init.rowCount} theme={theme}
    </div>
  ),
}));

const LARGE_INIT = {
  type: "large/init",
  header: ["a"],
  rowCount: 10,
  indexing: false,
  encoding: "UTF-8",
  restrictions: [],
};

function receive(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data }));
  });
}

describe("AppRouter 最初のメッセージでモードを決める", () => {
  test("起動直後は通常モードの App を描画する（App が init を送るため）", () => {
    render(<AppRouter />);
    expect(screen.getByText("normal-app")).toBeInTheDocument();
  });

  test("最初に large/init が届いたら大容量モードに切り替える", () => {
    render(<AppRouter />);
    receive(LARGE_INIT);
    expect(screen.queryByText("normal-app")).not.toBeInTheDocument();
    expect(screen.getByText("large-app rows=10 theme=light")).toBeInTheDocument();
  });

  test("先に届いたテーマを大容量モードへ引き継ぐ（テーマではモードを決めない）", () => {
    render(<AppRouter />);
    receive({ type: "updateTheme", payload: "dark" });
    expect(screen.getByText("normal-app")).toBeInTheDocument();
    receive(LARGE_INIT);
    expect(screen.getByText("large-app rows=10 theme=dark")).toBeInTheDocument();
    receive({ type: "updateTheme", payload: "light" });
    expect(screen.getByText("large-app rows=10 theme=light")).toBeInTheDocument();
  });

  test.each([
    ["init", { type: "init", payload: "a\n1", epoch: 0 }],
    ["update", { type: "update", payload: "a\n1", epoch: 0 }],
  ])("最初に %s が届いたら通常モードのままにし、後の large/init では切り替えない", (_, first) => {
    render(<AppRouter />);
    receive(first);
    receive(LARGE_INIT);
    expect(screen.getByText("normal-app")).toBeInTheDocument();
    expect(screen.queryByText(/large-app/)).not.toBeInTheDocument();
  });

  test("不正な large/init は無視する", () => {
    render(<AppRouter />);
    receive({ ...LARGE_INIT, rowCount: -1 });
    expect(screen.getByText("normal-app")).toBeInTheDocument();
  });
});
