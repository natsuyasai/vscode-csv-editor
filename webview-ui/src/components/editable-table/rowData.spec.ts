import { ROW_ID_KEY, ROW_IDX_KEY } from "@/types";
import { getRowId } from "@/utilities/rowIdentity";
import { buildRowData } from "./rowData";

describe("buildRowData", () => {
  const csv = [
    ["h0", "h1"],
    ["a", "b"],
    ["c", "d"],
  ];

  it("ヘッダー行を除いて行データを生成する", () => {
    const rows = buildRowData(csv, false);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ [ROW_IDX_KEY]: "1", col0: "a", col1: "b" });
    expect(rows[1]).toMatchObject({ [ROW_IDX_KEY]: "2", col0: "c", col1: "d" });
  });

  it("ヘッダー行を無視する場合は全行を行データにする", () => {
    expect(buildRowData(csv, true)).toHaveLength(3);
  });

  it("空のCSVは空配列", () => {
    expect(buildRowData([], false)).toEqual([]);
  });

  it("行IDはCSV行に紐づき、再生成しても変わらない", () => {
    const first = buildRowData(csv, false);
    const second = buildRowData(csv, false);
    expect(first[0][ROW_ID_KEY]).toBe(getRowId(csv[1]));
    expect(second.map((r) => r[ROW_ID_KEY])).toEqual(first.map((r) => r[ROW_ID_KEY]));
  });

  it("変更のない行は同じオブジェクトを返す", () => {
    const first = buildRowData(csv, false);
    const edited = [csv[0], csv[1], ["x", "d"]];
    const second = buildRowData(edited, false);
    expect(second[0]).toBe(first[0]);
    expect(second[1]).not.toBe(first[1]);
  });

  it("行の位置が変わると行番号を更新したオブジェクトを返す", () => {
    const first = buildRowData(csv, false);
    const second = buildRowData([csv[0], csv[2], csv[1]], false);
    expect(second[0][ROW_IDX_KEY]).toBe("1");
    expect(second[0][ROW_ID_KEY]).toBe(first[1][ROW_ID_KEY]);
    expect(second[1][ROW_ID_KEY]).toBe(first[0][ROW_ID_KEY]);
  });
});
