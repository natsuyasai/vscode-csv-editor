import { Component, ErrorInfo, ReactNode } from "react";
import styles from "./ParseErrorView.module.scss";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** エラー発生時に「テキストエディタで開き直す」を行うためのコールバック */
  onOpenAsText?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** 描画中の例外でwebviewが真っ白にならないようにするエラーバウンダリ */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("csv-editor: render error", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    return (
      <div className={styles.root} role="alert">
        <h2 className={styles.title}>表示中にエラーが発生しました</h2>
        <p className={styles.detail}>{error.message}</p>
        <p className={styles.hint}>ファイルは変更されていません。</p>
        {this.props.onOpenAsText && (
          <button type="button" className={styles.button} onClick={this.props.onOpenAsText}>
            テキストエディタで開き直す
          </button>
        )}
      </div>
    );
  }
}
