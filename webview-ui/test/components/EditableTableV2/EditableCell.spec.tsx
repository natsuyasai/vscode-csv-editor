import { CellContext } from "@tanstack/react-table";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditableCell } from "@/components/EditableTableV2/EditableCell";
import { RowData } from "@/components/EditableTableV2/types";

// モックのpropsを作成するヘルパー関数
const createMockProps = (
  overrides?: Partial<CellContext<RowData, unknown>>
): CellContext<RowData, unknown> => ({
  getValue: (() => "test value") as never,
  row: { index: 0 } as never,
  column: { id: "col0" } as never,
  table: {
    options: {
      meta: {
        updateData: vi.fn(),
        selectedCells: new Set(),
        handleCellMouseDown: vi.fn(),
        handleCellMouseEnter: vi.fn(),
        handleCellMouseUp: vi.fn(),
      },
    },
  } as never,
  cell: {} as never,
  renderValue: () => "test value" as never,
  ...overrides,
});

describe("EditableCell", () => {
  it("should render cell value", () => {
    const props = createMockProps({ getValue: (() => "Hello") as never });
    render(<EditableCell {...props} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should enter edit mode on double click", async () => {
    const user = userEvent.setup();
    const props = createMockProps();
    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    await user.dblClick(cell);

    // textareaが表示されることを確認
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });
  });

  it("should enter edit mode on Enter key", async () => {
    const user = userEvent.setup();
    const props = createMockProps();
    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  it("should enter edit mode on Space key", async () => {
    const user = userEvent.setup();
    const props = createMockProps();
    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard(" ");

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  it("should clear cell on Delete key without entering edit mode", async () => {
    const user = userEvent.setup();
    const mockUpdateData = vi.fn();
    const props = createMockProps({
      table: {
        options: {
          meta: {
            updateData: mockUpdateData,
            selectedCells: new Set(),
          },
        },
      } as never,
    });

    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard("{Delete}");

    expect(mockUpdateData).toHaveBeenCalledWith(0, "col0", "");
    // 編集モードには入らない
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("should clear cell and enter edit mode on Backspace key", async () => {
    const user = userEvent.setup();
    const props = createMockProps();
    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard("{Backspace}");

    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("");
    });
  });

  it("should clear cell and enter edit mode on character input", async () => {
    const user = userEvent.setup();
    const props = createMockProps();
    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    cell.focus();
    await user.keyboard("a");

    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveValue("a");
    });
  });

  it("should save value on blur", async () => {
    const user = userEvent.setup();
    const mockUpdateData = vi.fn();
    const props = createMockProps({
      table: {
        options: {
          meta: {
            updateData: mockUpdateData,
            selectedCells: new Set(),
          },
        },
      } as never,
    });

    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    await user.dblClick(cell);

    await waitFor(async () => {
      const textarea = screen.getByRole("textbox");
      await user.clear(textarea);
      await user.type(textarea, "new value");
      textarea.blur();
    });

    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalledWith(0, "col0", "new value");
    });
  });

  it("should save value on Enter key in edit mode", async () => {
    const user = userEvent.setup();
    const mockUpdateData = vi.fn();
    const props = createMockProps({
      table: {
        options: {
          meta: {
            updateData: mockUpdateData,
            selectedCells: new Set(),
          },
        },
      } as never,
    });

    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    await user.dblClick(cell);

    await waitFor(async () => {
      const textarea = screen.getByRole("textbox");
      await user.clear(textarea);
      await user.type(textarea, "updated");
      await user.keyboard("{Enter}");
    });

    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalledWith(0, "col0", "updated");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("should cancel edit on Escape key", async () => {
    const user = userEvent.setup();
    const mockUpdateData = vi.fn();
    const props = createMockProps({
      getValue: (() => "original") as never,
      table: {
        options: {
          meta: {
            updateData: mockUpdateData,
            selectedCells: new Set(),
          },
        },
      } as never,
    });

    render(<EditableCell {...props} />);

    const cell = screen.getByRole("button");
    await user.dblClick(cell);

    await waitFor(async () => {
      const textarea = screen.getByRole("textbox");
      await user.clear(textarea);
      await user.type(textarea, "changed");
      await user.keyboard("{Escape}");
    });

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("original")).toBeInTheDocument();
    });
  });

  it("should render with selected state", () => {
    const selectedCells = new Set(["0-0"]);
    const props = createMockProps({
      table: {
        options: {
          meta: {
            selectedCells,
          },
        },
      } as never,
    });

    render(<EditableCell {...props} />);

    const cell = screen.getByLabelText("Auto fill handle");
    expect(cell).toBeInTheDocument();
  });

  it("should handle numeric values", () => {
    const props = createMockProps({ getValue: (() => 123) as never });
    render(<EditableCell {...props} />);

    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("should handle boolean values", () => {
    const props = createMockProps({ getValue: (() => true) as never });
    render(<EditableCell {...props} />);

    expect(screen.getByText("true")).toBeInTheDocument();
  });
});
