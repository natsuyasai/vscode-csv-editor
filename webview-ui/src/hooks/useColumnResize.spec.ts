import { act, renderHook } from "@testing-library/react";
import { useColumnResize } from "@/hooks/useColumnResize";

const setup = () => {
  const { result } = renderHook(() => useColumnResize(150));
  act(() => {
    result.current.setColumnWidth(0, 100);
    result.current.setColumnWidth(1, 300);
  });
  return result;
};

describe("useColumnResize 列の挿入・削除・移動への追従 (#86)", () => {
  it("列挿入で挿入位置以降の列幅が後ろへずれる", () => {
    const result = setup();
    act(() => result.current.onColumnInserted(1));
    expect(result.current.getColumnWidth(0)).toBe(100);
    expect(result.current.getColumnWidth(1)).toBe(150);
    expect(result.current.getColumnWidth(2)).toBe(300);
  });

  it("列削除で削除列の幅が消え、後ろの列幅が前へずれる", () => {
    const result = setup();
    act(() => result.current.onColumnDeleted(0));
    expect(result.current.getColumnWidth(0)).toBe(300);
    expect(result.current.getColumnWidth(1)).toBe(150);
  });

  it("列移動で列幅が列に付いていく", () => {
    const result = setup();
    act(() => result.current.onColumnMoved(1, 0));
    expect(result.current.getColumnWidth(0)).toBe(300);
    expect(result.current.getColumnWidth(1)).toBe(100);
  });
});
