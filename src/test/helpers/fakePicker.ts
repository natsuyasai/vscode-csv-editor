import type { PickItem, PickOptions, Picker } from "../../large/picker";

/** 提示された QuickPick の内容 */
export interface PickCall {
  items: { label: string; description?: string; detail?: string; value: unknown }[];
  options: PickOptions;
}

/**
 * 決めておいた値を順に選ぶ Picker（QuickPick の代わり）。
 * 答えが尽きたらキャンセル（undefined）。選択肢に無い値を答えようとしたら記録してキャンセルする。
 */
export class ScriptedPicker implements Picker {
  readonly calls: PickCall[] = [];
  /** 選択肢に無かった答え */
  readonly mismatches: unknown[] = [];
  private readonly answers: unknown[] = [];

  constructor(...answers: unknown[]) {
    this.answers.push(...answers);
  }

  pick<V>(items: readonly PickItem<V>[], options: PickOptions): Promise<V | undefined> {
    this.calls.push({
      items: items.map(({ label, description, detail, value }) => ({
        label,
        description,
        detail,
        value,
      })),
      options,
    });
    if (this.answers.length === 0) {
      return Promise.resolve(undefined);
    }
    const answer = this.answers.shift();
    const item = items.find((i) => i.value === answer);
    if (!item) {
      this.mismatches.push(answer);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(item.value);
  }

  /** n 回目（0始まり）に提示された選択肢の値 */
  valuesOf(n: number): unknown[] {
    return this.calls[n]?.items.map((i) => i.value) ?? [];
  }
}
