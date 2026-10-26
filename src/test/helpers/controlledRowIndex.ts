import type { RowIndexLike } from "../../large/largeCsvDocument";
import {
  RowIndex,
  type BuildRowIndexOptions,
  type RowByteRange,
  type RowIndexSummary,
} from "../../large/rowIndex";

/**
 * 作成の進み方をテストから制御できる行インデックス。
 * 先に作り終えた本物の RowIndex を、reveal で決めた行数まで「確定済み」として見せる。
 */
export class ControlledRowIndex implements RowIndexLike {
  readonly done: Promise<RowIndexSummary>;
  readonly firstRow: Promise<boolean>;
  completed = false;
  private visible = 0;
  private resolveDone: (summary: RowIndexSummary) => void = () => {};
  private rejectDone: (error: unknown) => void = () => {};
  private resolveFirstRow: (value: boolean) => void = () => {};

  constructor(
    private readonly real: RowIndex,
    private readonly summary: RowIndexSummary,
    readonly options: BuildRowIndexOptions
  ) {
    this.done = new Promise((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
    });
    this.done.catch(() => {});
    // 本物と同じく、中断されたら AbortError で reject する
    options.signal?.addEventListener("abort", () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      this.fail(error);
    });
    this.firstRow = new Promise((resolve) => {
      this.resolveFirstRow = resolve;
    });
  }

  /** 作り終えた本物のインデックスから作る（buildIndex に渡す関数を返す） */
  static async factory(filePath: string) {
    const real = RowIndex.build(filePath, { skipBom: true });
    const summary = await real.done;
    const created: ControlledRowIndex[] = [];
    const build = (_path: string, options: BuildRowIndexOptions) => {
      const index = new ControlledRowIndex(real, summary, options);
      created.push(index);
      return index;
    };
    return { build, created, totalRows: summary.rowCount };
  }

  get rowCount(): number {
    return this.visible;
  }

  get signal() {
    return this.options.signal;
  }

  /** n 行目までを確定済みにし、進捗を通知する */
  reveal(n: number): void {
    this.visible = Math.min(n, this.summary.rowCount);
    if (this.visible > 0) {
      this.resolveFirstRow(true);
    }
    const ratio = this.summary.rowCount === 0 ? 1 : this.visible / this.summary.rowCount;
    this.options.onProgress?.({
      bytesRead: Math.floor(this.summary.byteLength * ratio),
      totalBytes: this.summary.byteLength,
      ratio: Math.min(ratio, 0.99),
      rowCount: this.visible,
    });
  }

  /** 作成を完了する */
  finish(): void {
    this.visible = this.summary.rowCount;
    this.completed = true;
    this.resolveFirstRow(this.visible > 0);
    this.options.onProgress?.({
      bytesRead: this.summary.byteLength,
      totalBytes: this.summary.byteLength,
      ratio: 1,
      rowCount: this.visible,
    });
    this.resolveDone(this.summary);
  }

  /** 作成を失敗させる */
  fail(error: Error): void {
    this.resolveFirstRow(this.visible > 0);
    this.rejectDone(error);
  }

  getRowRange(i: number): RowByteRange {
    if (i >= this.visible) {
      throw new RangeError(`行 ${String(i)} は確定していません`);
    }
    return this.real.getRowRange(i);
  }
}
