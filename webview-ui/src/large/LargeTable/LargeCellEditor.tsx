import { useEffect, useLayoutEffect, useRef } from "react";
import { isImeComposing } from "../../utilities/ime";
import styles from "./LargeTable.module.scss";

/** 確定後の選択の移動（down: 下へ / next: 右へ / prev: 左へ / stay: 移動しない） */
export type CommitMove = "down" | "next" | "prev" | "stay";

export interface LargeCellEditorProps {
  value: string;
  /** スクリーンリーダー向けの名前（セル用・ヘッダー用で分ける） */
  label: string;
  /** true なら複数行のテキストエリア（セル）、false なら1行の入力欄（ヘッダー） */
  multiline: boolean;
  onChange: (value: string) => void;
  onCommit: (move: CommitMove) => void;
  onCancel: () => void;
  /** フォーカスが外れたとき（確定する） */
  onBlur: () => void;
}

/**
 * 大容量モードの表のセル・ヘッダーの編集欄（通常モードの EditableCell と同じキー操作）。
 * - Enter で確定（セルは下へ移る。Shift+Enter はセル内の改行）、Tab / Shift+Tab で確定して左右へ移る
 * - Esc でキャンセル。IME の変換中のキーは使わない
 * - Ctrl+Z などの修飾キーの組み合わせは処理も既定動作の抑止もしない（VSCode の Undo に委ねる）
 * 入力中の値は表（LargeTable）が持つため、行がスクロールで表示範囲から外れても失われない
 */
export function LargeCellEditor({
  value,
  label,
  multiline,
  onChange,
  onCommit,
  onCancel,
  onBlur,
}: LargeCellEditorProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const element = multiline ? textAreaRef.current : inputRef.current;
    if (element) {
      element.focus();
      const end = element.value.length;
      element.setSelectionRange(end, end);
    }
    // 表示されたとき（行が表示範囲に戻ったときを含む）だけフォーカスする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 内容に合わせてテキストエリアの高さを広げる（最小は行の高さ）
  useLayoutEffect(() => {
    const element = textAreaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${String(element.scrollHeight)}px`;
    }
  }, [value]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (isImeComposing(e)) {
      return;
    }
    if (e.key === "Enter" && !(multiline && e.shiftKey) && !e.altKey) {
      e.preventDefault();
      onCommit(multiline && !e.ctrlKey && !e.metaKey ? "down" : "stay");
    } else if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onCommit(e.shiftKey ? "prev" : "next");
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  if (multiline) {
    return (
      <textarea
        ref={textAreaRef}
        aria-label={label}
        className={styles.cellEditor}
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
      />
    );
  }
  return (
    <input
      ref={inputRef}
      type="text"
      aria-label={label}
      className={styles.headerEditor}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onBlur}
    />
  );
}
