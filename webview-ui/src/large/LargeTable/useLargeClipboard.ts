import { MAX_RANGE_CELLS, type LargeRange } from "@message/largeMessages";
import { useRef } from "react";
import { parseTsv, toTsv } from "../../utilities/tsv";
import type { RowSource } from "../rowSource/RowSource";
import type { CellPosition } from "./cellNavigation";
import { buildPasteOps, planPaste } from "./largeClipboard";
import { clampRange, rangeCellCount } from "./largeSelection";
import { isTextEntry } from "./useLargeTableEditing";

/** コピー・貼り付けに使うクリップボード（既定は navigator.clipboard。Story・テストで差し替える） */
export type LargeTableClipboard = Pick<Clipboard, "readText" | "writeText">;

export interface UseLargeClipboardOptions {
  source: RowSource;
  /** false なら貼り付けない（インデックス作成中・編集できない RowSource）。コピーはできる */
  editable: boolean;
  /** 選択している範囲（データ行だけ） */
  selection: LargeRange | null;
  /** セルを編集中か（編集欄のコピー・貼り付けは編集欄に任せる） */
  isEditing: boolean;
  /** 貼り付けた範囲を選択する（from が起点、to が選択中のセル） */
  selectRange: (from: CellPosition, to: CellPosition) => void;
  clipboard?: LargeTableClipboard;
  /** 利用者に知らせるメッセージ（上限を超えたとき・失敗したとき）。null は前のメッセージを消す */
  onNotice?: (message: string | null) => void;
}

/** 10万セルのように、上限を万の単位で表す */
const LIMIT_TEXT = `${String(MAX_RANGE_CELLS / 10_000)}万セル`;
const formatCount = (count: number) => count.toLocaleString("ja-JP");

export const copyLimitMessage = (count: number) =>
  `コピーできるのは1回${LIMIT_TEXT}までです（選択: ${formatCount(count)}セル）。範囲を狭めてください`;
export const pasteLimitMessage = (count: number) =>
  `貼り付けできるのは1回${LIMIT_TEXT}までです（貼り付け: ${formatCount(count)}セル）`;

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 大容量モードの表の Ctrl+C / Ctrl+V（通常モードと同じ TSV 形式。utilities/tsv.ts）。
 * - コピー: 選択した範囲を表示順の位置で RowSource.getRange に要求し（拡張機能が読む）、TSV にしてクリップボードへ書く
 * - 貼り付け: クリップボードの TSV を選択の左上から貼り付ける。対象の行全体を RowSource.fetchRows で
 *   （未取得なら拡張機能から）取り寄せ、行ごとの setRow をまとめて1回の applyOps で送る（Undo の1単位）。
 *   ハンドルは取り寄せたときの revision を添える。末尾の行・右端の列を超える分は切り詰める
 * - どちらも10万セル（MAX_RANGE_CELLS）を超えたら送らずにメッセージを出す
 * - 編集欄・入力欄でのキー、Ctrl+Shift などの組み合わせは処理しない（既定の動作に任せる）
 */
export function useLargeClipboard({
  source,
  editable,
  selection,
  isEditing,
  selectRange,
  clipboard,
  onNotice,
}: UseLargeClipboardOptions) {
  const pastingRef = useRef(false);
  const clipboardOf = () => clipboard ?? navigator.clipboard;
  const bounds = () => ({ rowCount: source.rowCount, colCount: source.header.length });
  const notify = (message: string | null) => onNotice?.(message);

  /** コピーを始めたら true（範囲が無い・取得できない RowSource なら false） */
  const copy = (): boolean => {
    const range = clampRange(selection, bounds());
    if (!range || !source.getRange) {
      return false;
    }
    const count = rangeCellCount(range);
    if (count > MAX_RANGE_CELLS) {
      notify(copyLimitMessage(count));
      return true;
    }
    notify(null);
    const getRange = source.getRange.bind(source);
    void (async () => {
      try {
        const rows = await getRange(range);
        await clipboardOf().writeText(toTsv(rows));
      } catch (error) {
        notify(`コピーできませんでした: ${reasonOf(error)}`);
      }
    })();
    return true;
  };

  /** 貼り付けを始めたら true（編集できない・範囲が無いなら false） */
  const paste = (): boolean => {
    const range = clampRange(selection, bounds());
    if (!editable || !range || !source.fetchRows || !source.applyOps) {
      return false;
    }
    if (pastingRef.current) {
      return true;
    }
    pastingRef.current = true;
    const origin = { row: range.startRow, col: range.startCol };
    const fetchRows = source.fetchRows.bind(source);
    const applyOps = source.applyOps.bind(source);
    void (async () => {
      try {
        const text = await clipboardOf().readText();
        const plan = planPaste(origin, parseTsv(text), bounds());
        if (!plan) {
          return;
        }
        if (plan.cellCount > MAX_RANGE_CELLS) {
          notify(pasteLimitMessage(plan.cellCount));
          return;
        }
        notify(null);
        const target = await fetchRows(plan.startRow, plan.endRow);
        const ops = buildPasteOps(target, plan, source.header.length);
        if (ops.length > 0) {
          applyOps(ops, target.revision);
        }
        const pastedRows = Math.min(target.rows.length, plan.values.length);
        if (pastedRows > 0) {
          // 選択中のセル（フォーカス）は左上に置き、表示位置を動かさない
          selectRange(
            { row: plan.startRow + pastedRows - 1, col: plan.startCol + plan.width - 1 },
            origin
          );
        }
      } catch (error) {
        notify(`貼り付けできませんでした: ${reasonOf(error)}`);
      } finally {
        pastingRef.current = false;
      }
    })();
    return true;
  };

  /** 表（grid）の keydown。Ctrl+C / Ctrl+V を処理したら true（既定の動作を止める） */
  const handleClipboardKey = (e: React.KeyboardEvent): boolean => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || isEditing || isTextEntry(e.target)) {
      return false;
    }
    const key = e.key.toLowerCase();
    const handled = key === "c" ? copy() : key === "v" ? paste() : false;
    if (handled) {
      e.preventDefault();
    }
    return handled;
  };

  return { copy, paste, handleClipboardKey };
}
