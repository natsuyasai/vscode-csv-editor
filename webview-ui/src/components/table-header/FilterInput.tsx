import { FC } from "react";
import { FilterInputProps } from "../editable-table/types";
import styles from "./FilterInput.module.scss";

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
      className={styles.filterInput}
      value={columnFilterValue ?? ""}
      onChange={(e) => {
        column.setFilterValue(e.target.value);
      }}
      placeholder="フィルター..."
    />
  );
};
