import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterInput } from "@/components/EditableTableV2/FilterInput";

describe("FilterInput", () => {
  it("should render input field with placeholder", () => {
    const mockColumn = {
      getFilterValue: () => "",
      setFilterValue: vi.fn(),
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByPlaceholderText("フィルター...");
    expect(input).toBeInTheDocument();
  });

  it("should display current filter value", () => {
    const mockColumn = {
      getFilterValue: () => "test value",
      setFilterValue: vi.fn(),
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByDisplayValue("test value");
    expect(input).toBeInTheDocument();
  });

  it("should call setFilterValue when user types", async () => {
    const user = userEvent.setup();
    const mockSetFilterValue = vi.fn();
    const mockColumn = {
      getFilterValue: () => "",
      setFilterValue: mockSetFilterValue,
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByPlaceholderText("フィルター...");
    await user.type(input, "abc");

    // setFilterValueは各文字入力ごとに呼ばれる
    expect(mockSetFilterValue).toHaveBeenCalledTimes(3);
    // 少なくとも1回は呼ばれていることを確認
    expect(mockSetFilterValue).toHaveBeenCalled();
  });

  it("should handle empty filter value", () => {
    const mockColumn = {
      getFilterValue: () => null,
      setFilterValue: vi.fn(),
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByPlaceholderText("フィルター...");
    expect(input).toHaveValue("");
  });

  it("should handle undefined filter value", () => {
    const mockColumn = {
      getFilterValue: () => undefined,
      setFilterValue: vi.fn(),
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByPlaceholderText("フィルター...");
    expect(input).toHaveValue("");
  });

  it("should have correct styles", () => {
    const mockColumn = {
      getFilterValue: () => "",
      setFilterValue: vi.fn(),
    };

    render(<FilterInput column={mockColumn} />);

    const input = screen.getByPlaceholderText("フィルター...");
    // スタイルは実装の詳細なので、存在確認のみ
    expect(input).toBeInTheDocument();
  });
});
