import { FC } from "react";
import { FilterInputProps } from "./types";

/**
 * フィルター入力コンポーネント
 *
 * 列のフィルタリングを行うための入力フィールドを提供します。
 * ユーザーが入力したテキストに基づいて列の値をフィルタリングします。
 */
export const FilterInput: FC<FilterInputProps> = ({ column }) => {
  const columnFilterValue = column.getFilterValue() as string;

  return (
    <input
      type="text"
      value={columnFilterValue ?? ""}
      onChange={(e) => {
        column.setFilterValue(e.target.value);
      }}
      placeholder="フィルター..."
      style={{
        width: "100%",
        padding: "4px",
        boxSizing: "border-box",
        border: "1px solid var(--vscode-input-border)",
        backgroundColor: "var(--vscode-input-background)",
        color: "var(--vscode-input-foreground)",
        fontSize: "12px",
        fontFamily: "var(--vscode-font-family)",
      }}
    />
  );
};
