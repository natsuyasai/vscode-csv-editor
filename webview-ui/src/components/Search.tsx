import { VscodeButton, VscodeIcon, VscodeTextfield } from "@vscode-elements/react-elements";
import { FC, useEffect, useRef, useState } from "react";
import styles from "./Search.module.scss";

interface Props {
  isMatching?: boolean;
  machedCount: number;
  searchedSelectedItemIdx: number;
  onSearch: (text: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export const Search: FC<Props> = ({
  isMatching,
  machedCount,
  searchedSelectedItemIdx,
  onSearch,
  onNext,
  onPrevious,
  onClose,
}) => {
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

  useEffect(() => {
    function handleKeyDownForRoot(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
    }

    document.body.addEventListener("keydown", handleKeyDownForRoot);

    return () => {
      document.body.removeEventListener("keydown", handleKeyDownForRoot);
    };
  }, [onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      onSearch(searchText);
      nextButtonRef.current?.focus();
      return;
    }
  }

  return (
    <>
      <div role="search" className={styles.searchRoot}>
        <VscodeTextfield
          ref={inputRef as never}
          className={styles.searchInput}
          value={searchText}
          aria-label="Search text input"
          role="searchbox"
          tabIndex={0}
          onInput={(e) => setSearchText((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => handleKeyDown(e)}></VscodeTextfield>
        {isMatching && (
          <div className={styles.searchStatus}>
            {isMatching ? `${searchedSelectedItemIdx + 1} of ${machedCount}` : ""}
          </div>
        )}
        <VscodeButton
          aria-label="Previous search result"
          tabIndex={0}
          onClick={() => onPrevious()}
          disabled={!searchText || !isMatching}>
          <VscodeIcon name="arrow-up" action-icon />
        </VscodeButton>
        <VscodeButton
          aria-label="Next search result"
          tabIndex={0}
          ref={nextButtonRef as never}
          onClick={() => onNext()}
          disabled={!searchText || !isMatching}>
          <VscodeIcon name="arrow-down" action-icon />
        </VscodeButton>
        <VscodeButton onClick={() => onClose()} secondary aria-label="Close search" tabIndex={0}>
          <VscodeIcon name="close" action-icon />
        </VscodeButton>
      </div>
    </>
  );
};
