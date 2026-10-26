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
  /**
   * 行のハンドルの体系を表す値（RemoteRowSource は最後に受け取った `large/invalidate` / `large/init` の revision）。
   * 拡張機能は保存・revert で行のハンドルを振り直すので、ハンドルを得たときの値を applyOps に添える
   */
  readonly revision?: number;
  /**
   * 編集操作の適用。RemoteRowSource は拡張機能へ送ると同時にキャッシュへ反映する。
   * revision は ops のハンドルを得たときの revision（省略は現在の revision）。
   * 持たない RowSource（Story・テスト用の生成行など）の表は閲覧だけになる
   */
  applyOps?(ops: LargeOp[], revision?: number): void;
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
