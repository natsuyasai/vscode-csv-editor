import { create } from "zustand";

export interface CellEditState {
  initialCellKey: string | null;
  setInitialCellKey: (key: string) => void;
  position: { idx: number; rowIdx: number } | null;
  setPosition: (pos: { idx: number; rowIdx: number }) => void;
  clearInitialCellKey: () => void;
  clear: () => void;
}

// テキスト入力による編集開始時、有用なイベントがないため、
// ここで入力値を保持しておき、編集画面で保持した内容があれば、その内容にセルの内容を上書きするs
export const useCellEditStore = create<CellEditState>((set) => ({
  initialCellKey: null,
  setInitialCellKey: (key) =>
    set(() => ({
      initialCellKey: key,
    })),
  position: null,
  setPosition: (pos) =>
    set(() => ({
      position: pos,
    })),
  clearInitialCellKey: () => set({ initialCellKey: null }),
  clear: () => set({ initialCellKey: null, position: null }),
}));
