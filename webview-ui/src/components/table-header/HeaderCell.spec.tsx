import { fireEvent, render, screen } from "@testing-library/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { describe, expect, it, vi } from "vitest";
import { HeaderCell } from "./HeaderCell";

const createProps = (overrides: Record<string, unknown> = {}) => ({
  header: {
    id: "col0",
    isPlaceholder: false,
    column: {
      id: "col0",
      columnDef: { header: "H" },
      getCanSort: () => false,
      getIsSorted: () => false,
      getToggleSortingHandler: () => undefined,
      getCanFilter: () => false,
    },
    getSize: () => 150,
    getContext: () => ({}),
  } as never,
  headerIndex: 1,
  rowIdxKey: "rowIdx",
  selectedColumnIndex: null,
  focusedColumnIndex: null,
  editingHeaderIndex: null as number | null,
  editingHeaderValue: "abc",
  updateCol: vi.fn(),
  startEditing: vi.fn(),
  finishEditing: vi.fn(),
  cancelEditing: vi.fn(),
  changeEditingValue: vi.fn(),
  setSelectedColumnIndex: vi.fn(),
  setFocusedColumnIndex: vi.fn(),
  openColumnContextMenu: vi.fn(),
  handleColumnReorder: vi.fn(),
  ...overrides,
});

const renderCell = (props: ReturnType<typeof createProps>) =>
  render(
    <DndProvider backend={HTML5Backend}>
      <table>
        <thead>
          <tr>
            <HeaderCell {...props} />
          </tr>
        </thead>
      </table>
    </DndProvider>
  );

describe("HeaderCell IME入力", () => {
  it("IME変換中のEnter/Tab/Escapeでは編集を確定・キャンセルしない", () => {
    const props = createProps({ editingHeaderIndex: 0 });
    renderCell(props);
    const textarea = screen.getByRole("textbox");

    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    fireEvent.keyDown(textarea, { key: "Enter", keyCode: 229 });
    fireEvent.keyDown(textarea, { key: "Tab", isComposing: true });
    fireEvent.keyDown(textarea, { key: "Escape", isComposing: true });

    expect(props.finishEditing).not.toHaveBeenCalled();
    expect(props.cancelEditing).not.toHaveBeenCalled();
  });

  it("変換確定後のEnterでは編集を確定する", () => {
    const props = createProps({ editingHeaderIndex: 0 });
    renderCell(props);

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(props.finishEditing).toHaveBeenCalledTimes(1);
  });

  it("選択中にProcessキーで入力開始すると空値で編集を開始し、preventDefaultしない", () => {
    const props = createProps();
    const { container } = renderCell(props);
    const th = container.querySelector("th") as HTMLElement;

    const notPrevented = fireEvent.keyDown(th, { key: "Process", keyCode: 229 });

    expect(notPrevented).toBe(true);
    expect(props.startEditing).toHaveBeenCalledWith(0, "");
  });
});
