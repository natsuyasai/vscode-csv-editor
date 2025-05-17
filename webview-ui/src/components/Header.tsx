import {
  VscodeButton,
  VscodeCheckbox,
  VscodeDivider,
  VscodeLabel,
  VscodeRadio,
  VscodeRadioGroup,
} from "@vscode-elements/react-elements";
import { FC, useState } from "react";
import styles from "./Header.module.scss";

export type RowSizeType = "small" | "normal" | "large" | "extra large";
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
          <VscodeLabel>cell size</VscodeLabel>
          <VscodeRadioGroup
            onChange={(e) => {
              if (e.target instanceof HTMLElement) {
                const target = e.target as HTMLInputElement;
                onUpdateRowSize(target.name as RowSizeType);
              }
            }}>
            <VscodeRadio label="small" name="small" checked={rowSize === "small"}></VscodeRadio>
            <VscodeRadio label="normal" name="normal" checked={rowSize === "normal"}></VscodeRadio>
            <VscodeRadio label="large" name="large" checked={rowSize === "large"}></VscodeRadio>
            <VscodeRadio
              label="extra large"
              name="extra large"
              checked={rowSize === "extra large"}></VscodeRadio>
          </VscodeRadioGroup>
        </div>
        <VscodeButton className={styles.applyButton} onClick={(e) => onClickApply()}>
          Apply
        </VscodeButton>
      </div>
    </>
  );
};
