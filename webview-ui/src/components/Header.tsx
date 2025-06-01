import { RowSizeType } from "@/types";
import {
  VscodeButton,
  VscodeCheckbox,
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
            className={styles.rowSizeSelect}
            onChange={(e) => {
              if (e.target instanceof HTMLElement) {
                const target = e.target as HTMLSelectElement;
                onUpdateRowSize(target.value as RowSizeType);
              }
            }}>
            <VscodeOption value="small" selected={rowSize === "small"}>
              small
            </VscodeOption>
            <VscodeOption value="normal" selected={rowSize === "normal"}>
              normal
            </VscodeOption>
            <VscodeOption value="large" selected={rowSize === "large"}>
              large
            </VscodeOption>
            <VscodeOption value="extra large" selected={rowSize === "extra large"}>
              extra large
            </VscodeOption>
          </VscodeSingleSelect>
        </div>
        <div className={styles.buttons}>
          <VscodeButton secondary disabled={!isEnabledUndo} onClick={() => onUndo()}>
            Undo
          </VscodeButton>
          <VscodeButton secondary disabled={!isEnabledRedo} onClick={() => onRedo()}>
            Redo
          </VscodeButton>
          <VscodeButton secondary onClick={() => onSearch()}>
            Search
          </VscodeButton>
        </div>
        <VscodeButton className={styles.applyButton} onClick={(_e) => onClickApply()}>
          Save
        </VscodeButton>
      </div>
    </>
  );
};
