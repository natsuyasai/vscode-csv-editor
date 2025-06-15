import { FC, useState } from "react";
import styles from "./FilterCell.module.scss";
import { VscodeIcon } from "@vscode-elements/react-elements";

interface Props {
  columnKey: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isActive: boolean;
}

export const FilterCell: FC<Props> = ({ columnKey: _, value, onChange, onClear, isActive }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // DataGridのキーボードナビゲーションを無効化
    e.stopPropagation();

    if (e.key === "Escape") {
      onClear();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div
      className={`${styles.filterCell} ${isActive ? styles.active : ""}`}
      data-filter-cell="true">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="filter..."
        className={`${styles.filterInput} ${isFocused ? styles.focused : ""}`}
        onClick={(e) => e.stopPropagation()}
        data-filter-input="true"
      />
      {isActive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className={styles.clearButton}
          title="Clear Filter"
          data-filter-button="true">
          <VscodeIcon tabIndex={-1} name="close" action-icon />
        </button>
      )}
    </div>
  );
};
