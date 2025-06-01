import { Message, ThemeKind, UpdateMessage } from "@message/messageTypeToWebview";
import { parse as csvParseSync } from "csv-parse/browser/esm/sync";
import { stringify as csvStringfy } from "csv-stringify/browser/esm/sync";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { EditableTable } from "./components/EditableTable";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";

export default function App() {
  const [rawText, setRawText] = useState("");
  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);
  const [theme, setTheme] = useState<ThemeKind>("light");

  const handleMessagesFromExtension = useCallback((event: MessageEvent<Message>) => {
    if (event.data.type === "update") {
      const message = event.data as UpdateMessage;
      updateCSVFromExtension(message.payload);
    }
    if (event.data.type === "updateTheme") {
      const theme = event.data.payload as ThemeKind;
      setTheme(theme);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessagesFromExtension);

    return () => {
      window.removeEventListener("message", handleMessagesFromExtension);
    };
  }, [handleMessagesFromExtension]);

  const handleApply = useCallback(() => {
    vscode.postMessage({
      type: "save",
      payload: rawText,
    });
  }, [rawText]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toUpperCase();
      if (key === "S" && e.ctrlKey) {
        e.stopPropagation();
        handleApply();
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleApply]);

  const _handleReloadWebview = () => {
    vscode.postMessage({
      type: "reload",
      payload: rawText,
    });
  };

  window.addEventListener("message", (event) => {
    debouncedOnReceiveMessage(event);
  });

  function onReceiveMessage(event: MessageEvent) {
    const message = event.data; // The JSON data that the extension sent
    console.log("Received message from extension:", message);

    switch (message.type) {
      case "init":
      case "update":
        const updateMessage = message as UpdateMessage;
        debounce(() => {
          updateCSVFromExtension(updateMessage.payload);
        })();
        break;
      default:
        console.log("Unknown command: " + message.command);
        break;
    }
  }
  const debouncedOnReceiveMessage = debounce(onReceiveMessage);

  function updateCSVFromExtension(text: string) {
    setRawText(text);
    const records = csvParseSync(text);
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
