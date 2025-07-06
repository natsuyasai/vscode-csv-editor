import { act, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useRows } from "@/hooks/useRows";

describe("useRows", () => {
  const mockedUuid = "mocked-uuid";
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => mockedUuid),
    });
  });

  it("データが空なら空の行が生成されること", () => {
    const { result } = renderHook(() => useRows([], false));
    expect(result.current.rows).toEqual([]);
  });

  it("ヘッダ行のみの場合空の行が生成されること", () => {
    const csvArray = [["Header1", "Header2", "Header3"]];
    const { result } = renderHook(() => useRows(csvArray, false));
    expect(result.current.rows).toEqual([]);
  });

  it("複数行の場合ヘッダ行をのぞいたデータが生成されること", () => {
    const csvArray = [
      ["Header1", "Header2", "Header3"],
      ["A1", "A2", "A3"],
      ["B1", "B2", "B3"],
    ];
    const { result } = renderHook(() => useRows(csvArray, false));
    expect(result.current.rows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "A1", col1: "A2", col2: "A3" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "B1", col1: "B2", col2: "B3" },
    ]);
  });

  it("一部列のデータが無い場合でも対象行のデータが生成されていること", () => {
    const csvArray = [["Header1", "Header2", "Header3"], ["A1", "A2"], ["B1"]];
    const { result } = renderHook(() => useRows(csvArray, false));
    expect(result.current.rows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "A1", col1: "A2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "B1" },
    ]);
  });

  it("ヘッダ行無効の場合すべてのデータが対象行として生成されること", () => {
    const csvArray = [
      ["Header1", "Header2", "Header3"],
      ["A1", "A2", "A3"],
      ["B1", "B2", "B3"],
    ];
    const { result } = renderHook(() => useRows(csvArray, true));
    expect(result.current.rows).toEqual([
      {
        _csv_row_id_key: mockedUuid,
        _csv_row_index: "1",
        col0: "Header1",
        col1: "Header2",
        col2: "Header3",
      },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "A1", col1: "A2", col2: "A3" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "3", col0: "B1", col1: "B2", col2: "B3" },
    ]);
  });

  it("途中でデータが切り替わった場合行情報が更新されること", () => {
    const initial = [
      ["Header1", "Header2"],
      ["A1", "A2"],
    ];
    const updated = [
      ["Header1", "Header2"],
      ["B1", "B2"],
      ["C1", "C2"],
    ];
    const { result, rerender } = renderHook(({ csv }) => useRows(csv, false), {
      initialProps: { csv: initial },
    });
    expect(result.current.rows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "A1", col1: "A2" },
    ]);
    rerender({ csv: updated });
    expect(result.current.rows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "B1", col1: "B2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "C1", col1: "C2" },
    ]);
  });

  it("sortedRows: ソート条件が指定された場合、昇順でソートされること", () => {
    const csvArray = [
      ["Header1", "Header2"],
      ["B", "2"],
      ["A", "1"],
      ["C", "3"],
    ];
    const { result } = renderHook(() => useRows(csvArray, false));
    // 初期状態はソートなし
    expect(result.current.sortedRows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "B", col1: "2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "A", col1: "1" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "3", col0: "C", col1: "3" },
    ]);
    // col0で昇順ソート
    act(() => {
      result.current.setSortColumns([{ columnKey: "col0", direction: "ASC" }]);
    });
    expect(result.current.sortedRows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "A", col1: "1" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "B", col1: "2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "3", col0: "C", col1: "3" },
    ]);
  });

  it("sortedRows: ソート条件が指定された場合、降順でソートされること", () => {
    const csvArray = [
      ["Header1", "Header2"],
      ["B", "2"],
      ["A", "1"],
      ["C", "3"],
    ];
    const { result } = renderHook(() => useRows(csvArray, false));
    // col1で降順ソート
    act(() => {
      result.current.setSortColumns([{ columnKey: "col1", direction: "DESC" }]);
    });
    expect(result.current.sortedRows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "C", col1: "3" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "B", col1: "2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "3", col0: "A", col1: "1" },
    ]);
  });

  it("sortedRows: 複数カラムでソートできること", () => {
    const csvArray = [
      ["Header1", "Header2"],
      ["A", "2"],
      ["A", "1"],
      ["B", "1"],
    ];
    const { result } = renderHook(() => useRows(csvArray, false));
    // col0昇順, col1昇順
    act(() => {
      result.current.setSortColumns([
        { columnKey: "col0", direction: "ASC" },
        { columnKey: "col1", direction: "ASC" },
      ]);
    });
    expect(result.current.sortedRows).toEqual([
      { _csv_row_id_key: mockedUuid, _csv_row_index: "1", col0: "A", col1: "1" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "2", col0: "A", col1: "2" },
      { _csv_row_id_key: mockedUuid, _csv_row_index: "3", col0: "B", col1: "1" },
    ]);
  });
});
