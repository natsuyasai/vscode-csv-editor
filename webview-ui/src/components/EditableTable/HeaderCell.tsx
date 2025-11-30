import { flexRender, Header as TanStackHeader } from "@tanstack/react-table";
import { FC, useCallback, useRef, useState } from "react";
import { DraggableHeaderCell } from "./DraggableHeaderCell";
import tableStyles from "./index.module.scss";
import { RowData } from "./types";

interface HeaderCellProps {
  header: TanStackHeader<RowData, unknown>;
  headerIndex: number;
  rowIdxKey: string;
  selectedColumnIndex: number | null;
  focusedColumnIndex: number | null;
  editingHeaderIndex: number | null;
  editingHeaderValue: string;
  updateCol: (columnIndex: number, value: string) => void;
  startEditing: (columnIndex: number, value: string) => void;
  finishEditing: () => void;
  cancelEditing: () => void;
  changeEditingValue: (value: string) => void;
  setSelectedColumnIndex: (index: number | null) => void;
  setFocusedColumnIndex: (index: number | null) => void;
  openColumnContextMenu: (columnIndex: number, top: number, left: number) => void;
  handleColumnReorder: (sourceIndex: number, targetIndex: number) => void;
  onColumnResizeStart?: (columnIndex: number) => void;
  onColumnResize?: (columnIndex: number, deltaX: number) => void;
  onColumnResizeEnd?: () => void;
}

/**
 * ヘッダーセルコンポーネント
 *
 * テーブルのヘッダーセルを表示し、以下の機能を提供します：
 * - 編集モード（ダブルクリック、F2キー、文字入力）
 * - キーボードショートカット（Delete、Backspace）
 * - ソート機能
 * - 列の並び替え
 * - コンテキストメニュー
 * - 列幅のリサイズ
 */
