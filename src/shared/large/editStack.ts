import type { LargeOp } from "../../message/largeMessages";
import type { RowStore, RowStoreOp } from "./rowStore";

/**
 * RowStore に当てた編集の履歴（undo / redo と保存位置）。
 *
 * 1回の `apply(ops)`（webview の `large/applyOps` 1通）を1単位とし、provider はこれを
 * VSCode の `CustomDocumentEditEvent` 1件にして、その undo / redo コールバックから `undo()` / `redo()` を呼ぶ。
 * VSCode は undo / redo を後入れ先出しで呼ぶので、このスタックの順序と一致する。
 *
 * dirty は「現在の状態が保存した状態と同じ履歴位置か」で判定する（内容の比較ではない）。
 * 保存後に undo してから新しい編集をすると、保存した状態には戻れないので dirty のままになる。
 */

interface Entry {
  /** この編集を当てた後の状態の番号（0 は初期状態） */
  id: number;
  ops: LargeOp[];
  /** ops[i] の逆操作（当てた順） */
  inverses: RowStoreOp[];
}

export class EditStack {
  private readonly done: Entry[] = [];
  private undone: Entry[] = [];
  private nextId = 1;
  private savedId = 0;

  constructor(private readonly store: RowStore) {}

  /**
   * op 列を1単位として当てる。途中の op が不正なら、それまでの op を巻き戻して RowStoreError を投げる
   * （状態も履歴も変わらない）。空なら何もせず false。
   */
  apply(ops: readonly LargeOp[]): boolean {
    if (ops.length === 0) {
      return false;
    }
    const inverses = this.applyAll(ops);
    this.done.push({ id: this.nextId++, ops: [...ops], inverses });
    this.undone = [];
    return true;
  }

  undo(): boolean {
    const entry = this.done.pop();
    if (!entry) {
      return false;
    }
    for (let i = entry.inverses.length - 1; i >= 0; i--) {
      this.store.apply(entry.inverses[i]);
    }
    this.undone.push(entry);
    return true;
  }

  redo(): boolean {
    const entry = this.undone.pop();
    if (!entry) {
      return false;
    }
    entry.inverses = this.applyAll(entry.ops);
    this.done.push(entry);
    return true;
  }

  get canUndo(): boolean {
    return this.done.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  /** 保存した状態と違うか */
  get isDirty(): boolean {
    return this.currentId !== this.savedId;
  }

  /** 現在の状態の番号（編集・undo・redo で変わる。同じ履歴位置なら同じ値） */
  get version(): number {
    return this.currentId;
  }

  /**
   * version の状態を保存した状態とする（save / saveAs の成功後に呼ぶ）。
   * 書き出しは非同期で途中に編集が入りうるので、保存を始めた時点の `version` を渡すこと（省略時は現在）。
   */
  markSaved(version: number = this.currentId): void {
    this.savedId = version;
  }

  private get currentId(): number {
    return this.done.at(-1)?.id ?? 0;
  }

  private applyAll(ops: readonly LargeOp[]): RowStoreOp[] {
    const inverses: RowStoreOp[] = [];
    try {
      for (const op of ops) {
        inverses.push(this.store.apply(op));
      }
    } catch (error) {
      for (let i = inverses.length - 1; i >= 0; i--) {
        this.store.apply(inverses[i]);
      }
      throw error;
    }
    return inverses;
  }
}
