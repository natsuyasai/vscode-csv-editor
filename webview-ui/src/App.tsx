import {
  InitMessage,
  OpenAsTextMessage,
  SaveMessage,
  UpdateMessage as UpdateToExtensionMessage,
} from "@message/messageTypeToExtention";
import { isMessageToWebview, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./App.module.scss";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ParseErrorView } from "./components/common/ParseErrorView";
import { EditableTable } from "./components/editable-table/EditableTable";
import { useEventListener } from "./hooks/useEventListener";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  CsvFormat,
  CsvParseError,
  DEFAULT_CSV_FORMAT,
  parseCsv,
  stringifyCsv,
} from "./utilities/csvFormat";
import { vscode } from "./utilities/vscode";

/** 編集内容を拡張機能(TextDocument)へ送るまでのデバウンス時間(ms) */
const SYNC_DEBOUNCE_MS = 300;

export default function App() {
  // 最新のCSV行データ。編集のたびに全体を文字列化すると大きなCSVで重くなるため、
  // テキストは必要になった時(送信・保存・外部変更との比較)に生成してキャッシュする
  const latestRowsRef = useRef<Array<Array<string>>>([]);
  // 最新テキストのキャッシュ。null の場合は latestRowsRef から生成する
  const rawTextCacheRef = useRef<string | null>("");
  // 外部変更を受けた際にEditableTable(Undo履歴・選択状態を保持)を作り直すためのキー
  const [externalRevision, setExternalRevision] = useState(0);
  // 読み込み時に検出した書式。保存(update送信)時に同じ形式で出力する
  const csvFormatRef = useRef<CsvFormat>(DEFAULT_CSV_FORMAT);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getRawText = useCallback((): string => {
    if (rawTextCacheRef.current === null) {
      rawTextCacheRef.current = stringifyCsv(latestRowsRef.current, csvFormatRef.current);
    }
    return rawTextCacheRef.current;
  }, []);

  const cancelPendingSync = useCallback(() => {
    if (syncTimerRef.current !== null) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const scheduleSync = useCallback(() => {
    cancelPendingSync();
    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null;
      vscode.postMessage({
        type: "update",
        payload: getRawText(),
      } satisfies UpdateToExtensionMessage);
    }, SYNC_DEBOUNCE_MS);
  }, [cancelPendingSync, getRawText]);

  useEffect(() => cancelPendingSync, [cancelPendingSync]);

  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);
  // 直近の読み込みでCSVとして解析できなかった場合のエラー（この間はテーブルを表示せず、書き換えも行わない）
  const [parseError, setParseError] = useState<CsvParseError | null>(null);
  const [theme, setTheme] = useState<ThemeKind>("light");

  // 拡張機能(TextDocument)側の内容を反映する
  const updateCSVFromExtension = useCallback(
    (text: string) => {
      // 自分の編集と同一内容なら再パースしない（選択状態等を維持）
      if (text === getRawText()) {
        return;
      }
      // 外部変更が確定したので、未送信の自分の編集は破棄する
      cancelPendingSync();
      rawTextCacheRef.current = text;
      const result = parseCsv(text);
      if (result.ok) {
        setParseError(null);
        csvFormatRef.current = result.format;
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
    [cancelPendingSync, getRawText]
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
            updateCSVFromExtension(updateMessage.payload);
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
    // 保留中のデバウンス更新は保存メッセージに含まれるため破棄する
    cancelPendingSync();
    vscode.postMessage({
      type: "save",
      payload: getRawText(),
    } satisfies SaveMessage);
  }, [cancelPendingSync, getRawText]);

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
    cancelPendingSync();
    vscode.postMessage({ type: "openAsText" } satisfies OpenAsTextMessage);
  }, [cancelPendingSync]);

  const _handleReloadWebview = () => {
    vscode.postMessage({
      type: "reload",
      payload: getRawText(),
    });
  };

  function updateCSVArray(csv: Array<Array<string>>) {
    setCSVArray(csv);
    latestRowsRef.current = csv;
    rawTextCacheRef.current = null;
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
