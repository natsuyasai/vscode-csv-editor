import { VscodeButton, VscodeIcon, VscodeTextfield } from "@vscode-elements/react-elements";
import { FC, useEffect, useRef, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { isImeComposing } from "@/utilities/ime";
import styles from "./Search.module.scss";

export interface SearchProps {
  isMatching?: boolean;
  /** 前へ/次へを押せるか。省略時は isMatching と同じ（一致件数を持たない呼び出し側が指定する） */
  canNavigate?: boolean;
  /** 状態表示の差し替え。指定すると「N of M」の代わりに表示する（一致件数を持たない呼び出し側向け） */
  statusText?: string;
  machedCount: number;
  searchedSelectedItemIdx: number;
  onSearch: (text: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

export const Search: FC<SearchProps> = ({
  isMatching,
  canNavigate,
  statusText,
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
  const navigable = canNavigate ?? isMatching;

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

  // Escapeキーでダイアログを閉じる
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "Escape",
        handler: () => onClose(),
      },
    ],
    element: document.body,
  });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      // IME変換確定のEnterでは検索しない
      if (isImeComposing(e)) {
        return;
      }
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
          onKeyDown={(e) => handleKeyDown(e)}
        ></VscodeTextfield>
        {(statusText !== undefined || isMatching) && (
          <div className={styles.searchStatus} role="status">
            {statusText ?? `${searchedSelectedItemIdx + 1} of ${machedCount}`}
          </div>
        )}
        <VscodeButton
          aria-label="Previous search result"
          tabIndex={0}
          onClick={() => onPrevious()}
          disabled={!searchText || !navigable}
        >
          <VscodeIcon name="arrow-up" action-icon />
        </VscodeButton>
        <VscodeButton
          aria-label="Next search result"
          tabIndex={0}
          ref={nextButtonRef as never}
          onClick={() => onNext()}
          disabled={!searchText || !navigable}
        >
          <VscodeIcon name="arrow-down" action-icon />
        </VscodeButton>
        <VscodeButton onClick={() => onClose()} secondary aria-label="Close search" tabIndex={0}>
          <VscodeIcon name="close" action-icon />
        </VscodeButton>
      </div>
    </>
  );
};
