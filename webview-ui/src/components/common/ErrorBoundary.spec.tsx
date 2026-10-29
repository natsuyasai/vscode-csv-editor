import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("render failed");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("子が正常ならそのまま描画する", () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("ok")).toBeTruthy();
  });

  test("描画中の例外でエラー内容を表示し真っ白にしない", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert").textContent).toContain("render failed");
  });

  test("開き直しコールバックが渡された場合はボタンから呼べる", () => {
    const onOpenAsText = vi.fn();
    render(
      <ErrorBoundary onOpenAsText={onOpenAsText}>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: "テキストエディタで開き直す" }));
    expect(onOpenAsText).toHaveBeenCalledTimes(1);
  });
});
