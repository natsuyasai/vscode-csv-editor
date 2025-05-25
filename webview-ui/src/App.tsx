import { Message, UpdateMessage } from "@message/messageTypeToWebview";
import { VscodeDivider } from "@vscode-elements/react-elements";
import { parse as csvParseSync } from "csv-parse/browser/esm/sync";
import { stringify as csvStringfy } from "csv-stringify/browser/esm/sync";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { EditableTable } from "./components/EditableTable";
import { Header } from "./components/Header";
import { RowSizeType } from "./types";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";

export default function App() {
  const [rawText, setRawText] = useState("");
  const [csvArray, setCSVArray] = useState<Array<Array<string>>>([]);

  const handleMessagesFromExtension = useCallback(
    (event: MessageEvent<Message>) => {
      if (event.data.type === "update") {
        const message = event.data as UpdateMessage;
        updateCSVFromExtension(message.payload);
      }
    },
    [rawText]
  );
  useEffect(() => {
    window.addEventListener("message", handleMessagesFromExtension);

    return () => {
      window.removeEventListener("message", handleMessagesFromExtension);
    };
  }, [handleMessagesFromExtension]);

  function handleKeyDown(e: KeyboardEvent) {
    const key = e.key.toUpperCase();
    if (key === "S" && e.ctrlKey) {
      e.stopPropagation();
      handleApply();
      return;
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleReloadWebview = () => {
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

  function handleApply() {
    vscode.postMessage({
      type: "save",
      payload: rawText,
    });
  }

  function updateCSVArray(csv: Array<Array<string>>) {
    setCSVArray(csv);
    const text = csvStringfy(csv);
    setRawText(text);
  }

  const [isIgnoreHeaderRow, setIsIgnoreHeaderRow] = useState(false);
  const [rowSize, setRowSize] = useState<RowSizeType>("normal");

  return (
    <>
      <div className={styles.root}>
        <header className={styles.header}>
          <Header
            isIgnoreHeaderRow={isIgnoreHeaderRow}
            onUpdateIgnoreHeaderRow={setIsIgnoreHeaderRow}
            rowSize={rowSize}
            onUpdateRowSize={setRowSize}
            onClickApply={handleApply}
          />
          <VscodeDivider className={styles.divider} />
        </header>
        <main className={styles.main}>
          <EditableTable
            csvArray={csvArray}
            isIgnoreHeaderRow={isIgnoreHeaderRow}
            rowSize={rowSize}
            setCSVArray={updateCSVArray}></EditableTable>
        </main>
      </div>
    </>
  );
}
