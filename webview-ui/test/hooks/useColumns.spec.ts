import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useColumns } from "@/hooks/useColumns";
import { ROW_IDX_COL } from "@/types";
import TextAreaEditor from "@/components/Row/TextAreaEditor";

describe("カラムの作成", () => {
  it("データが空の場合は空の行が生成されること", () => {
    const { result } = renderHook(() => useColumns([], false));
    expect(result.current.columns).toEqual([]);
  });

  it("複数行の場合にヘッダ行で生成されること", () => {
    const csvArray: Array<Array<string>> = [
      ["Header1", "Header2", "Header3"],
      ["Row1Col1", "Row1Col2", "Row1Col3"],
    ];
    const { result } = renderHook(() => useColumns(csvArray, false));
    expect(result.current.columns).toEqual([
      ROW_IDX_COL,
      {
        frozen: false,
        key: "col0",
        name: "Header1",
        resizable: true,
        renderEditCell: TextAreaEditor,
      },
      {
        frozen: false,
        key: "col1",
        name: "Header2",
        resizable: true,
        renderEditCell: TextAreaEditor,
      },
      {
        frozen: false,
        key: "col2",
        name: "Header3",
        resizable: true,
        renderEditCell: TextAreaEditor,
      },
    ]);
  });

  it("ヘッダ行のみの場合にヘッダ行で生成されること", () => {
    const csvArray: Array<Array<string>> = [["Header1", "Header2"]];
    const { result } = renderHook(() => useColumns(csvArray, false));
    expect(result.current.columns).toEqual([
      ROW_IDX_COL,
      {
        frozen: false,
        key: "col0",
        name: "Header1",
        resizable: true,
        renderEditCell: TextAreaEditor,
      },
      {
        frozen: false,
        key: "col1",
        name: "Header2",
        resizable: true,
        renderEditCell: TextAreaEditor,
      },
    ]);
  });

  it("ヘッダ行無効の場合空文字のみの配列が生成されること", () => {
    const csvArray: Array<Array<string>> = [
      ["Header1", "Header2", "Header3"],
      ["Row1Col1", "Row1Col2", "Row1Col3"],
    ];
    const { result } = renderHook(() => useColumns(csvArray, true));
    expect(result.current.columns).toEqual([
      ROW_IDX_COL,
      { frozen: false, key: "col0", name: "", resizable: true, renderEditCell: TextAreaEditor },
      { frozen: false, key: "col1", name: "", resizable: true, renderEditCell: TextAreaEditor },
      { frozen: false, key: "col2", name: "", resizable: true, renderEditCell: TextAreaEditor },
    ]);
  });
});
