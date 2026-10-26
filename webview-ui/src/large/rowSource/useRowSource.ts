import { useSyncExternalStore } from "react";
import type { RowSource } from "./RowSource";

/**
 * RowSource を購読し、行・行数・ヘッダーが変わったら再レンダリングさせる。
 * 戻り値は変化ごとに変わる version（メモ化の依存配列に使える）。
 */
export function useRowSource(source: RowSource): number {
  return useSyncExternalStore(source.subscribe, source.getVersion);
}
