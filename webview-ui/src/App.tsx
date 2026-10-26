import {
  ApplyOpsMessage,
  InitMessage,
  OpenAsTextMessage,
  SaveMessage,
} from "@message/messageTypeToExtension";
import { isMessageToWebview, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import type { RowOp } from "@shared/csv/ops";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./App.module.scss";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ParseErrorView } from "./components/common/ParseErrorView";
import { EditableTable } from "./components/editable-table/EditableTable";
import { useEventListener } from "./hooks/useEventListener";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CsvParseError, parseCsv } from "./utilities/csvFormat";
import { diffRows } from "./utilities/diffRows";
import { vscode } from "./utilities/vscode";

/** 編集内容を拡張機能(TextDocument)へ送るまでのデバウンス時間(ms) */
const SYNC_DEBOUNCE_MS = 300;

export default function App() {
  // 差分の基準になる最新のCSV行データ（ヘッダー行を含むファイル上の行と同じ並び）。
  // 編集のたびにこの配列と比べて、変わった行の範囲だけを操作にする
  const latestRowsRef = useRef<Array<Array<string>>>([]);
  // 拡張機能へ未送信の操作。順序を保ってためておき、デバウンス後にまとめて送る
  const pendingOpsRef = useRef<RowOp[]>([]);
  // 最後に受け取った全文の世代。送る操作に付けて、拡張機能が古い前提の操作を検出できるようにする
  const epochRef = useRef(0);
  // 外部変更を受けた際にEditableTable(Undo履歴・選択状態を保持)を作り直すためのキー
  const [externalRevision, setExternalRevision] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSync = useCallback(() => {
    if (syncTimerRef.current !== null) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  /** デバウンスを取り消し、未送信の操作を破棄する */
  const discardPendingOps = useCallback(() => {
    cancelPendingSync();
    pendingOpsRef.current = [];
  }, [cancelPendingSync]);

  /** デバウンスを取り消し、未送信の操作があればすぐに送る */
  const flushPendingOps = useCallback(() => {
    cancelPendingSync();
    const ops = pendingOpsRef.current;
    if (ops.length === 0) {
      return;
    }
    pendingOpsRef.current = [];
    const message: ApplyOpsMessage = { type: "applyOps", epoch: epochRef.current, ops };
    vscode.postMessage(message);
  }, [cancelPendingSync]);

  const scheduleSync = useCallback(() => {
    cancelPendingSync();
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      flushPendingOps();
    }, SYNC_DEBOUNCE_MS);
  }, [cancelPendingSync, flushPendingOps]);

  useEffect(() => cancelPendingSync, [cancelPendingSync]);

  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);
  // 直近の読み込みでCSVとして解析できなかった場合のエラー（この間はテーブルを表示せず、書き換えも行わない）
  const [parseError, setParseError] = useState<CsvParseError | null>(null);
  const [theme, setTheme] = useState<ThemeKind>("light");

  // 拡張機能(TextDocument)側の内容を反映する。届いた全文は常に正とする
  const updateCSVFromExtension = useCallback(
    (text: string, epoch: number) => {
      // 未送信の自分の編集は古い前提になったので破棄する（拡張機能も古いエポックの操作は適用しない）
      discardPendingOps();
      epochRef.current = epoch;
      const result = parseCsv(text);
      if (result.ok) {
        setParseError(null);
        latestRowsRef.current = result.rows;
        setCSVArray(result.rows);
      } else {
        // 解析失敗時はテーブルを破棄しエラー表示にする。拡張機能へは何も送らない
        setParseError(result.error);
        latestRowsRef.current = [];
        setCSVArray([]);
      }
      // 外部変更はUndo履歴の基準を壊すため、履歴ごとEditableTableを作り直してクリアする
      setExternalRevision((revision) => revision + 1);
    },
    [discardPendingOps]
  );

  const handleMessagesFromExtension = useCallback(
    (event: MessageEvent<unknown>) => {
      // 想定外のメッセージ（他の送信元・不正な形式）は無視する
      if (!isMessageToWebview(event.data)) {
        return;
      }
      const message = event.data;
      switch (message.type) {
        case "init":
        case "update":
          {
            const updateMessage = message as UpdateMessage;
            updateCSVFromExtension(updateMessage.payload ?? "", updateMessage.epoch);
          }
          break;
        case "updateTheme":
          {
            const theme = message.payload as ThemeKind;
            setTheme(theme);
          }
          break;
        default:
          console.log(`Unknown command: ${message.type as string}`);
          break;
      }
    },
    [updateCSVFromExtension]
  );

  useEventListener("message", handleMessagesFromExtension, window);

  useEffect(() => {
    vscode.postMessage({
      type: "init",
    } satisfies InitMessage);
  }, []);

  const handleApply = useCallback(() => {
    // 未送信の操作を先に送り、拡張機能がそれを反映してから保存できるようにする
    flushPendingOps();
    vscode.postMessage({ type: "save" } satisfies SaveMessage);
  }, [flushPendingOps]);

  // グローバルキーボードショートカット
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "s",
        mod: true,
        handler: () => handleApply(),
        stopPropagation: true,
        preventDefault: true,
      },
    ],
    element: window as unknown as HTMLElement,
  });

  const handleOpenAsText = useCallback(() => {
    discardPendingOps();
    vscode.postMessage({ type: "openAsText" } satisfies OpenAsTextMessage);
  }, [discardPendingOps]);

  function updateCSVArray(csv: Array<Array<string>>) {
    // 変更していない行は同じ参照のまま渡ってくるため、参照の比較で変わった行の範囲が分かる
    const ops = diffRows(latestRowsRef.current, csv);
    latestRowsRef.current = csv;
    setCSVArray(csv);
    if (ops.length === 0) {
      return;
    }
    pendingOpsRef.current.push(...ops);
    scheduleSync();
  }

  return (
    <ErrorBoundary onOpenAsText={handleOpenAsText}>
      <div className={styles.root}>
        <main className={styles.main}>
          {parseError ? (
            <ParseErrorView error={parseError} onOpenAsText={handleOpenAsText} />
          ) : (
            <EditableTable
              key={externalRevision}
              csvArray={csvArray}
              theme={theme}
              setCSVArray={updateCSVArray}
              onApply={handleApply}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
