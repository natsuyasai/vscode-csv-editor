import { RowSizeType } from "@/types";
import {
  VscodeButton,
  VscodeCheckbox,
  VscodeIcon,
  VscodeLabel,
  VscodeOption,
  VscodeSingleSelect,
} from "@vscode-elements/react-elements";
import { FC } from "react";
import styles from "./Header.module.scss";

interface Props {
  isIgnoreHeaderRow: boolean;
  onUpdateIgnoreHeaderRow: (checked: boolean) => void;
  rowSize: RowSizeType;
  onUpdateRowSize: (rowSize: RowSizeType) => void;
  onSearch: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isEnabledUndo: boolean;
  isEnabledRedo: boolean;
  onClickApply: () => void;
}

export const Header: FC<Props> = ({
  isIgnoreHeaderRow,
  onUpdateIgnoreHeaderRow,
  rowSize,
  onUpdateRowSize,
  onSearch,
  onUndo,
  onRedo,
  isEnabledUndo,
  isEnabledRedo,
  onClickApply,
}) => {
  return (
    <>
      <div className={styles.headerRoot}>
        <VscodeCheckbox
          label="Ignore Header Row"
          tabIndex={0}
          aria-label="Ignore Header Row"
          checked={isIgnoreHeaderRow}
          onChange={(e) => {
            if (e.target instanceof HTMLElement) {
              const target = e.target as HTMLInputElement;
              onUpdateIgnoreHeaderRow(target.checked);
            }
          }}></VscodeCheckbox>
        <div className={styles.rowSize}>
          <VscodeLabel>Row size :</VscodeLabel>
          <VscodeSingleSelect
            tabIndex={0}
            aria-label="Row size"
            className={styles.rowSizeSelect}
            onChange={(e) => {
              if (e.target instanceof HTMLElement) {
                const target = e.target as HTMLSelectElement;
                onUpdateRowSize(target.value as RowSizeType);
              }
            }}>
            <VscodeOption aria-label="small" value="small" selected={rowSize === "small"}>
              small
            </VscodeOption>
            <VscodeOption aria-label="normal" value="normal" selected={rowSize === "normal"}>
              normal
            </VscodeOption>
            <VscodeOption aria-label="large" value="large" selected={rowSize === "large"}>
              large
            </VscodeOption>
            <VscodeOption
              aria-label="extra large"
              value="extra large"
              selected={rowSize === "extra large"}>
              extra large
            </VscodeOption>
          </VscodeSingleSelect>
        </div>
        <div className={styles.buttons}>
          <VscodeButton
            tabIndex={0}
            aria-label="undo"
            secondary
            disabled={!isEnabledUndo}
            onClick={() => onUndo()}>
            <VscodeIcon name="discard" action-icon />
          </VscodeButton>
          <VscodeButton
            tabIndex={0}
            aria-label="redo"
            secondary
            disabled={!isEnabledRedo}
            onClick={() => onRedo()}>
            <VscodeIcon name="redo" action-icon />
          </VscodeButton>
          <VscodeButton
            tabIndex={0}
            aria-label="search"
            aria-description="Search text"
            secondary
            onClick={() => onSearch()}>
            <VscodeIcon name="search" action-icon />
          </VscodeButton>
        </div>
        <div className={styles.apply}>
          <VscodeButton
            tabIndex={0}
            aria-label="save"
            className={styles.applyButton}
            onClick={(_e) => onClickApply()}>
            <VscodeIcon name="save" action-icon />
            Save
          </VscodeButton>
        </div>
      </div>
    </>
  );
};
