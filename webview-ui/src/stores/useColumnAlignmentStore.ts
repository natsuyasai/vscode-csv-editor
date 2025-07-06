import { create } from "zustand";
import { CellAlignment, ColumnAlignments } from "@/types";

interface ColumnAlignmentState {
  columnAlignments: ColumnAlignments;
  setColumnAlignment: (columnKey: string, alignment: CellAlignment) => void;
  getColumnAlignment: (columnKey: string) => CellAlignment;
  resetColumnAlignments: () => void;
}

const defaultAlignment: CellAlignment = {
  vertical: "center",
  horizontal: "left",
} as const;

export const useColumnAlignmentStore = create<ColumnAlignmentState>((set, get) => ({
  columnAlignments: {},

  setColumnAlignment: (columnKey: string, alignment: CellAlignment) => {
    set((state) => ({
      columnAlignments: {
        ...state.columnAlignments,
        [columnKey]: alignment,
      },
    }));
  },

  getColumnAlignment: (columnKey: string): CellAlignment => {
    const state = get();
    return state.columnAlignments[columnKey] ?? defaultAlignment;
  },

  resetColumnAlignments: () => {
    set({ columnAlignments: {} });
  },
}));
