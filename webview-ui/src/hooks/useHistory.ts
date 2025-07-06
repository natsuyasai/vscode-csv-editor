import { useMemo, useState, useCallback } from "react";

interface UseHistoryOptions {
  maxHistorySize?: number;
}

export function useHistory<T>(
  setData: (data: T) => void,
  options: UseHistoryOptions = {}
) {
  const { maxHistorySize = 50 } = options;
  
  const [history, setHistory] = useState<T[]>([]);
  const [redoHistory, setRedoHistory] = useState<T[]>([]);

  const isEnabledUndo = useMemo(() => history.length > 0, [history]);
  const isEnabledRedo = useMemo(() => redoHistory.length > 0, [redoHistory]);

  const setDataAndPushHistory = useCallback((newData: T, currentData: T) => {
    setHistory((prevHistory) => {
      const newHistory = [...prevHistory, currentData];
      // 履歴サイズの上限管理
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize);
      }
      return newHistory;
    });
    
    // 新しい変更が行われた場合、redo履歴をクリア
    setRedoHistory([]);
    setData(newData);
  }, [setData, maxHistorySize]);

  const undo = useCallback((currentData: T) => {
    if (history.length === 0) {
      return;
    }

    const lastItem = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setRedoHistory((prevRedoHistory) => [...prevRedoHistory, currentData]);
    setHistory(newHistory);
    setData(lastItem);
  }, [history, setData]);

  const redo = useCallback((currentData: T) => {
    if (redoHistory.length === 0) {
      return;
    }

    const lastItem = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);
    
    setHistory((prevHistory) => [...prevHistory, currentData]);
    setRedoHistory(newRedoHistory);
    setData(lastItem);
  }, [redoHistory, setData]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRedoHistory([]);
  }, []);

  return {
    setDataAndPushHistory,
    undo,
    redo,
    clearHistory,
    isEnabledUndo,
    isEnabledRedo,
  };
}