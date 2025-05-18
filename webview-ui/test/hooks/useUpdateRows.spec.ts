import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUpdateRows } from "@/hooks/useUpdateRows";
import { act, renderHook, RenderHookResult } from "@testing-library/react";

describe("useUpdateRows", () => {
  let csvArray: Array<Array<string>>;
  let setCSVArray: ReturnType<typeof vi.fn>;
  let hooks: RenderHookResult<ReturnType<typeof useUpdateRows>, unknown>;

  beforeEach(() => {
    csvArray = [
      ["col0", "col1", "col2"],
      ["a", "b", "c"],
      ["d", "e", "f"],
    ];
    setCSVArray = vi.fn();
    hooks = renderHook(() => useUpdateRows(csvArray, setCSVArray));
  });

  describe("insertRow", () => {
    it("inserts a new row at the end", () => {
      hooks.result.current.insertRow(2);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
    });

    it("inserts a new row in the middle", () => {
      hooks.result.current.insertRow(0);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["", "", ""],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("deleteRow", () => {
    it("deletes a row by index", () => {
      hooks.result.current.deleteRow(0);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["d", "e", "f"],
      ]);
    });

    it("does not delete header row", () => {
      // deleteRow only affects rows after the header
      hooks.result.current.deleteRow(-1);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });

  describe("updateRow", () => {
    it("updates rows with provided data", () => {
      const updatedRows = [
        { col0: "x", col1: "y", col2: "z" },
        { col0: "1", col1: "2", col2: "3" },
      ];
      hooks.result.current.updateRow(updatedRows);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "y", "z"],
        ["1", "2", "3"],
      ]);
    });

    it("fills missing columns with empty string", () => {
      const updatedRows = [
        { col0: "x" }, // missing col1, col2
      ];
      hooks.result.current.updateRow(updatedRows);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "", ""],
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
