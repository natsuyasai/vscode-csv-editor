import type { ThemeKind } from "@message/messageTypeToWebview";
import {
  elementScroll,
  observeElementRect,
  useVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RowContextMenu } from "../../components/table-row/RowContextMenu";
import type { RowSource } from "../rowSource/RowSource";
import { useRowSource } from "../rowSource/useRowSource";
import { HEADER_ROW, revealOffset } from "./cellNavigation";
import { LargeCellEditor } from "./LargeCellEditor";
import styles from "./LargeTable.module.scss";
import { computeScrollScale, rowDomTop, toDomOffset, toVirtualOffset } from "./scrollScaling";
import { useLargeTableEditing } from "./useLargeTableEditing";

/** 行の高さ（通常モードの既定「normal」と同じ） */
export const LARGE_ROW_HEIGHT = 40;
/** 固定ヘッダーの高さ */
export const LARGE_HEADER_HEIGHT = 40;
/** 列幅（通常モードの既定と同じ） */
export const LARGE_COLUMN_WIDTH = 150;
/** 表示範囲の前後に余分に描画する行数 */
const OVERSCAN = 10;

/** 行番号列の幅。桁数に合わせて広げる（最小 40px は通常モードと同じ） */
const rowIndexWidth = (rowCount: number) => Math.max(40, String(rowCount).length * 8 + 16);

export interface LargeTableProps {
  source: RowSource;
  theme: ThemeKind;
  /** true なら編集・行の挿入/削除をしない（インデックス作成中）。選択の移動はできる */
  readOnly?: boolean;
  /** 追加行の負のハンドルを採番する（省略時はこの表の中で -1 から順に） */
  allocateHandle?: () => number;
}

/** セルの DOM を探すためのキー（ヘッダーは行 -1） */
const cellKey = (row: number, col: number) => `${String(row)}:${String(col)}`;

type ScrollCallback = () => void;

/**
 * 大容量モードの表。
 * - `@tanstack/react-virtual` で表示範囲の行だけを描画し、その範囲を `source.ensureRange` で要求する
 * - 未取得の行は読み込み中（aria-busy）のプレースホルダーで表示する
 * - 行数×行高がブラウザの最大要素高を超える場合は、DOM 上の高さを上限に収め、
 *   スクロール位置を比例で変換する（scrollScaling.ts）。これで末尾行までスクロールバーで移動できる
 * - 単一セルの選択（クリック・矢印キー・Tab）、セル・ヘッダーの編集、行の挿入・削除
 *   （行番号・セルの右クリックメニュー、Ctrl+Shift+I/B/D）。編集は source.applyOps に渡す
 *   （useLargeTableEditing.ts）。source が applyOps を持たない・readOnly のときは選択だけ
 * - 列の挿入・削除、行・列のドラッグ&ドロップ、オートフィルは出さない（大容量モードでは使えない）
 */
