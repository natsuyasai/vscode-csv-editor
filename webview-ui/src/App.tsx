import { InitMessage } from "@message/messageTypeToExtention";
import { Message, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { parse as csvParseSync } from "csv-parse/browser/esm/sync";
import { stringify as csvStringfy } from "csv-stringify/browser/esm/sync";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { EditableTable } from "./components/EditableTable";
import { useEventListener } from "./hooks/useEventListener";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";

export default function App() {
  const [rawText, setRawText] = useState("");
  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);
  const [theme, setTheme] = useState<ThemeKind>("light");

  const handleMessagesFromExtension = useCallback((event: MessageEvent<Message>) => {
    const message = event.data satisfies Message;
    // console.log("Received message from extension:", message);
    switch (message.type) {
      case "init":
      case "update":
        {
          const updateMessage = message as UpdateMessage;
          debounce(() => {
            updateCSVFromExtension(updateMessage.payload);
          })();
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
  }, []);

  useEventListener("message", handleMessagesFromExtension, window);

  useEffect(() => {
    vscode.postMessage({
      type: "init",
    } satisfies InitMessage);
  }, []);

  const handleApply = useCallback(() => {
    vscode.postMessage({
      type: "save",
      payload: rawText,
    });
  }, [rawText]);

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
  });

  const _handleReloadWebview = () => {
    vscode.postMessage({
      type: "reload",
      payload: rawText,
    });
  };

  function updateCSVFromExtension(text: string) {
    setRawText(text);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const records = csvParseSync(text);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setCSVArray(records);
  }

  function updateCSVArray(csv: Array<Array<string>>) {
    setCSVArray(csv);
    const text = csvStringfy(csv);
    setRawText(text);
  }

  return (
    <>
      <div className={styles.root}>
        <main className={styles.main}>
          <EditableTable
            csvArray={csvArray}
            theme={theme}
            setCSVArray={updateCSVArray}
            onApply={handleApply}
          />
        </main>
      </div>
    </>
  );
}
