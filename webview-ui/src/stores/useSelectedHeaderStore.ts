import { create } from "zustand";

interface SelectedHeaderState {
  selectedColumnKey: string | null;
  setSelectedColumnKey: (columnKey: string | null) => void;
}

export const useSelectedHeaderStore = create<SelectedHeaderState>((set) => ({
  selectedColumnKey: null,
  setSelectedColumnKey: (columnKey: string | null) => {
    set({ selectedColumnKey: columnKey });
  },
}));