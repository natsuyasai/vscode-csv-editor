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
  onClickApply: () => void;
}

export const Header: FC<Props> = ({
  isIgnoreHeaderRow,
  onUpdateIgnoreHeaderRow,
  rowSize,
  onUpdateRowSize,
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
        <div className={styles.cellSize}>
          <VscodeLabel>cell size :</VscodeLabel>
          <VscodeSingleSelect
            className={styles.cellSizeSelect}
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
        <VscodeButton className={styles.applyButton} onClick={(e) => onClickApply()}>
          Apply
        </VscodeButton>
      </div>
    </>
  );
};
