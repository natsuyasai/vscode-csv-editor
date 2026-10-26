import type { ThemeKind } from "@message/messageTypeToWebview";
import {
  elementScroll,
  observeElementRect,
  useVirtualizer,
  type Virtualizer,
} from "@tanstack/react-virtual";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RowSource } from "../rowSource/RowSource";
import { useRowSource } from "../rowSource/useRowSource";
import styles from "./LargeTable.module.scss";
import { computeScrollScale, rowDomTop, toDomOffset, toVirtualOffset } from "./scrollScaling";

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
}

type ScrollCallback = () => void;

/**
 * 大容量モードの表（閲覧専用）。
 * - `@tanstack/react-virtual` で表示範囲の行だけを描画し、その範囲を `source.ensureRange` で要求する
 * - 未取得の行は読み込み中（aria-busy）のプレースホルダーで表示する
 * - 行数×行高がブラウザの最大要素高を超える場合は、DOM 上の高さを上限に収め、
 *   スクロール位置を比例で変換する（scrollScaling.ts）。これで末尾行までスクロールバーで移動できる
 */
export function LargeTable({ source, theme }: LargeTableProps) {
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
      <table className={styles.table} style={{ width: `${String(tableWidth)}px` }}>
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
                className={styles.headerCell}
                style={columnStyle}
                title={name}
              >
                {name}
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
                }}
              >
                <th scope="row" className={styles.indexCell} style={indexStyle}>
                  {item.index + 1}
                </th>
                {header.map((_, col) => (
                  <td key={col} className={styles.cell} style={columnStyle}>
                    {row === undefined ? (
                      <span className={styles.placeholder} aria-hidden="true" />
                    ) : (
                      <div className={styles.cellText} title={row[col] ?? ""}>
                        {row[col] ?? ""}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
