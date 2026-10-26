/**
 * 追加行の負のハンドル（-1, -2, ...）を採番する。
 * 大容量モードの webview は非表示にすると作り直される（retainContextWhenHidden: false）ため、
 * 次に使う値を webview の状態（vscode.setState）に保存し、作り直した後も同じハンドルを使わない。
 */
export interface HandleStorage {
  load(): number | undefined;
  save(next: number): void;
}

export interface HandleAllocator {
  next(): number;
  /**
   * 次に採番する値を next 以下にする（拡張機能の `large/init` の nextHandle）。
   * 既に使う値の方が小さければ何もしない。負の整数でなければ無視する
   */
  advanceTo(next: number): void;
}

const isNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value < 0;

export function createHandleAllocator(storage?: HandleStorage): HandleAllocator {
  let following = -1;
  return {
    next() {
      // 保存先の値が進んでいれば（別の採番器が使った分）それより先へ進める
      const stored = storage?.load();
      const handle = Math.min(following, isNegativeInteger(stored) ? stored : -1);
      following = handle - 1;
      storage?.save(following);
      return handle;
    },
    advanceTo(next) {
      if (isNegativeInteger(next)) {
        following = Math.min(following, next);
      }
    },
  };
}

/** webview の状態の中で次のハンドルを持つキー */
const STATE_KEY = "largeNextHandle";

interface StateApi {
  getState(): unknown;
  setState(state: unknown): unknown;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** webview の状態（getState / setState）に保存する HandleStorage。状態の他のキーは残す */
export function createVscodeHandleStorage(api: StateApi): HandleStorage {
  return {
    load() {
      const value = asRecord(api.getState())[STATE_KEY];
      return typeof value === "number" ? value : undefined;
    },
    save(next) {
      api.setState({ ...asRecord(api.getState()), [STATE_KEY]: next });
    },
  };
}
