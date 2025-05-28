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

    it("undo操作を履歴が空の状態で行っても何も起きないこと", () => {
      act(() => hooks.result.current.undo());
      // setCSVArray should not be called since there is no history
      expect(setCSVArray).not.toHaveBeenCalled();
    });

    it("redo操作を履歴が空の状態で行っても何も起きないこと", () => {
      act(() => hooks.result.current.redo());
      // setCSVArray should not be called since there is no poppedHistory
      expect(setCSVArray).not.toHaveBeenCalled();
    });

    it("複数回undoした後にredoで状態が戻ること", () => {
      act(() => hooks.result.current.insertRow(2));
      act(() => hooks.result.current.insertCol(1));
      act(() => hooks.result.current.deleteRow(1));
      // Undo 3 times
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      // Redo 3 times
      act(() => hooks.result.current.redo());
      act(() => hooks.result.current.redo());
      act(() => hooks.result.current.redo());
      // After redo, setCSVArray should have been called with the latest state
      expect(setCSVArray).toHaveBeenLastCalledWith([
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

    it("複数回undoした後にredoを複数回行うと履歴通りに戻ること", () => {
      act(() => hooks.result.current.insertRow(2));
      act(() => hooks.result.current.insertCol(1));
      act(() => hooks.result.current.deleteRow(1));
      // Undo 3 times
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      // Redo 3 times
      act(() => hooks.result.current.redo());
      act(() => hooks.result.current.redo());
      act(() => hooks.result.current.redo());
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("redoを履歴が空の状態で行っても何も起きないこと", () => {
      act(() => hooks.result.current.redo());
      expect(setCSVArray).not.toHaveBeenCalled();
    });

    it("undoを複数回行い、redoを途中まで行った後に新たな操作をするとredo履歴がクリアされること", () => {
      act(() => hooks.result.current.insertRow(2));
      act(() => hooks.result.current.insertCol(1));
      act(() => hooks.result.current.deleteRow(1));
      // Undo 3 times
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      act(() => hooks.result.current.undo());
      // Redo 2 times
      act(() => hooks.result.current.redo());
      act(() => hooks.result.current.redo());
      // 新たな操作
      act(() => hooks.result.current.insertRow(0));
      // redoしても何も起きない
      act(() => hooks.result.current.redo());
      expect(setCSVArray).toHaveBeenLastCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });
  describe("swapColumns", () => {
    it("指定した2つの列の位置が入れ替わること", () => {
      act(() => hooks.result.current.swapColumns(0, 2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col1", "col2", "col0"],
        ["b", "c", "a"],
        ["e", "f", "d"],
      ]);
    });

    it("同じ列インデックスを指定した場合、配列が変化しないこと", () => {
      act(() => hooks.result.current.swapColumns(1, 1));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("先頭と末尾の列を入れ替えられること", () => {
      act(() => hooks.result.current.swapColumns(0, 2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col1", "col2", "col0"],
        ["b", "c", "a"],
        ["e", "f", "d"],
      ]);
    });

    it("2列目と1列目を入れ替えられること", () => {
      act(() => hooks.result.current.swapColumns(1, 0));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col1", "col0", "col2"],
        ["b", "a", "c"],
        ["e", "d", "f"],
      ]);
    });

    it("空のcsvArrayの場合、何も起きないこと", () => {
      const emptyArray: string[][] = [];
      const setCSVArrayMock = vi.fn();
      const hooksEmpty = renderHook(() => useUpdateCsvArray(emptyArray, setCSVArrayMock, false));
      act(() => hooksEmpty.result.current.swapColumns(0, 1));
      expect(setCSVArrayMock).toHaveBeenCalledWith([]);
    });
  });
  describe("swapRows", () => {
    it("指定した2つの行の位置が入れ替わること（ヘッダ有効）", () => {
      act(() => hooks.result.current.swapRows(0, 1));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["d", "e", "f"],
        ["a", "b", "c"],
      ]);
    });

    it("同じ行インデックスを指定した場合、配列が変化しないこと（ヘッダ有効）", () => {
      act(() => hooks.result.current.swapRows(0, 0));
      expect(setCSVArray).not.toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("範囲外のインデックスを指定した場合、何も起きないこと（ヘッダ有効）", () => {
      act(() => hooks.result.current.swapRows(-1, 2));
      act(() => hooks.result.current.swapRows(1, 100));
      expect(setCSVArray).not.toHaveBeenCalledWith(expect.anything());
    });

    it("指定した2つの行の位置が入れ替わること（ヘッダ無効）", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.swapRows(0, 2));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["d", "e", "f"],
        ["a", "b", "c"],
        ["col0", "col1", "col2"],
      ]);
    });

    it("同じ行インデックスを指定した場合、配列が変化しないこと（ヘッダ無効）", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.swapRows(1, 1));
      expect(setCSVArray).not.toHaveBeenCalledWith(expect.anything());
    });

    it("範囲外のインデックスを指定した場合、何も起きないこと（ヘッダ無効）", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.swapRows(-1, 2));
      act(() => hookslocal.result.current.swapRows(0, 100));
      expect(setCSVArray).not.toHaveBeenCalledWith(expect.anything());
    });

    it("空のcsvArrayの場合、何も起きないこと", () => {
      const emptyArray: string[][] = [];
      const setCSVArrayMock = vi.fn();
      const hooksEmpty = renderHook(() => useUpdateCsvArray(emptyArray, setCSVArrayMock, false));
      act(() => hooksEmpty.result.current.swapRows(0, 1));
      expect(setCSVArrayMock).not.toHaveBeenCalled();
    });
  });
  describe("updateCell", () => {
    it("指定したセルの内容が更新されること（ヘッダ有効）", () => {
      // rowIdx=0, colIdx=1, text="updated"
      act(() => hooks.result.current.updateCell(0, 1, "updated"));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "updated", "c"],
        ["d", "e", "f"],
      ]);
    });

    it("2行目2列目のセルが更新されること（ヘッダ有効）", () => {
      act(() => hooks.result.current.updateCell(1, 2, "zzz"));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "zzz"],
      ]);
    });

    it("空のcsvArrayの場合、何も起きないこと", () => {
      const emptyArray: string[][] = [];
      const setCSVArrayMock = vi.fn();
      const hooksEmpty = renderHook(() => useUpdateCsvArray(emptyArray, setCSVArrayMock, false));
      act(() => hooksEmpty.result.current.updateCell(0, 0, "test"));
      expect(setCSVArrayMock).not.toHaveBeenCalled();
    });

    it("ヘッダ行無効時、指定したセルの内容が更新されること", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      // rowIdx=1, colIdx=2, text="abc"
      act(() => hookslocal.result.current.updateCell(1, 2, "abc"));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["col0", "col1", "col2"],
        ["a", "b", "abc"],
        ["d", "e", "f"],
      ]);
    });

    it("ヘッダ行無効時、1行目1列目のセルが更新されること", () => {
      const hookslocal = renderHook(() => useUpdateCsvArray(csvArray, setCSVArray, true));
      act(() => hookslocal.result.current.updateCell(0, 0, "headerless"));
      expect(setCSVArray).toHaveBeenCalledWith([
        ["headerless", "col1", "col2"],
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });
  });
});
