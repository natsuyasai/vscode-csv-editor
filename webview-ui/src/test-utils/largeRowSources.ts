import type { LargeOp } from "@message/largeMessages";
import { InMemoryRowSource } from "@/large/rowSource/InMemoryRowSource";
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

/**
 * 受けた編集操作（applyOps）を記録しながら適用する InMemoryRowSource（Story・テスト用）。
 * ハンドルは省略時、ファイルの行番号と同じ 1 始まりにする
 */
export class RecordingRowSource extends InMemoryRowSource {
  readonly applied: LargeOp[] = [];
  /** applyOps 1回ごとの op（1回の編集＝Undo の1単位になる） */
  readonly batches: LargeOp[][] = [];

  constructor(header: string[], rows: string[][], handles = rows.map((_, i) => i + 1)) {
    super(header, rows, handles);
  }

  applyOps(ops: LargeOp[]): void {
    this.applied.push(...ops);
    this.batches.push(ops);
    super.applyOps(ops);
  }
}
