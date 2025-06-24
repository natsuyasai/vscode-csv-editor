import { FC } from "react";
import { VscodeButton } from "@vscode-elements/react-elements";
import { CellAlignment, VerticalAlignment, HorizontalAlignment } from "@/types";
import styles from "./CellAlignmentControls.module.scss";

interface Props {
  selectedColumnKey: string | null;
  currentAlignment: CellAlignment;
  onAlignmentChange: (alignment: CellAlignment) => void;
}

export const CellAlignmentControls: FC<Props> = ({
  selectedColumnKey,
  currentAlignment,
  onAlignmentChange,
}) => {
  const verticalOptions: { label: string; value: VerticalAlignment }[] = [
    { label: "上", value: "top" },
    { label: "中", value: "center" },
    { label: "下", value: "bottom" },
  ];

  const horizontalOptions: { label: string; value: HorizontalAlignment }[] = [
    { label: "左", value: "left" },
    { label: "中", value: "center" },
    { label: "右", value: "right" },
  ];

  const handleVerticalChange = (vertical: VerticalAlignment) => {
    onAlignmentChange({
      vertical,
      horizontal: currentAlignment.horizontal,
    });
  };

  const handleHorizontalChange = (horizontal: HorizontalAlignment) => {
    onAlignmentChange({
      vertical: currentAlignment.vertical,
      horizontal,
    });
  };

  if (!selectedColumnKey) {
    return (
      <div className={styles.container}>
        <span className={styles.placeholder}>列ヘッダーを選択してください</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <span className={styles.label}>垂直配置:</span>
        <div className={styles.buttonGroup}>
          {verticalOptions.map((option) => (
            <VscodeButton
              key={option.value}
              {...(currentAlignment.vertical === option.value ? {} : { secondary: true })}
              onClick={() => handleVerticalChange(option.value)}
              className={styles.button}
            >
              {option.label}
            </VscodeButton>
          ))}
        </div>
      </div>
      
      <div className={styles.section}>
        <span className={styles.label}>水平配置:</span>
        <div className={styles.buttonGroup}>
          {horizontalOptions.map((option) => (
            <VscodeButton
              key={option.value}
              {...(currentAlignment.horizontal === option.value ? {} : { secondary: true })}
              onClick={() => handleHorizontalChange(option.value)}
              className={styles.button}
            >
              {option.label}
            </VscodeButton>
          ))}
        </div>
      </div>
    </div>
  );
};