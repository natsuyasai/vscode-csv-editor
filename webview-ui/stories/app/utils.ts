import { within, waitFor } from "storybook/test";

// サンプルCSVデータ
export const sampleCSVData = `Name,Age,City,Occupation
Alice,28,Tokyo,Engineer
Bob,35,Osaka,Designer
Charlie,42,Kyoto,Manager
Diana,31,Yokohama,Developer
Eve,29,Kobe,Analyst`;

// CSVデータの定数
export const COL_MAX = 4;
export const COL_MAX_WITH_HEADER = COL_MAX + 1; // インデックス列を含む（EditableTableでは5列）
export const ROW_MAX = 5;

/**
 * 初期CSVデータを設定する
 */
export function setInitData() {
  window.postMessage(
    {
      type: "update",
      payload: sampleCSVData,
    },
    "*"
  );
}

/**
 * グリッドが準備完了するまで待機する
 */
export function waitReadyForGrid(target: HTMLElement, timeout = 5000) {
  return waitFor(
    () => {
      const canvas = within(target);
      const gridcells = canvas.queryAllByRole("gridcell");
      if (gridcells.length === 0) {
        throw new Error("No gridcells found");
      }
      return true;
    },
    { timeout, interval: 100 }
  );
}