export function LargeTable({ source, theme, readOnly = false, allocateHandle }: LargeTableProps) {
  useRowSource(source);
  const rowCount = source.rowCount;
  const header = source.header;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scale = useMemo(
    () => computeScrollScale(rowCount, LARGE_ROW_HEIGHT, viewportHeight),
    [rowCount, viewportHeight]
  );
  // 仮想スクローラのコールバック（描画外で呼ばれる）から最新のスケールを参照する
  const scaleRef = useRef(scale);
  const reportOffsetRef = useRef<ScrollCallback | null>(null);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LARGE_ROW_HEIGHT,
    overscan: OVERSCAN,
    // 表示領域の高さから固定ヘッダーの分を除く
    observeElementRect: (instance: Virtualizer<HTMLDivElement, HTMLTableRowElement>, cb) =>
      observeElementRect(instance, (rect) => {
        const height = Math.max(0, rect.height - LARGE_HEADER_HEIGHT);
        setViewportHeight(height);
        cb({ width: rect.width, height });
      }),
    // DOM のスクロール位置を仮想のスクロール位置に変換して渡す。
    // 仮想スクローラが DOM の最大スクロール量と比べて補正しないよう、isScrolling は常に false で渡す
    observeElementOffset: (instance, cb) => {
      const element = instance.scrollElement;
      if (!element) {
        return;
      }
      const report = () => cb(toVirtualOffset(element.scrollTop, scaleRef.current), false);
      reportOffsetRef.current = report;
      report();
      element.addEventListener("scroll", report, { passive: true });
      return () => {
        element.removeEventListener("scroll", report);
        reportOffsetRef.current = null;
      };
    },
    scrollToFn: (offset, options, instance) =>
      elementScroll(toDomOffset(offset, scaleRef.current), options, instance),
  });

  // 行数・表示領域が変わると変換の比率が変わるため、現在の DOM 位置から仮想位置を取り直す
  useLayoutEffect(() => {
    scaleRef.current = scale;
    reportOffsetRef.current?.();
  }, [scale]);

  const items = virtualizer.getVirtualItems();
  const firstIndex = items.length > 0 ? items[0].index : 0;
  const lastIndex = items.length > 0 ? items[items.length - 1].index : -1;

  useEffect(() => {
    if (lastIndex >= firstIndex) {
      source.ensureRange(firstIndex, lastIndex + 1);
    }
  }, [source, firstIndex, lastIndex]);

  const editable = !readOnly && source.applyOps !== undefined;
  const {
    focusedCell,
    editing,
    select,
    takeFocusRequest,
    startEditing,
    changeEditingValue,
    finishEditing,
    cancelEditing,
    handleGridKeyDown,
    openRowMenu,
    rowMenu,
  } = useLargeTableEditing({ source, editable, allocateHandle });

  // 選択したセルが表示領域の外なら、その行が見える位置までスクロールする。
  // スクロール位置は仮想座標で計算し、DOM の位置へ変換して設定する（ジャンプと同じ方法）
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!focusedCell || !element) {
      return;
    }
    const target = revealOffset(
      focusedCell.row,
      LARGE_ROW_HEIGHT,
      toVirtualOffset(element.scrollTop, scaleRef.current),
      viewportHeight
    );
    if (target !== null) {
      element.scrollTop = toDomOffset(target, scaleRef.current);
      reportOffsetRef.current?.();
    }
    // 選択が変わったときだけ動かす（スクロール中に選択位置へ引き戻さない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedCell]);

  // 選択したセルへフォーカスを移す。行がまだ描画されていなければ、描画された後の描画で移す
  useEffect(() => {
    if (!focusedCell) {
      return;
    }
    const element = scrollRef.current?.querySelector<HTMLElement>(
      `[data-cell="${cellKey(focusedCell.row, focusedCell.col)}"]`
    );
    if (element && takeFocusRequest()) {
      element.focus();
    }
  });

  const isFocused = (row: number, col: number) =>
    focusedCell !== null && focusedCell.row === row && focusedCell.col === col;
  const editorFor = (row: number, col: number, multiline: boolean) =>
    editing !== null && editing.row === row && editing.col === col ? (
      <LargeCellEditor
        value={editing.value}
        label={multiline ? "セルの編集" : "列名の編集"}
        multiline={multiline}
        onChange={changeEditingValue}
        onCommit={finishEditing}
        onCancel={cancelEditing}
        onBlur={() => finishEditing("blur")}
      />
    ) : null;
  const cellClass = (row: number, col: number, base: string) =>
    [
      base,
      isFocused(row, col) ? styles.selected : "",
      editing?.row === row && editing.col === col ? styles.editing : "",
    ]
      .filter(Boolean)
      .join(" ");

  const virtualOffset = virtualizer.scrollOffset ?? 0;
  const domOffset = toDomOffset(virtualOffset, scale);
  const indexWidth = rowIndexWidth(rowCount);
  const tableWidth = indexWidth + header.length * LARGE_COLUMN_WIDTH;
  const columnStyle = {
    width: `${String(LARGE_COLUMN_WIDTH)}px`,
    minWidth: `${String(LARGE_COLUMN_WIDTH)}px`,
    maxWidth: `${String(LARGE_COLUMN_WIDTH)}px`,
  };
  const indexStyle = {
    width: `${String(indexWidth)}px`,
    minWidth: `${String(indexWidth)}px`,
    maxWidth: `${String(indexWidth)}px`,
  };

  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label="大容量CSVの表"
      className={[styles.scroller, theme === "light" ? "rdg-light" : "rdg-dark"].join(" ")}
    >
      <table
        // セルを選択・編集する表なので grid にする（table への role="grid" は ARIA の想定どおりの使い方）
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
        role="grid"
        aria-rowcount={rowCount + 1}
        aria-colcount={header.length + 1}
        aria-readonly={!editable}
        tabIndex={-1}
        className={styles.table}
        style={{ width: `${String(tableWidth)}px` }}
        onKeyDown={handleGridKeyDown}
      >
        <thead className={styles.thead} style={{ height: `${String(LARGE_HEADER_HEIGHT)}px` }}>
          <tr className={styles.row}>
            <th scope="col" className={styles.indexHeader} style={indexStyle}>
              <span className={styles.visuallyHidden}>行番号</span>
            </th>
            {header.map((name, col) => (
              <th
                // 列名は重複しうるため位置をキーにする
                key={col}
                scope="col"
                aria-selected={isFocused(HEADER_ROW, col)}
                tabIndex={isFocused(HEADER_ROW, col) ? 0 : -1}
                data-cell={cellKey(HEADER_ROW, col)}
                className={cellClass(HEADER_ROW, col, styles.headerCell)}
                style={columnStyle}
                title={name}
                onMouseDown={() => select({ row: HEADER_ROW, col })}
                onDoubleClick={() => startEditing({ row: HEADER_ROW, col })}
              >
                {editorFor(HEADER_ROW, col, false) ?? name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody} style={{ height: `${String(scale.domHeight)}px` }}>
          {items.map((item) => {
            const row = source.getRow(item.index);
            const top = rowDomTop(item.start, virtualOffset, domOffset);
            return (
              <tr
                key={item.index}
                className={styles.row}
                aria-busy={row === undefined ? "true" : undefined}
                aria-rowindex={item.index + 2}
                style={{
                  height: `${String(LARGE_ROW_HEIGHT)}px`,
                  transform: `translateY(${String(top)}px)`,
                  // 編集欄は内容に合わせて下の行へはみ出すため、前面に出す
                  zIndex: editing?.row === item.index ? 1 : undefined,
                }}
              >
                <th
                  scope="row"
                  role="rowheader"
                  className={styles.indexCell}
                  style={indexStyle}
                  onContextMenu={(e) => openRowMenu(e, item.index)}
                >
                  {item.index + 1}
                </th>
                {header.map((_, col) => (
                  <td
                    key={col}
                    role="gridcell"
                    aria-selected={isFocused(item.index, col)}
                    tabIndex={isFocused(item.index, col) ? 0 : -1}
                    data-cell={cellKey(item.index, col)}
                    className={cellClass(item.index, col, styles.cell)}
                    style={columnStyle}
                    onMouseDown={() => select({ row: item.index, col })}
                    onDoubleClick={() => startEditing({ row: item.index, col })}
                    onContextMenu={(e) => openRowMenu(e, item.index, col)}
                  >
                    {editorFor(item.index, col, true) ??
                      (row === undefined ? (
                        <span className={styles.placeholder} aria-hidden="true" />
                      ) : (
                        <div className={styles.cellText} title={row[col] ?? ""}>
                          {row[col] ?? ""}
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <RowContextMenu
        isContextMenuOpen={rowMenu.isOpen}
        menuRef={rowMenu.ref}
        contextMenuProps={rowMenu.props}
        onSelect={rowMenu.select}
        onClose={rowMenu.close}
      />
    </div>
  );
}
