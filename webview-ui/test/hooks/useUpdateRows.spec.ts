import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUpdateRows } from "@/hooks/useUpdateRows";

describe("useUpdateRows", () => {
  let csvArray: Array<Array<string>>;
  let setCSVArray: ReturnType<typeof vi.fn>;
  let hooks: ReturnType<typeof useUpdateRows>;

  beforeEach(() => {
    csvArray = [
      ["col0", "col1", "col2"],
      ["a", "b", "c"],
      ["d", "e", "f"],
    ];
    setCSVArray = vi.fn();
    hooks = useUpdateRows(csvArray, setCSVArray);
  });

  describe("insertRow", () => {
    it("inserts a new row at the end", () => {
      hooks.insertRow(2);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
        ["", "", ""],
      ]);
    });

    it("inserts a new row in the middle", () => {
      hooks.insertRow(0);
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
      hooks.deleteRow(0);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["d", "e", "f"],
      ]);
    });

    it("does not delete header row", () => {
      // deleteRow only affects rows after the header
      hooks.deleteRow(-1);
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
      hooks.updateRow(updatedRows);
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
      hooks.updateRow(updatedRows);
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["x", "", ""],
      ]);
    });
  });
});
