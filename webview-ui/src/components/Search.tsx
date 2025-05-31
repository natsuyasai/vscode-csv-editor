import { VscodeButton, VscodeTextfield } from "@vscode-elements/react-elements";
import { FC, useEffect, useRef, useState } from "react";
import styles from "./Search.module.scss";

interface Props {
  onSearch: (text: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export const Search: FC<Props> = ({ onSearch, onNext, onPrevious, onClose }) => {
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<HTMLElement>(null);
  const nextButtonRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      // 入力欄にフォーカスを当てる
      inputRef.current?.shadowRoot?.querySelector("input")?.focus();
      observer.disconnect();
    });
    observer.observe(inputRef.current as Node, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
    };
  }, [inputRef]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      onSearch(searchText);
      nextButtonRef.current?.focus();
      return;
    }
  }

  function handleKeyDownForRoot(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
  }

  return (
    <>
      <div className={styles.searchRoot} onKeyDown={(e) => handleKeyDownForRoot(e)}>
        <VscodeTextfield
          ref={inputRef as never}
          autoFocus={true}
          value={searchText}
          onChange={(e) => setSearchText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => handleKeyDown(e)}></VscodeTextfield>
        <VscodeButton onClick={() => onPrevious()}>↑</VscodeButton>
        <VscodeButton ref={nextButtonRef as never} onClick={() => onNext()}>
          ↓
        </VscodeButton>
        <VscodeButton onClick={() => onClose()} secondary>
          ×
        </VscodeButton>
      </div>
    </>
  );
};
