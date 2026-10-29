import { fireEvent, render, screen } from "@testing-library/react";
import { ParseErrorView } from "./ParseErrorView";

describe("ParseErrorView", () => {
  test("行番号とエラーメッセージを表示する", () => {
    render(
      <ParseErrorView
        error={{ code: "CSV_QUOTE_NOT_CLOSED", message: "Quote Not Closed", line: 2 }}
        onOpenAsText={() => {}}
      />
    );
    expect(screen.getByRole("alert").textContent).toContain("2行目");
    expect(screen.getByRole("alert").textContent).toContain("Quote Not Closed");
  });

  test("行番号が無い場合は行番号を表示しない", () => {
    render(<ParseErrorView error={{ code: "UNKNOWN", message: "boom" }} onOpenAsText={() => {}} />);
    expect(screen.getByRole("alert").textContent).not.toContain("行目");
  });

  test("ボタン押下でテキストエディタで開き直すコールバックが呼ばれる", () => {
    const onOpenAsText = vi.fn();
    render(<ParseErrorView error={{ code: "X", message: "m" }} onOpenAsText={onOpenAsText} />);
    fireEvent.click(screen.getByRole("button", { name: "テキストエディタで開き直す" }));
    expect(onOpenAsText).toHaveBeenCalledTimes(1);
  });
});
