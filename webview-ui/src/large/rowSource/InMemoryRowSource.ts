import type { LargeOp, LargeRange } from "@message/largeMessages";
import { ObservableRowSource, type FetchedRows, type RowSource } from "./RowSource";

interface Entry {
  handle: number;
  row: string[];
}

/** 配列から即時に行を返す RowSource（テストと Story 用） */
export class InMemoryRowSource extends ObservableRowSource implements RowSource {
  header: string[];
  private entries: Entry[];

  /**
   * @param handles 行のハンドル（省略時は 0 始まりの行位置）。
   *   ファイルの行番号と同じ形（データ行は 1 始まり）で試すときに渡す
   */
  constructor(header: string[], rows: string[][], handles?: number[]) {
    super();
    this.header = header;
    this.entries = rows.map((row, i) => ({ handle: handles?.[i] ?? i, row }));
  }

  get rowCount(): number {
    return this.entries.length;
  }

  getRow(viewIndex: number): string[] | undefined {
    return this.entries[viewIndex]?.row;
  }

  getHandle(viewIndex: number): number | undefined {
    return this.entries[viewIndex]?.handle;
  }

  ensureRange(_start: number, _end: number): void {
    // 全行をメモリに持つため何もしない
  }

  getRange({ startRow, endRow, startCol, endCol }: LargeRange): Promise<string[][]> {
    return Promise.resolve(
      this.entries
        .slice(startRow, endRow)
        .map(({ row }) =>
          Array.from({ length: endCol - startCol }, (_, i) => row[startCol + i] ?? "")
        )
    );
  }

  fetchRows(start: number, end: number): Promise<FetchedRows> {
    const entries = this.entries.slice(start, end);
    return Promise.resolve({
      rows: entries.map((entry) => entry.row),
      handles: entries.map((entry) => entry.handle),
      revision: undefined,
    });
  }

  applyOps(ops: LargeOp[]): void {
    for (const op of ops) {
      this.applyOp(op);
    }
    this.notify();
  }

  private applyOp(op: LargeOp): void {
    switch (op.type) {
      case "setRow":
        this.entries = this.entries.map((entry) =>
          entry.handle === op.handle ? { handle: entry.handle, row: op.row } : entry
        );
        break;
      case "deleteRows": {
        const targets = new Set(op.handles);
        this.entries = this.entries.filter((entry) => !targets.has(entry.handle));
        break;
      }
      case "insertRows": {
        const inserted = op.rows.map((row, i) => ({ handle: op.handles[i], row }));
        const at =
          op.beforeHandle === null
            ? -1
            : this.entries.findIndex((entry) => entry.handle === op.beforeHandle);
        const index = at === -1 ? this.entries.length : at;
        this.entries = [...this.entries.slice(0, index), ...inserted, ...this.entries.slice(index)];
        break;
      }
      case "setHeader":
        this.header = op.header;
        break;
    }
  }
}
