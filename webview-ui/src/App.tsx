import { Message, UpdateMessage } from "@message/messageTypeToWebview";
import { VscodeButton, VscodeDivider } from "@vscode-elements/react-elements";
import { useCallback, useEffect, useState } from "react";
import styles from "./App.module.scss";
import { EditableTableRoot } from "./components/EditableTableRoot";
import { debounce } from "./utilities/debounce";
import { vscode } from "./utilities/vscode";
import { parse as csvParseSync } from "csv-parse/browser/esm/sync";

function App() {
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
    window.addEventListener("message", (event: MessageEvent<Message>) => {
      handleMessagesFromExtension(event);
    });

    return () => {
      window.removeEventListener("message", handleMessagesFromExtension);
    };
  }, [handleMessagesFromExtension]);

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
      payload: csvArray.join("\n"),
    });
  }

  function updateCSVArray(csv: Array<Array<string>>) {
    setCSVArray(csv);
    setRawText(csv.join("\n"));
  }

  return (
    <main className={styles.main}>
      <EditableTableRoot csvArray={csvArray} setCSVArray={updateCSVArray}></EditableTableRoot>
      <VscodeDivider className={styles.divider} />
      <div className={styles.footer}>
        <VscodeButton className={styles.applyButton} onClick={handleApply}>
          Apply
        </VscodeButton>
      </div>
    </main>
  );
}

export default App;
