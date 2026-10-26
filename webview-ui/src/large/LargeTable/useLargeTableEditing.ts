import type { LargeOp } from "@message/largeMessages";
import { useCallback, useEffect, useRef, useState } from "react";
import { useContextMenu } from "../../hooks/useContextMenu";
import { isImeInputStart } from "../../utilities/ime";
import { createHandleAllocator } from "../rowSource/handleAllocator";
import type { RowSource } from "../rowSource/RowSource";
import { HEADER_ROW, moveCell, type CellPosition } from "./cellNavigation";
import type { CommitMove } from "./LargeCellEditor";
import { deleteRowOp, insertRowOp, setCellOp, setHeaderOp } from "./largeEditOps";
import { extendCell, selectionRange } from "./largeSelection";

/** 編集中のセル（row が HEADER_ROW ならヘッダー） */
export interface EditingCell extends CellPosition {
  /** 編集を始めたときの行のハンドル（データ行のみ） */
  handle?: number;
  /** 編集を始めたときの行の内容（データ行のみ。確定時に行が取り直されていても置き換え元に使う） */
  snapshot?: string[];
  /** 編集を始めたときの RowSource の revision（handle の体系。確定時の applyOps に添える） */
  revision?: number;
  original: string;
  value: string;
}

export interface UseLargeTableEditingOptions {
  source: RowSource;
  /** false なら編集・挿入・削除をしない（選択の移動はできる） */
  editable: boolean;
  allocateHandle?: () => number;
}

/** 行のメニューを開いた位置（itemIdx は行の表示位置） */
export interface RowMenuPosition {
  itemIdx: number;
  top: number;
  left: number;
}

/** 行のメニュー・ショートカットの操作（RowContextMenu の value と同じ） */
export type RowAction = "insertRowAbove" | "insertRowBelow" | "deleteRow";

const isRowAction = (value: string): value is RowAction =>
  value === "insertRowAbove" || value === "insertRowBelow" || value === "deleteRow";

const ROW_SHORTCUTS: Record<string, RowAction> = {
  i: "insertRowAbove",
  b: "insertRowBelow",
  d: "deleteRow",
};

export const isTextEntry = (target: EventTarget) =>
  target instanceof HTMLElement && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");

/**
 * 大容量モードの表の選択・編集・行の挿入/削除の状態と操作。
 * 通常モードの useCellSelection / EditableCell は CSV 配列（string[][]）と TanStack に依存するため使わず、
 * 選択と、ハンドルを指定した LargeOp の送信だけを持つ。
 * - 選択は起点（anchor）と選択中のセル（focusedCell）の2点で持つ矩形（largeSelection.ts）。
 *   通常モードと同じく、ドラッグ・Shift+クリック・Shift+矢印キーで選択中のセルだけを動かして範囲を広げ、
 *   それ以外の選択（クリック・矢印キー・Tab・検索のジャンプなど）は起点も同じセルにする。範囲はデータ行だけ
 * - 選択・編集中の位置は表示位置。確定時に RowSource からハンドルを引いて LargeOp を作る
 * - 入力中の値はここで持つため、行が表示範囲から外れて編集欄が消えても失われない
 * - Ctrl / Cmd を伴うキーは、行の挿入・削除のショートカット（Ctrl+Shift+I/B/D）以外は処理しない
 *   （Ctrl+Z / Ctrl+Y / Ctrl+S は VSCode の Undo/Redo・保存に委ねる）
 */
