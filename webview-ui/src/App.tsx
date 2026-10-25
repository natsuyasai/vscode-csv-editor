import {
  InitMessage,
  OpenAsTextMessage,
  SaveMessage,
  UpdateMessage as UpdateToExtensionMessage,
} from "@message/messageTypeToExtention";
import { Message, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { stringify as csvStringfy } from "csv-stringify/browser/esm/sync";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./App.module.scss";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ParseErrorView } from "./components/common/ParseErrorView";
import { EditableTable } from "./components/editable-table/EditableTable";
import { useEventListener } from "./hooks/useEventListener";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CsvParseError, parseCsv } from "./utilities/csvFormat";
import { vscode } from "./utilities/vscode";

/** 編集内容を拡張機能(TextDocument)へ送るまでのデバウンス時間(ms) */
const SYNC_DEBOUNCE_MS = 300;

export default function App() {
  const [rawText, setRawText] = useState("");
  // 最新テキストへ同期的にアクセスするためのref
  const rawTextRef = useRef("");
  // 外部変更を受けた際にEditableTable(Undo履歴・選択状態を保持)を作り直すためのキー
  const [externalRevision, setExternalRevision] = useState(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingSync = useCallback(() => {
    if (syncTimerRef.current !== null) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const scheduleSync = useCallback(
    (text: string) => {
      cancelPendingSync();
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        vscode.postMessage({
          type: "update",
          payload: text,
        } satisfies UpdateToExtensionMessage);
      }, SYNC_DEBOUNCE_MS);
    },
    [cancelPendingSync]
  );

  useEffect(() => cancelPendingSync, [cancelPendingSync]);

  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);
  // 直近の読み込みでCSVとして解析できなかった場合のエラー（この間はテーブルを表示せず、書き換えも行わない）
  const [parseError, setParseError] = useState<CsvParseError | null>(null);
  const [theme, setTheme] = useState<ThemeKind>("light");

  // 拡張機能(TextDocument)側の内容を反映する
  const updateCSVFromExtension = useCallback(
    (text: string) => {
      // 自分の編集と同一内容なら再パースしない（選択状態等を維持）
      if (text === rawTextRef.current) {
        return;
      }
      // 外部変更が確定したので、未送信の自分の編集は破棄する
      cancelPendingSync();
      rawTextRef.current = text;
      setRawText(text);
      const result = parseCsv(text);
      if (result.ok) {
        setParseError(null);
        setCSVArray(result.rows);
      } else {
        // 解析失敗時はテーブルを破棄しエラー表示にする。拡張機能へは何も送らない
        setParseError(result.error);
        setCSVArray([]);
      }
      // 外部変更はUndo履歴の基準を壊すため、履歴ごとEditableTableを作り直してクリアする
      setExternalRevision((revision) => revision + 1);
    },
    [cancelPendingSync]
  );

  const handleMessagesFromExtension = useCallback(
    (event: MessageEvent<Message>) => {
      const message = event.data satisfies Message;
      // console.log("Received message from extension:", message);
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
            const theme = event.data.payload as ThemeKind;
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
      payload: rawTextRef.current,
    } satisfies SaveMessage);
  }, [cancelPendingSync]);

  // グローバルキーボードショートカット
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "s",
        ctrl: true,
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
      payload: rawText,
    });
  };

  function updateCSVArray(csv: Array<Array<string>>) {
    setCSVArray(csv);
    const text = csvStringfy(csv);
    rawTextRef.current = text;
    setRawText(text);
    scheduleSync(text);
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
