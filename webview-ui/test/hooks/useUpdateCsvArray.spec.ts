import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUpdateCsvArray } from "@/hooks/useUpdateCsvArray";
import { act, renderHook, RenderHookResult } from "@testing-library/react";

describe("useUpdateCsvArray", () => {
  let csvArray: Array<Array<string>>;
  let setCSVArray: ReturnType<typeof vi.fn>;
  let hooks: RenderHookResult<ReturnType<typeof useUpdateCsvArray>, unknown>;

  beforeEach(() => {
    csvArray = [
      ["col0", "col1", "col2"],
      ["a", "b", "c"],
      ["d", "e", "f"],
    ];
    setCSVArray = vi.fn();
    hooks = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, false));
  });

  describe("insertRow", () => {
    it("末尾に行を追加できること", () => {
      act(() => hooks.result.current.insertRow(2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
    });

    it("間に行を追加できること", () => {
      act(() => hooks.result.current.insertRow(0));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["", "", ""],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("ヘッダ行無効時でも間に行を追加できること", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.insertRow(0));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["", "", ""],
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("deleteRow", () => {
    it("指定した行が削除されること", () => {
      act(() => hooks.result.current.deleteRow(0));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["d", "e", "f"],
      ]);
    });

    it("対象行が範囲外の場合に削除できないこと", () => {
      act(() => hooks.result.current.deleteRow(-1));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("ヘッダ行が無効でも指定した行が削除されること", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.deleteRow(-1));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("updateRow", () => {
    it("対象行のデータが更新されること", () => {
      const updatedRows = [
        { col0: "x", col1: "y", col2: "z" },
        { col0: "1", col1: "2", col2: "3" },
      ];
      act(() => hooks.result.current.updateRow(updatedRows));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);
    });

    it("列数が足りていない場合、他の列は空文字で補完されること", () => {
      const updatedRows = [
        { col0: "x" }, // missing col1, col2
      ];
      act(() => hooks.result.current.updateRow(updatedRows));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "", ""],
      ]);
    });

    it("ヘッダ行が無効でも対象行のデータが更新されること", () => {
      const updatedRows = [
        { col0: "col0", col1: "col1", col2: "col2" },
        { col0: "x", col1: "y", col2: "z" },
        { col0: "1", col1: "2", col2: "3" },
      ];
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.updateRow(updatedRows));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);
    });
  });

  describe("insertCol", () => {
    it("最終要素を選択したとき末尾に列が追加されること", () => {
      act(() => hooks.result.current.insertCol(3));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2", "new column"],
        ["a", "b", "c", ""],
        ["d", "e", "f", ""],
      ]);
    });

    it("2列目の要素を選択したとき、3列目に追加されること", () => {
      act(() => hooks.result.current.insertCol(2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "new column", "col2"],
        ["a", "b", "", "c"],
        ["d", "e", "", "f"],
      ]);
    });
  });

  describe("deleteCol", () => {
    it("最終要素を選択したとき最後の列が削除されること", () => {
      act(() => hooks.result.current.deleteCol(2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1"],
        ["a", "b"],
        ["d", "e"],
      ]);
    });

    it("2列目の要素を選択したとき、2列目が削除されること", () => {
      act(() => hooks.result.current.deleteCol(1));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col2"],
        ["a", "c"],
        ["d", "f"],
      ]);
    });
  });

  describe("updateCol", () => {
    it("ヘッダ行の指定セルの内容が更新できること", () => {
      act(() => hooks.result.current.updateCol(1, "testCol1"));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "testCol1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("history", () => {
    it("csvのデータに変更があれば履歴情報に追加され、undo操作で変更前の状態に戻ること", () => {
      act(() => hooks.result.current.insertRow(2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
      const updatedRows = [
        { col0: "x", col1: "y", col2: "z" },
        { col0: "1", col1: "2", col2: "3" },
      ];
      act(() => hooks.result.current.updateRow(updatedRows));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);

      act(() => hooks.result.current.undo());
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
      act(() => hooks.result.current.undo());
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("poppedHistory", () => {
    it("undo後にredoを行うと元に戻ること", () => {
      act(() => hooks.result.current.insertRow(2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
      const updatedRows = [
        { col0: "x", col1: "y", col2: "z" },
        { col0: "1", col1: "2", col2: "3" },
      ];
      act(() => hooks.result.current.updateRow(updatedRows));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);

      act(() => hooks.result.current.undo());
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
      act(() => hooks.result.current.redo());
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);
    });
  });
});
