import type { LargeOp } from "@message/largeMessages";

/**
 * 大容量モードの表が行を読み出すための抽象。
 * 行は表示順の位置（viewIndex）で参照する。未取得の行は undefined を返す。
 * React からは `useRowSource` で購読する（`subscribe` / `getVersion` が useSyncExternalStore 用）。
 */
export interface RowSource {
  /** 表示順の総行数（ヘッダーを除く） */
  readonly rowCount: number;
  readonly header: string[];
  /** 行・行数・ヘッダーが変わるたびに増える値。useSyncExternalStore の getSnapshot に使う */
  readonly getVersion: () => number;
  /** 未取得なら undefined */
  getRow(viewIndex: number): string[] | undefined;
  /** 行のハンドル（0 以上＝元ファイルの行番号、負＝追加行）。未取得なら undefined */
  getHandle(viewIndex: number): number | undefined;
  /** 表示範囲 [start, end)（end は排他）の行を要求する。取得済み・要求中のものは再要求しない */
  ensureRange(start: number, end: number): void;
  readonly subscribe: (listener: () => void) => () => void;
  /** 編集操作の適用（2-2 で使う。2-1 では InMemoryRowSource のみ実装する） */
  applyOps?(ops: LargeOp[]): void;
}

/** 購読と version の管理を共通化する基底クラス */
export abstract class ObservableRowSource {
  private version = 0;
  private readonly listeners = new Set<() => void>();

  readonly getVersion = (): number => this.version;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** version を進めて購読者へ通知する */
  protected notify(): void {
    this.version += 1;
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
