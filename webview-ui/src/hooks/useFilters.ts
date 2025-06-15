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

        // 文字列の部分一致でフィルタリング（大文字小文字を区別しない）
        return cellValue.toString().toLowerCase().includes(filterValue.toLowerCase());
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
