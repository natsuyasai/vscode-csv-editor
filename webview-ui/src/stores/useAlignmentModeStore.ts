import { create } from "zustand";

interface AlignmentModeState {
  isAlignmentModeEnabled: boolean;
  setAlignmentModeEnabled: (enabled: boolean) => void;
}

export const useAlignmentModeStore = create<AlignmentModeState>((set) => ({
  isAlignmentModeEnabled: false,
  setAlignmentModeEnabled: (enabled: boolean) => set({ isAlignmentModeEnabled: enabled }),
}));