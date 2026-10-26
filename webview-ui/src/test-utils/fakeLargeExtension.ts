import type {
  LargeMessageToExtension,
  LargeMessageToWebview,
  LargeProgressKind,
} from "@message/largeMessages";

type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;

export interface FakeLargeExtensionOptions {
  header: string[];
  rowCount: number;
  /** webview へメッセージを届ける（LargeMessageHub の dispatch など） */
  deliver: (message: LargeMessageToWebview) => void;
  /** true なら `large/getRows` にすぐ（マイクロタスクで）応答する。false なら `respondRows()` を呼ぶまで保留 */
  autoRows?: boolean;
  revision?: number;
}

/**
 * 拡張機能側の代わりに、webview が送ったメッセージを記録して応答する（テスト・Story 用）。
 * - 行は「先頭列が表示順の ID、2列目以降が `列名-ID`」で作る。ソートが完了すると表示順が変わる
 *   （昇順＝ID が 1..N、降順＝N..1）。フィルタの完了では行数だけを変える
 * - ソート・フィルタ・検索の進捗や結果は、テストが `progress` / `complete` / `found` で返す
 */
export class FakeLargeExtension {
  readonly messages: LargeMessageToExtension[] = [];
  header: string[];
  rowCount: number;
  private descending = false;
  private revision: number;
  private pending: GetRows[] = [];
  private readonly deliver: (message: LargeMessageToWebview) => void;
  private readonly autoRows: boolean;

  constructor(options: FakeLargeExtensionOptions) {
    this.header = options.header;
    this.rowCount = options.rowCount;
    this.deliver = options.deliver;
    this.autoRows = options.autoRows ?? false;
    this.revision = options.revision ?? 0;
  }

  /** webview の postMessage に渡す */
  readonly post = (message: LargeMessageToExtension): void => {
    this.messages.push(message);
    if (message.type === "large/getRows") {
      if (this.autoRows) {
        queueMicrotask(() => this.respond(message));
      } else {
        this.pending.push(message);
      }
    }
  };

  /** これまでに保留していた `large/getRows` にすべて応答する */
  respondRows(): void {
    const requests = this.pending;
    this.pending = [];
    for (const request of requests) {
      this.respond(request);
    }
  }

  /** 送られたメッセージのうち type が一致するもの */
  sent<T extends LargeMessageToExtension["type"]>(
    type: T
  ): Array<Extract<LargeMessageToExtension, { type: T }>> {
    return this.messages.filter(
      (m): m is Extract<LargeMessageToExtension, { type: T }> => m.type === type
    );
  }

  /** 最後に送られた type のメッセージ（無ければ例外） */
  last<T extends LargeMessageToExtension["type"]>(
    type: T
  ): Extract<LargeMessageToExtension, { type: T }> {
    const all = this.sent(type);
    const message = all[all.length - 1];
    if (!message) {
      throw new Error(`${type} は送られていない`);
    }
    return message;
  }

  progress(kind: LargeProgressKind, jobId: number | undefined, ratio: number): void {
    this.deliver({ type: "large/progress", kind, ratio, jobId });
  }

  /**
   * ソート・フィルタの完了。progress（ratio 1）に続けて、表示順の変更を invalidate で知らせる。
   * 直前の `large/sort` が降順なら以降の行は降順で返す
   */
  complete(kind: "sort" | "filter", jobId: number, rowCount?: number): void {
    if (kind === "sort") {
      this.descending = this.last("large/sort").direction === "desc";
    }
    if (rowCount !== undefined) {
      this.rowCount = rowCount;
    }
    this.revision += 1;
    this.deliver({ type: "large/progress", kind, ratio: 1, jobId });
    this.deliver({
      type: "large/invalidate",
      revision: this.revision,
      rowCount: this.rowCount,
    });
  }

  found(jobId: number, match: { row: number; col: number } | null): void {
    this.deliver({ type: "large/searchResult", jobId, match });
  }

  error(message: string): void {
    this.deliver({ type: "large/error", message });
  }

  private respond(request: GetRows): void {
    const count = Math.max(0, Math.min(request.count, this.rowCount - request.start));
    const rows = Array.from({ length: count }, (_, i) => this.rowAt(request.start + i));
    this.deliver({
      type: "large/rows",
      reqId: request.reqId,
      start: request.start,
      rows,
      handles: rows.map((_, i) => request.start + i + 1),
    });
  }

  private rowAt(viewIndex: number): string[] {
    const id = this.descending ? this.rowCount - viewIndex : viewIndex + 1;
    return this.header.map((name, col) => (col === 0 ? String(id) : `${name}-${String(id)}`));
  }
}
