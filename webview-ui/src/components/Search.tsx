import { VscodeButton, VscodeTextfield } from "@vscode-elements/react-elements";
import { FC, useRef, useState } from "react";
import styles from "./Search.module.scss";

interface Props {
  onSearch: (text: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export const Search: FC<Props> = ({ onSearch, onNext, onPrevious, onClose }) => {
  const [searchText, setSearchText] = useState("");
  const nextButtonRef = useRef<any>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      onSearch(searchText);
      nextButtonRef.current?.focus();
      return;
    }
    if (e.key === "Escape") {
      onClose();
      return;
    }
  }

  return (
    <>
      <div className={styles.searchRoot}>
        <VscodeTextfield
          value={searchText}
          onChange={(e) => setSearchText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => handleKeyDown(e)}></VscodeTextfield>
        <VscodeButton onClick={() => onPrevious()}>↑</VscodeButton>
        <VscodeButton ref={nextButtonRef} onClick={() => onNext()}>
          ↓
        </VscodeButton>
        <VscodeButton onClick={() => onClose()} secondary>
          ×
        </VscodeButton>
      </div>
    </>
  );
};
