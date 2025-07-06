import { VscodeButton } from "@vscode-elements/react-elements";
import { FC } from "react";
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
    { label: "Top", value: "top" },
    { label: "Center", value: "center" },
    { label: "Bottom", value: "bottom" },
  ];

  const horizontalOptions: { label: string; value: HorizontalAlignment }[] = [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
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
        <span className={styles.placeholder}>Please select a column header</span>
      </div>
    );
  }

  return (
    <div className={[styles.container].join(" ")}>
      <div className={styles.section}>
        <span className={styles.label}>Vertical:</span>
        <div className={styles.buttonGroup}>
          {verticalOptions.map((option) => (
            <VscodeButton
              key={option.value}
              {...(currentAlignment.vertical === option.value ? {} : { secondary: true })}
              onClick={() => handleVerticalChange(option.value)}>
              {option.label}
            </VscodeButton>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Horizontal:</span>
        <div className={styles.buttonGroup}>
          {horizontalOptions.map((option) => (
            <VscodeButton
              key={option.value}
              {...(currentAlignment.horizontal === option.value ? {} : { secondary: true })}
              onClick={() => handleHorizontalChange(option.value)}>
              {option.label}
            </VscodeButton>
          ))}
        </div>
      </div>
    </div>
  );
};
