import { useMemo, useState } from "react";

export interface FilterState {
  [columnKey: string]: string;
}

export interface UseFiltersResult {
  filters: FilterState;
  setFilter: (columnKey: string, value: string) => void;
  clearFilters: () => void;
  clearFilter: (columnKey: string) => void;
  isFilterActive: (columnKey: string) => boolean;
  hasActiveFilters: boolean;
  filteredRows: Array<Record<string, string>>;
}

// 全角文字を半角文字に変換する関数
function normalizeText(text: string): string {
  return (
    text
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
      })
      // eslint-disable-next-line no-irregular-whitespace
      .replace(/　/g, " ")
      .toLowerCase()
  );
}

// フィルター条件を解析する関数
function parseFilterExpression(expression: string): { terms: string[][]; operator: "and" | "or" } {
  const trimmedExpression = expression.trim();
  
  // OR検索の判定は正規化前に行う（大文字小文字は区別しない）
  if (trimmedExpression.toLowerCase().includes(" or ")) {
    // OR検索：「term1 or term2」の形式
    const orTerms = trimmedExpression
      .toLowerCase()
      .split(" or ")
      .map((term) => normalizeText(term.trim()))
      .filter((term) => term !== "")
      .map((term) => [term]); // OR検索では各項目は単一の配列
    return { terms: orTerms, operator: "or" };
  } else {
    // AND検索：スペース区切りまたは「term1 and term2」の形式
    const normalizedExpression = normalizeText(trimmedExpression);
    const andExpression = normalizedExpression.replace(/ and /g, " ");
    const andTerms = andExpression.split(/\s+/).filter((term) => term !== "");
    return { terms: [andTerms], operator: "and" }; // AND検索では全項目が一つの配列
  }
}

// セルの値がフィルター条件にマッチするかチェックする関数
function matchesFilter(cellValue: string, filterValue: string): boolean {
  if (!filterValue || filterValue.trim() === "") {
    return true;
  }

  const normalizedCellValue = normalizeText(cellValue);
  const { terms, operator } = parseFilterExpression(filterValue);

  if (operator === "or") {
    // OR検索：いずれかの条件にマッチすればOK
    return terms.some((termGroup) => termGroup.every((term) => normalizedCellValue.includes(term)));
  } else {
    // AND検索：すべての条件にマッチする必要がある
    const andTerms = terms[0];
    return andTerms.every((term) => normalizedCellValue.includes(term));
  }
}

export function useFilters(rows: Array<Record<string, string>>): UseFiltersResult {
  const [filters, setFilters] = useState<FilterState>({});

  const setFilter = (columnKey: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const clearFilter = (columnKey: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnKey];
      return newFilters;
    });
  };

  const isFilterActive = (columnKey: string) => {
    return Boolean(filters[columnKey] && filters[columnKey].trim() !== "");
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => value && value.trim() !== "");
  }, [filters]);

  const filteredRows = useMemo(() => {
    if (!hasActiveFilters) {
      return rows;
    }

    return rows.filter((row) => {
      return Object.entries(filters).every(([columnKey, filterValue]) => {
        if (!filterValue || filterValue.trim() === "") {
          return true;
        }

        const cellValue = row[columnKey];
        if (cellValue === undefined || cellValue === null) {
          return false;
        }

        // 新しいフィルタリング関数を使用（全角半角同一視、AND/OR検索対応）
        return matchesFilter(cellValue.toString(), filterValue);
      });
    });
  }, [rows, filters, hasActiveFilters]);

  return {
    filters,
    setFilter,
    clearFilters,
    clearFilter,
    isFilterActive,
    hasActiveFilters,
    filteredRows,
  };
}