export function useLargeTableEditing({
  source,
  editable,
  allocateHandle,
}: UseLargeTableEditingOptions) {
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [anchor, setAnchor] = useState<CellPosition | null>(null);
  // 範囲を広げるときに、描画を待たずに起点を参照する
  const anchorRef = useRef<CellPosition | null>(null);
  /** ドラッグで範囲を選択している途中か（マウスを離すと終わる） */
  const draggingRef = useRef(false);
  const [editing, setEditingState] = useState<EditingCell | null>(null);
  // 確定・キャンセルが同じ編集に2回働かないよう（Enter の後のフォーカス喪失など）同期的に参照する
  const editingRef = useRef<EditingCell | null>(null);
  /** 次の描画で選択中のセルへフォーカスを移すか */
  const focusRequestRef = useRef(false);
  const [fallbackAllocator] = useState(() => createHandleAllocator());
  const rowMenu = useContextMenu<RowMenuPosition>();

  const setEditing = useCallback((next: EditingCell | null) => {
    editingRef.current = next;
    setEditingState(next);
  }, []);

  const colCount = () => source.header.length;
  const bounds = () => ({ rowCount: source.rowCount, colCount: colCount() });
  const nextHandle = () => (allocateHandle ? allocateHandle() : fallbackAllocator.next());

  /** 起点 from と選択中のセル to の範囲を選択する（to にフォーカスを移す） */
  const selectRange = useCallback((from: CellPosition, to: CellPosition, focus = true) => {
    anchorRef.current = from;
    setAnchor(from);
    setFocusedCell(to);
    if (focus) {
      focusRequestRef.current = true;
    }
  }, []);

  /**
   * cell を選択する。extend なら起点を残して範囲を広げる
   * （起点・cell のどちらかがヘッダーなら広げず、cell だけを選択する）
   */
  const select = useCallback(
    (cell: CellPosition, focus = true, extend = false) => {
      const from = anchorRef.current;
      const canExtend =
        extend && from !== null && from.row !== HEADER_ROW && cell.row !== HEADER_ROW;
      selectRange(canExtend ? from : cell, cell, focus);
    },
    [selectRange]
  );

  // ドラッグはどこでマウスを離しても終える
  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
    };
    document.addEventListener("mouseup", stop);
    return () => document.removeEventListener("mouseup", stop);
  }, []);

  /** セルの mousedown。Shift を押していれば範囲を広げ、そうでなければそのセルからドラッグで選択を始める */
  const pressCell = (e: React.MouseEvent, cell: CellPosition) => {
    if (e.shiftKey) {
      // ブラウザの文字列の選択を始めない
      e.preventDefault();
      select(cell, true, true);
      return;
    }
    select(cell);
    draggingRef.current = e.button === 0 && cell.row !== HEADER_ROW;
  };

  /** ドラッグ中にセルへ入ったら、そのセルまで範囲を広げる */
  const enterCell = (cell: CellPosition) => {
    if (draggingRef.current) {
      select(cell, true, true);
    }
  };

  /** 選択中のセルへフォーカスを移してよければ true を返し、要求を消す */
  const takeFocusRequest = useCallback(() => {
    if (!focusRequestRef.current || editingRef.current) {
      return false;
    }
    focusRequestRef.current = false;
    return true;
  }, []);

  const apply = (ops: LargeOp[], revision?: number) => {
    source.applyOps?.(ops, revision);
  };

  /** その時点の値（ヘッダーは列名、データ行は未取得なら undefined） */
  const currentValue = (cell: CellPosition): string | undefined =>
    cell.row === HEADER_ROW ? (source.header[cell.col] ?? "") : source.getRow(cell.row)?.[cell.col];

  /**
   * cell の値を value にする op を送る。
   * base（編集を始めたときの状態）があれば、そのときのハンドルの行を置き換える。
   * 行が取り直されて同じハンドルなら最新の行を、別の行に変わっていれば編集を始めたときの行を元にする。
   * 編集を始めた後に revision が変わっていたら（保存でハンドルが振り直されたかもしれない）、
   * 同じハンドルでも別の行のことがあるので、編集を始めたときの行を元にし、そのときの revision を添えて送る
   */
  const sendValue = (cell: CellPosition, value: string, base?: EditingCell) => {
    if (cell.row === HEADER_ROW) {
      apply([setHeaderOp(source.header, cell.col, value)]);
      return;
    }
    const handle = base?.handle ?? source.getHandle(cell.row);
    const sameRevision = base?.handle === undefined || base.revision === source.revision;
    const latest =
      sameRevision && source.getHandle(cell.row) === handle ? source.getRow(cell.row) : undefined;
    const row = latest ?? base?.snapshot;
    if (handle !== undefined && row !== undefined) {
      apply(
        [setCellOp(row, handle, cell.col, value, colCount())],
        base?.handle === undefined ? undefined : base.revision
      );
    }
  };

  const startEditing = (cell: CellPosition, initial?: string) => {
    if (!editable) {
      return;
    }
    if (cell.row === HEADER_ROW) {
      const original = source.header[cell.col] ?? "";
      setEditing({ ...cell, original, value: initial ?? original });
    } else {
      const row = source.getRow(cell.row);
      const handle = source.getHandle(cell.row);
      if (row === undefined || handle === undefined) {
        return;
      }
      const original = row[cell.col] ?? "";
      setEditing({
        ...cell,
        handle,
        snapshot: row,
        revision: source.revision,
        original,
        value: initial ?? original,
      });
    }
    setFocusedCell(cell);
  };

  const changeEditingValue = (value: string) => {
    const current = editingRef.current;
    if (current) {
      setEditing({ ...current, value });
    }
  };

  /** 編集を確定する。move が "blur" ならフォーカスを奪わない（ユーザーが別の場所を選んだ） */
  const finishEditing = (move: CommitMove | "blur") => {
    const current = editingRef.current;
    if (!current) {
      return;
    }
    setEditing(null);
    if (current.value !== current.original) {
      sendValue(current, current.value, current);
    }
    const from = { row: current.row, col: current.col };
    switch (move) {
      case "blur":
        // フォーカスはユーザーが選んだ先（クリックしたセルや表の外）に任せる
        focusRequestRef.current = false;
        return;
      case "down":
        select(moveCell(from, "ArrowDown", false, bounds()) ?? from);
        return;
      case "next":
      case "prev":
        select(moveCell(from, "Tab", move === "prev", bounds()) ?? from);
        return;
      case "stay":
        select(from);
        return;
    }
  };

  const cancelEditing = () => {
    const current = editingRef.current;
    if (!current) {
      return;
    }
    setEditing(null);
    select({ row: current.row, col: current.col });
  };

  // 編集できなくなったら（インデックス作成の開始など）編集中の内容は捨てる
  useEffect(() => {
    if (!editable && editingRef.current) {
      setEditing(null);
    }
  }, [editable, setEditing]);

  const runRowAction = (action: RowAction, row: number) => {
    if (!editable) {
      return;
    }
    const col = focusedCell?.col ?? 0;
    if (action === "deleteRow") {
      const op = deleteRowOp(source, row);
      if (!op) {
        return;
      }
      apply([op]);
      const rowCount = source.rowCount;
      select(rowCount === 0 ? { row: HEADER_ROW, col } : { row: Math.min(row, rowCount - 1), col });
      return;
    }
    const where = action === "insertRowAbove" ? "above" : "below";
    const op = insertRowOp(source, row, where, nextHandle(), colCount());
    if (!op) {
      return;
    }
    apply([op]);
    select({ row: where === "above" ? row : row + 1, col });
  };

  const handleRowShortcut = (e: React.KeyboardEvent, cell: CellPosition) => {
    const action = ROW_SHORTCUTS[e.key.toLowerCase()];
    if (!editable || !e.shiftKey || e.altKey || cell.row === HEADER_ROW || !action) {
      return;
    }
    e.preventDefault();
    runRowAction(action, cell.row);
  };

  /** 表（grid）の keydown。編集欄のキーは編集欄が処理する */
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    const cell = focusedCell;
    if (editingRef.current || !cell || isTextEntry(e.target)) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      handleRowShortcut(e, cell);
      return;
    }
    if (e.altKey) {
      return;
    }
    if (e.shiftKey) {
      const extended = extendCell(cell, e.key, bounds());
      if (extended) {
        e.preventDefault();
        select(extended, true, true);
        return;
      }
    }
    const moved = moveCell(cell, e.key, e.shiftKey, bounds());
    if (moved) {
      e.preventDefault();
      select(moved);
      return;
    }
    if (!editable) {
      return;
    }
    if (isImeInputStart(e)) {
      // IME の変換を編集欄へ引き継ぐため、既定の動作は止めない
      startEditing(cell, "");
      return;
    }
    switch (e.key) {
      case "Enter":
      case "F2":
      case " ":
        e.preventDefault();
        startEditing(cell);
        return;
      case "Backspace":
        e.preventDefault();
        startEditing(cell, "");
        return;
      case "Delete": {
        e.preventDefault();
        const value = currentValue(cell);
        if (value !== undefined && value !== "") {
          sendValue(cell, "");
        }
        return;
      }
    }
    if (e.key.length === 1 && !e.repeat) {
      e.preventDefault();
      startEditing(cell, e.key);
    }
  };

  /** 行番号・セルの右クリックで行のメニューを開く */
  const openRowMenu = (e: React.MouseEvent, row: number, col?: number) => {
    if (!editable || source.getHandle(row) === undefined) {
      return;
    }
    e.preventDefault();
    select({ row, col: col ?? focusedCell?.col ?? 0 });
    rowMenu.setContextMenuProps({ itemIdx: row, top: e.clientY, left: e.clientX });
  };

  const selectRowMenu = (value: string) => {
    const row = rowMenu.contextMenuProps?.itemIdx;
    if (row !== undefined && isRowAction(value)) {
      runRowAction(value, row);
    }
  };

  const closeRowMenu = () => {
    rowMenu.setContextMenuProps(null);
  };

  return {
    focusedCell,
    anchor,
    /** 選択している範囲（データ行だけ。表の大きさには収めていない） */
    selection: selectionRange(anchor, focusedCell),
    editing,
    select,
    selectRange,
    pressCell,
    enterCell,
    takeFocusRequest,
    startEditing,
    changeEditingValue,
    finishEditing,
    cancelEditing,
    handleGridKeyDown,
    openRowMenu,
    rowMenu: {
      isOpen: rowMenu.isContextMenuOpen,
      props: rowMenu.contextMenuProps,
      ref: rowMenu.menuRef,
      select: selectRowMenu,
      close: closeRowMenu,
    },
  };
}
