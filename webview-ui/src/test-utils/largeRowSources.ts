import { ObservableRowSource, type RowSource } from "@/large/rowSource/RowSource";

/** 行の内容を行番号から作る関数（既定は「列名-行番号」） */
export type RowGenerator = (viewIndex: number, header: string[]) => string[];

export const defaultRowGenerator: RowGenerator = (viewIndex, header) =>
  header.map((name) => `${name}-${String(viewIndex + 1)}`);

/**
 * 行を要求された時点で行番号から生成する RowSource（Story・テスト用）。
 * 100万行でも配列を持たないため軽い。
 */
export class GeneratedRowSource extends ObservableRowSource implements RowSource {
  readonly header: string[];
  readonly rowCount: number;
  readonly requests: Array<[number, number]> = [];
  private readonly generate: RowGenerator;

  constructor(header: string[], rowCount: number, generate: RowGenerator = defaultRowGenerator) {
    super();
    this.header = header;
    this.rowCount = rowCount;
    this.generate = generate;
  }

  getRow(viewIndex: number): string[] | undefined {
    if (viewIndex < 0 || viewIndex >= this.rowCount) {
      return undefined;
    }
    return this.generate(viewIndex, this.header);
  }

  getHandle(viewIndex: number): number | undefined {
    return viewIndex >= 0 && viewIndex < this.rowCount ? viewIndex : undefined;
  }

  ensureRange(start: number, end: number): void {
    this.requests.push([start, end]);
  }
}

/**
 * 要求された行をすぐには返さない RowSource（未取得の行の表示を確かめる Story・テスト用）。
 * `loadRequested()` / `load()` を呼ぶまで行は未取得（undefined）のまま。
 */
export class PendingRowSource extends ObservableRowSource implements RowSource {
  readonly header: string[];
  readonly rowCount: number;
  readonly requests: Array<[number, number]> = [];
  private readonly loaded = new Set<number>();
  private readonly generate: RowGenerator;

  constructor(header: string[], rowCount: number, generate: RowGenerator = defaultRowGenerator) {
    super();
    this.header = header;
    this.rowCount = rowCount;
    this.generate = generate;
  }

  getRow(viewIndex: number): string[] | undefined {
    return this.loaded.has(viewIndex) ? this.generate(viewIndex, this.header) : undefined;
  }

  getHandle(viewIndex: number): number | undefined {
    return this.loaded.has(viewIndex) ? viewIndex : undefined;
  }

  ensureRange(start: number, end: number): void {
    this.requests.push([start, end]);
  }

  /** [start, end) の行を取得済みにして通知する */
  load(start: number, end: number): void {
    for (let i = Math.max(0, start); i < Math.min(end, this.rowCount); i++) {
      this.loaded.add(i);
    }
    this.notify();
  }

  /** これまでに要求された範囲をすべて取得済みにする */
  loadRequested(): void {
    for (const [start, end] of this.requests) {
      for (let i = Math.max(0, start); i < Math.min(end, this.rowCount); i++) {
        this.loaded.add(i);
      }
    }
    this.notify();
  }
}
