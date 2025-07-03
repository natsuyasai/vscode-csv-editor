import { useCallback } from "react";
import { CellAlignment } from "@/types";
import { useColumnAlignmentStore } from "@/stores/useColumnAlignmentStore";
import { useSelectedHeaderStore } from "@/stores/useSelectedHeaderStore";

interface UseEditableTableHandlersProps {
  insertRow: (index: number) => void;
  deleteRow: (index: number) => void;
  insertCol: (index: number) => void;
  deleteCol: (index: number) => void;
  updateCol: (index: number, value: string) => void;
  rows: Array<Record<string, string>>;
}

export const useEditableTableHandlers = ({
  insertRow,
  deleteRow,
  insertCol,
  deleteCol,
  updateCol,
  rows: _rows,
}: UseEditableTableHandlersProps) => {
  const setColumnAlignment = useColumnAlignmentStore((state) => state.setColumnAlignment);
  const selectedColumnKey = useSelectedHeaderStore((state) => state.selectedColumnKey);
  const setSelectedColumnKey = useSelectedHeaderStore((state) => state.setSelectedColumnKey);

  const handleSelectRowContextMenu = useCallback((value: string, itemIdx: number) => {
    if (value === "deleteRow") {
      deleteRow(itemIdx);
    } else if (value === "insertRowAbove") {
      insertRow(itemIdx);
    } else if (value === "insertRowBelow") {
      insertRow(itemIdx + 1);
    }
  }, [deleteRow, insertRow]);

  const handleSelectHeaderContextMenu = useCallback((value: string, itemIdx: number) => {
    if (value === "deleteHeaderCel") {
      deleteCol(itemIdx);
    } else if (value === "insertHeaderCelLeft") {
      insertCol(itemIdx);
    } else if (value === "insertHeaderCelRight") {
      insertCol(itemIdx + 1);
    }
  }, [deleteCol, insertCol]);

  const handleHeaderAlignmentChange = useCallback((alignment: CellAlignment) => {
    if (selectedColumnKey) {
      setColumnAlignment(selectedColumnKey, alignment);
    }
  }, [selectedColumnKey, setColumnAlignment]);

  const handleHeaderCellClick = useCallback((columnKey: string | null) => {
    setSelectedColumnKey(columnKey);
  }, [setSelectedColumnKey]);

  const handleHeaderClickOutside = useCallback(() => {
    setSelectedColumnKey(null);
  }, [setSelectedColumnKey]);

  const handleHeaderEdit = useCallback((cellIdx: number, updateText: string) => {
    updateCol(cellIdx, updateText);
  }, [updateCol]);

  return {
    handleSelectRowContextMenu,
    handleSelectHeaderContextMenu,
    handleHeaderAlignmentChange,
    handleHeaderCellClick,
    handleHeaderClickOutside,
    handleHeaderEdit,
  };
};