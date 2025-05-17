import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import { EditableTableRoot } from "@/components/EditableTableRoot";
import "@testing-library/jest-dom";

// モックフック
vi.mock("@/hooks/useDirection", () => ({
  useDirection: () => "ltr",
}));
vi.mock("@/hooks/useRows", () => ({
  useRows: (csvArray: string[][]) => ({
    rows: csvArray
      .slice(1)
      .map((row, i) => Object.fromEntries(row.map((cell, j) => [`col${j}`, cell]))),
  }),
}));
vi.mock("@/hooks/useColumns", () => ({
  useColumns: (csvArray: string[][]) => ({
    columns: csvArray[0].map((header, i) => ({
      key: `col${i}`,
      name: header,
    })),
  }),
}));
vi.mock("@/hooks/useContextMenu", () => ({
  useContextMenu: () => ({
    contextMenuProps: null,
    setContextMenuProps: vi.fn(),
    menuRef: { current: null },
    isContextMenuOpen: false,
  }),
}));
vi.mock("@/hooks/useCellCopy", () => ({
  useCellCopy: () => ({
    handleCellCopy: vi.fn(),
  }),
}));
vi.mock("@/hooks/useUpdateRows", () => ({
  useUpdateRows: (csvArray: string[][], setCSVArray: any) => ({
    insertRow: vi.fn(),
    deleteRow: vi.fn(),
    updateRow: vi.fn(),
  }),
}));
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeContextMenu: () => <div data-testid="mock-context-menu">MockMenu</div>,
}));

describe("EditableTableRoot", () => {
  const csvArray = [
    ["A", "B"],
    ["1", "2"],
    ["3", "4"],
  ];
  const setCSVArray = vi.fn();

  beforeEach(() => {
    setCSVArray.mockClear?.();
  });

  it("renders DataGrid with correct rows and columns", () => {
    render(
      <EditableTableRoot
        csvArray={csvArray}
        setCSVArray={setCSVArray}
        isIgnoreHeaderRow={false}
        rowSize="normal"
      />
    );
    expect(screen.getByRole("grid")).toBeVisible();
    expect(screen.getByText("A")).toBeVisible();
    expect(screen.getByText("B")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByText("4")).toBeVisible();
  });
});
