import { fireEvent, render, screen } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * 空ファイル(0行)からの行・列追加 (issue #83)
 */

type HeaderProps = {
  onInsertRow?: () => void;
  onInsertColumn?: () => void;
};

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: (p: HeaderProps) => (
    <div>
      <button onClick={p.onInsertRow}>insert row</button>
      <button onClick={p.onInsertColumn}>insert column</button>
    </div>
  ),
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

const setup = () => {
  const setCSVArray = vi.fn();
  render(<EditableTable csvArray={[]} theme="light" setCSVArray={setCSVArray} onApply={vi.fn()} />);
  return { setCSVArray };
};

describe("EditableTable 空ファイル", () => {
  it("空ファイルでも例外にならず表示できる", () => {
    expect(() => setup()).not.toThrow();
  });

  it("空ファイルで行追加するとヘッダー付きの1行1列のCSVになる", () => {
    const { setCSVArray } = setup();
    fireEvent.click(screen.getByText("insert row"));
    expect(setCSVArray).toHaveBeenLastCalledWith([["new column"], [""]]);
  });

  it("空ファイルで列追加すると1列のCSVになる", () => {
    const { setCSVArray } = setup();
    fireEvent.click(screen.getByText("insert column"));
    expect(setCSVArray).toHaveBeenLastCalledWith([["new column"]]);
  });
});
