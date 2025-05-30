import { render, fireEvent, screen } from "@testing-library/react";
import { EditableTable } from "@/components/EditableTable";

vi.mock("@/hooks/useContextMenu", () => ({
  useContextMenu: () => ({
    contextMenuProps: null,
    setContextMenuProps: vi.fn(),
    menuRef: { current: null },
    isContextMenuOpen: false,
  }),
}));
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeContextMenu: () => <div data-testid="mock-context-menu">MockMenu</div>,
}));
describe("EditableTable", () => {
  const csvArray = [
    ["Header1", "Header2"],
    ["Row1Col1", "Row1Col2"],
    ["Row2Col1", "Row2Col2"],
  ];
  const setCSVArray = vi.fn();

  function setup(props = {}) {
    return render(
      <EditableTable
        csvArray={csvArray}
        isIgnoreHeaderRow={false}
        rowSize="normal"
        setCSVArray={setCSVArray}
        {...props}
      />
    );
  }

  it("指定したCSVのデータでテーブルが表示されること", () => {
    setup();
    // 仮想表示有効だと、初回2列までしか表示されない
    expect(screen.getByText("Header1")).toBeVisible();
    // expect(screen.getByText("Header2")).toBeVisible();
    expect(screen.getByText("Row1Col1")).toBeVisible();
    // expect(screen.getByText("Row2Col2")).toBeVisible();
  });

  it("handles column reorder", () => {
    setup();
    expect(() => {
      // @ts-ignore
      screen
        .getByText("Header1")
        .parentElement.dispatchEvent(new CustomEvent("columnsreorder", { bubbles: true }));
    }).not.toThrow();
  });
});
