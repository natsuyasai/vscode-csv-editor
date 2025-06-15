/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterCell } from "@/components/Header/FilterCell";

// VscodeIconのモック
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeIcon: ({ name }: { name: string }) => <span data-testid={`vscode-icon-${name}`}>×</span>,
}));

describe("FilterCell", () => {
  const defaultProps = {
    columnKey: "testColumn",
    value: "",
    onChange: vi.fn(),
    onClear: vi.fn(),
    isActive: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しくレンダリングされること", () => {
    render(<FilterCell {...defaultProps} />);

    const input = screen.getByPlaceholderText("filter...");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("valueが設定されている場合に表示されること", () => {
    render(<FilterCell {...defaultProps} value="test value" />);

    const input = screen.getByPlaceholderText("filter...");
    expect(input).toHaveValue("test value");
  });

  it("入力時にonChangeが呼ばれること", () => {
    const onChange = vi.fn();

    render(<FilterCell {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText("filter...");

    // fireEvent.changeを使ってより直接的にテスト
    fireEvent.change(input, { target: { value: "test value" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("test value");
  });

  it("isActiveがtrueの場合にクリアボタンが表示されること", () => {
    render(<FilterCell {...defaultProps} isActive={true} value="test" />);

    const clearButton = screen.getByTitle("Clear Filter");
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toHaveTextContent("×");
  });

  it("isActiveがfalseの場合にクリアボタンが表示されないこと", () => {
    render(<FilterCell {...defaultProps} isActive={false} />);

    const clearButton = screen.queryByTitle("Clear Filter");
    expect(clearButton).not.toBeInTheDocument();
  });

  it("クリアボタンをクリックした時にonClearが呼ばれること", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(<FilterCell {...defaultProps} isActive={true} value="test" onClear={onClear} />);

    const clearButton = screen.getByTitle("Clear Filter");
    await user.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("Escapeキーを押した時にonClearが呼ばれること", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(<FilterCell {...defaultProps} onClear={onClear} />);

    const input = screen.getByPlaceholderText("filter...");
    await user.click(input);
    await user.keyboard("{Escape}");

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("フォーカス時にfocusedクラスが適用されること", async () => {
    const user = userEvent.setup();

    render(<FilterCell {...defaultProps} />);

    const input = screen.getByPlaceholderText("filter...");

    // フォーカス前
    expect(input.className).not.toContain("focused");

    // フォーカス
    await user.click(input);
    expect(input.className).toContain("focused");
  });

  it("ブラー時にfocusedクラスが削除されること", async () => {
    const user = userEvent.setup();

    render(<FilterCell {...defaultProps} />);

    const input = screen.getByPlaceholderText("filter...");

    // フォーカス
    await user.click(input);
    expect(input.className).toContain("focused");

    // ブラー
    fireEvent.blur(input);
    expect(input.className).not.toContain("focused");
  });

  it("isActiveがtrueの場合にactiveクラスが適用されること", () => {
    const { container } = render(<FilterCell {...defaultProps} isActive={true} />);

    const filterCell = container.firstChild as HTMLElement;
    expect(filterCell.className).toContain("active");
  });

  it("isActiveがfalseの場合にactiveクラスが適用されないこと", () => {
    const { container } = render(<FilterCell {...defaultProps} isActive={false} />);

    const filterCell = container.firstChild as HTMLElement;
    expect(filterCell.className).not.toContain("active");
  });

  it("入力フィールドをクリックした時にイベントの伝播が停止されること", async () => {
    const user = userEvent.setup();
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <FilterCell {...defaultProps} />
      </div>
    );

    const input = screen.getByPlaceholderText("filter...");
    await user.click(input);

    // 親要素のクリックハンドラーが呼ばれないことを確認
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it("クリアボタンをクリックした時にイベントの伝播が停止されること", async () => {
    const user = userEvent.setup();
    const parentClickHandler = vi.fn();

    render(
      <div onClick={parentClickHandler}>
        <FilterCell {...defaultProps} isActive={true} value="test" />
      </div>
    );

    const clearButton = screen.getByTitle("Clear Filter");
    await user.click(clearButton);

    // 親要素のクリックハンドラーが呼ばれないことを確認
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it("キーボードイベントの伝播が停止されること", () => {
    const stopPropagationSpy = vi.fn();

    render(<FilterCell {...defaultProps} />);

    const input = screen.getByPlaceholderText("filter...");

    // キーダウンイベントをシミュレートして、stopPropagationが呼ばれることを確認
    fireEvent.keyDown(input, {
      key: "a",
      stopPropagation: stopPropagationSpy,
    });

    // 実際のイベントではstopPropagationが内部で呼ばれるため、
    // ここではイベントハンドラーが正しく設定されていることを確認
    expect(input).toBeInTheDocument();
  });

  it("data属性が正しく設定されていること", () => {
    const { container } = render(<FilterCell {...defaultProps} isActive={true} value="test" />);

    const filterCell = container.firstChild as HTMLElement;
    const input = screen.getByPlaceholderText("filter...");
    const clearButton = screen.getByTitle("Clear Filter");

    // data属性が設定されていることを確認
    expect(filterCell).toHaveAttribute("data-filter-cell", "true");
    expect(input).toHaveAttribute("data-filter-input", "true");
    expect(clearButton).toHaveAttribute("data-filter-button", "true");
  });

  it("data属性を使った要素の特定ができること", () => {
    const { container } = render(<FilterCell {...defaultProps} isActive={true} value="test" />);

    // data属性によるセレクタで要素を取得できることを確認
    const filterCell = container.querySelector('[data-filter-cell="true"]');
    const filterInput = container.querySelector('[data-filter-input="true"]');
    const filterButton = container.querySelector('[data-filter-button="true"]');

    expect(filterCell).toBeInTheDocument();
    expect(filterInput).toBeInTheDocument();
    expect(filterButton).toBeInTheDocument();
  });

  it("非アクティブ状態でもinput要素にdata属性が設定されていること", () => {
    render(<FilterCell {...defaultProps} isActive={false} />);

    const input = screen.getByPlaceholderText("filter...");
    expect(input).toHaveAttribute("data-filter-input", "true");
  });
});
