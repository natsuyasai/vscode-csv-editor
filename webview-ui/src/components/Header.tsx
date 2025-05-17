import { VscodeButton, VscodeCheckbox } from "@vscode-elements/react-elements";
import { FC, useState } from "react";
import styles from "./Header.module.scss";

interface Props {
  isIgnoreHeaderRow: boolean;
  onUpdateIgnoreHeaderRow: (checked: boolean) => void;
  onClickApply: () => void;
}

const Header: FC<Props> = ({ isIgnoreHeaderRow, onUpdateIgnoreHeaderRow, onClickApply }) => {
  return (
    <>
      <div className={styles.headerRoot}>
        <VscodeCheckbox
          label="Ignore Header Row"
          checked={isIgnoreHeaderRow}
          onChange={(e) => {
            if (e.target instanceof HTMLElement) {
              const target = e.target as HTMLInputElement;
              onUpdateIgnoreHeaderRow(target.checked);
            }
          }}></VscodeCheckbox>
        <VscodeButton className={styles.applyButton} onClick={(e) => onClickApply()}>
          Apply
        </VscodeButton>
      </div>
    </>
  );
};

export default Header;