export const HeaderCell: FC<HeaderCellProps> = ({
  header,
  headerIndex,
  rowIdxKey,
  selectedColumnIndex,
  focusedColumnIndex,
  editingHeaderIndex,
  editingHeaderValue,
  updateCol,
  startEditing,
  finishEditing,
  cancelEditing,
  changeEditingValue,
  setSelectedColumnIndex,
  setFocusedColumnIndex,
  openColumnContextMenu,
  handleColumnReorder,
  onColumnResizeStart,
  onColumnResize,
  onColumnResizeEnd,
}) => {
  const [isResizeHover, setIsResizeHover] = useState(false);
  const resizeStartX = useRef<number>(0);
  const columnIndex = header.column.id === rowIdxKey ? null : headerIndex - 1;
  const isSelected = columnIndex !== null && selectedColumnIndex === columnIndex;
  const isFocused = columnIndex !== null && focusedColumnIndex === columnIndex;
  const isEditing = columnIndex !== null && editingHeaderIndex === columnIndex;

  // キーボード処理
  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (columnIndex === null) return;

    // 編集モード中の処理
    if (isEditing) {
      // textareaのonKeyDownで処理されるため、ここでは何もしない
      return;
    }

    // 編集モードでない場合の処理
    if (e.key === "Delete") {
      // ヘッダーの値を削除
      updateCol(columnIndex, "");
    } else if (e.key === "Backspace") {
      // ヘッダーの値を削除して編集モードに移行
      updateCol(columnIndex, "");
      startEditing(columnIndex, "");
    } else if (e.key === "F2") {
      // 編集モードに移行
      const renderedHeader = flexRender(header.column.columnDef.header, header.getContext());
      let headerValue = "";
      if (typeof renderedHeader === "string") {
        headerValue = renderedHeader;
      } else if (typeof renderedHeader === "number" || typeof renderedHeader === "boolean") {
        headerValue = String(renderedHeader);
      }
      startEditing(columnIndex, headerValue);
    } else if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat && e.key.length === 1) {
      // 通常の文字入力で編集モードに移行
      e.preventDefault();
      startEditing(columnIndex, e.key);
    }
  };

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    if (columnIndex !== null) {
      e.preventDefault();
      openColumnContextMenu(columnIndex, e.clientY, e.clientX);
    }
  };

  const handleHeaderEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    } else if (e.key === "Escape") {
      cancelEditing();
    } else if (e.key === "Tab") {
      e.preventDefault();
      finishEditing();
    }
  };

  const handleHeaderEditBlur = () => {
    finishEditing();
  };

  const handleHeaderFocusChange = (focused: boolean) => {
    if (columnIndex !== null) {
      setFocusedColumnIndex(focused ? columnIndex : null);
    }
  };

  const handleHeaderDoubleClick = () => {
    if (columnIndex !== null) {
      const renderedHeader = flexRender(header.column.columnDef.header, header.getContext());
      let headerValue = "";
      if (typeof renderedHeader === "string") {
        headerValue = renderedHeader;
      } else if (typeof renderedHeader === "number" || typeof renderedHeader === "boolean") {
        headerValue = String(renderedHeader);
      }
      startEditing(columnIndex, headerValue);
    }
  };

  // リサイズハンドラーのマウスダウン
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (columnIndex === null) return;

      // ドラッグ操作を妨げないよう、イベントの伝播を停止
      e.preventDefault();
      e.stopPropagation();

      resizeStartX.current = e.clientX;
      onColumnResizeStart?.(columnIndex);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        // 累積的なdeltaXを計算（開始位置からの差分）
        const deltaX = moveEvent.clientX - resizeStartX.current;
        onColumnResize?.(columnIndex, deltaX);
      };

      const handleMouseUp = () => {
        onColumnResizeEnd?.();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columnIndex, onColumnResizeStart, onColumnResize, onColumnResizeEnd]
  );

  // リサイズハンドラーのクリックイベントを停止して、セル選択を妨げないようにする
  const handleResizeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <th
      key={header.id}
      tabIndex={-1}
      className={tableStyles.headerCell}
      onKeyDown={handleHeaderKeyDown}
      onContextMenu={handleHeaderContextMenu}
      style={{
        width: `${header.getSize()}px`,
        minWidth: `${header.getSize()}px`,
        maxWidth: `${header.getSize()}px`,
        backgroundColor: isFocused
          ? "var(--vscode-list-hoverBackground)"
          : isSelected
            ? "var(--vscode-list-activeSelectionBackground)"
            : "var(--vscode-editor-background)",
        color: isSelected ? "var(--vscode-list-activeSelectionForeground)" : "inherit",
        cursor: header.column.getCanSort() ? "pointer" : "default",
        outline: isFocused ? "2px solid var(--vscode-focusBorder)" : "none",
        position: "relative",
      }}
    >
      {header.isPlaceholder ? null : columnIndex !== null ? (
        isEditing ? (
          <textarea
            ref={(el) => {
              if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
              }
            }}
            value={editingHeaderValue}
            onChange={(e) => changeEditingValue(e.target.value)}
            onKeyDown={handleHeaderEditKeyDown}
            onBlur={handleHeaderEditBlur}
            className={tableStyles.headerEditTextarea}
          />
        ) : (
          <>
            <DraggableHeaderCell
              columnIndex={columnIndex}
              isSelected={isSelected}
              onColumnReorder={handleColumnReorder}
              onColumnSelect={setSelectedColumnIndex}
              onFocusChange={handleHeaderFocusChange}
              onDoubleClick={handleHeaderDoubleClick}
              onSort={
                header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined
              }
            >
              <div className={tableStyles.headerContent}>
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{
                  asc: " 🔼",
                  desc: " 🔽",
                }[header.column.getIsSorted() as string] ?? null}
              </div>
            </DraggableHeaderCell>
            <button
              type="button"
              className={`${tableStyles.headerResizeHandle} ${isResizeHover ? tableStyles.headerResizeHandleHover : ""}`}
              onMouseDown={handleResizeMouseDown}
              onClick={handleResizeClick}
              onMouseEnter={() => setIsResizeHover(true)}
              onMouseLeave={() => setIsResizeHover(false)}
              aria-label="列の幅を調整"
            />
          </>
        )
      ) : (
        <div className={tableStyles.headerContent}>
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      )}
    </th>
  );
};
