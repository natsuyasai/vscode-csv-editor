import { FC } from "react";
import type { CsvParseError } from "@/utilities/csvFormat";
import styles from "./ParseErrorView.module.scss";

interface ParseErrorViewProps {
  error: CsvParseError;
  onOpenAsText: () => void;
}

/** CSVとして解析できない場合のエラー表示と、テキストエディタで開き直す導線 */
export const ParseErrorView: FC<ParseErrorViewProps> = ({ error, onOpenAsText }) => {
  return (
    <div className={styles.root} role="alert">
      <h2 className={styles.title}>CSVを解析できませんでした</h2>
      <p className={styles.detail}>
        {error.line !== undefined && <span>{error.line}行目: </span>}
        {error.message}
      </p>
      <p className={styles.hint}>
        ファイルは変更されていません。テキストエディタで開いて内容を修正してください。
      </p>
      <button type="button" className={styles.button} onClick={onOpenAsText}>
        テキストエディタで開き直す
      </button>
    </div>
  );
};
