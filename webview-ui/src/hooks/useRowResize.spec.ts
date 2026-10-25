import { act, renderHook } from "@testing-library/react";
import { useRowResize } from "@/hooks/useRowResize";

const setup = () => {
  const { result } = renderHook(() => useRowResize(40));
  act(() => {
    result.current.setRowHeight(0, 100);
    result.current.setRowHeight(1, 200);
  });
  return result;
};

describe("useRowResize 行の挿入・削除・移動への追従 (#86)", () => {
  it("行挿入で挿入位置以降の行の高さが後ろへずれる", () => {
    const result = setup();
    act(() => result.current.onRowInserted(1));
    expect(result.current.getRowHeight(0)).toBe(100);
    expect(result.current.getRowHeight(1)).toBe(40);
    expect(result.current.getRowHeight(2)).toBe(200);
  });

  it("行削除で削除行の高さが消え、後ろの行の高さが前へずれる", () => {
    const result = setup();
    act(() => result.current.onRowDeleted(0));
    expect(result.current.getRowHeight(0)).toBe(200);
    expect(result.current.getRowHeight(1)).toBe(40);
  });

  it("行移動で高さが行に付いていく", () => {
    const result = setup();
    act(() => result.current.onRowMoved(1, 0));
    expect(result.current.getRowHeight(0)).toBe(200);
    expect(result.current.getRowHeight(1)).toBe(100);
  });
});
