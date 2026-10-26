import { useId, useState, type ReactNode } from "react";
import styles from "./LargeModeBanner.module.scss";

export interface LargeModeBannerProps {
  /** 制限している機能の表示名一覧（拡張機能の `large/init` の restrictions） */
  restrictions: string[];
  /** 読み込みに使った文字コード */
  encoding: string;
  /** 行インデックス作成の進捗（0〜1）。作成中でなければ null */
  indexingRatio: number | null;
  /** ソートのキャンセルなど、操作ボタンを置くスロット（2-3 で使う） */
  actions?: ReactNode;
}

/**
 * 大容量モードであること、制限している機能の一覧、行インデックスの作成状況を表示するバナー。
 */
export function LargeModeBanner({
  restrictions,
  encoding,
  indexingRatio,
  actions,
}: LargeModeBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const percent = indexingRatio === null ? null : Math.round(indexingRatio * 100);

  return (
    <section className={styles.container} aria-label="大容量モード">
      <div className={styles.summary}>
        <span className={styles.title}>大容量モード（一部機能制限中）</span>
        <span className={styles.encoding}>文字コード: {encoding}</span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span
            className={`codicon ${expanded ? "codicon-chevron-down" : "codicon-chevron-right"}`}
            aria-hidden="true"
          />
          制限している機能
        </button>
        {percent !== null && (
          <span className={styles.progress}>
            <progress
              className={styles.progressBar}
              aria-label="行インデックスを作成中"
              max={100}
              value={percent}
            />
            <span>行インデックスを作成中 {percent}%</span>
          </span>
        )}
        {actions && <span className={styles.actions}>{actions}</span>}
      </div>
      {expanded && (
        <ul id={listId} className={styles.list} aria-label="制限している機能">
          {restrictions.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
