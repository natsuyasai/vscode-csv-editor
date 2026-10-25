import { fireEvent, render } from "@testing-library/react";
import { EditableTable } from "./EditableTable";

/**
 * 全体ショートカットと入力要素の共存 (issue #84)
 */

vi.mock("@vscode-elements/react-elements", () => ({
  VscodeDivider: () => null,
}));
vi.mock("../header/Header", () => ({
  Header: () => <div />,
}));
vi.mock("../common/PortalManager", () => ({
  PortalManager: () => null,
}));

const DATA = [
  ["a", "b"],
  ["1", "2"],
];

const setup = () => {
  const setCSVArray = vi.fn();
  render(<EditableTable csvArray={DATA} theme="light" setCSVArray={setCSVArray} onApply={vi.fn()} />);
  return { setCSVArray };
};

const addInput = () => {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.focus();
  return input;
};

describe("EditableTable ショートカット", () => {
  afterEach(() => {
    document.querySelectorAll("body > input").forEach((e) => e.remove());
  });

  it("入力欄でのCtrl+Zは標準動作を妨げない(preventDefaultされない)", () => {
    setup();
    const input = addInput();
    const notPrevented = fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(notPrevented).toBe(true);
  });

  it("入力欄でのCtrl+V/Ctrl+C/Ctrl+Yは標準動作を妨げない", () => {
    setup();
    const input = addInput();
    expect(fireEvent.keyDown(input, { key: "v", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "c", metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "y", ctrlKey: true })).toBe(true);
  });

  it("入力欄以外ではCtrl+Z / Cmd+Z / Ctrl+Shift+Zがテーブルのショートカットとして処理される", () => {
    setup();
    expect(fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "z", metaKey: true })).toBe(false);
    expect(fireEvent.keyDown(document.body, { key: "Z", ctrlKey: true, shiftKey: true })).toBe(false);
  });
});
