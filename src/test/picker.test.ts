import * as assert from "assert";
import { suite, test } from "mocha";
import { setImmediate as nextTurn } from "timers/promises";

import { OverridablePicker, SerialPicker, type PickItem, type Picker } from "../large/picker";
import { ScriptedPicker } from "./helpers/fakePicker";

/** 答えをテストから返すまで待つ Picker */
class ManualPicker implements Picker {
  readonly pending: {
    title?: string;
    answer: (value: unknown) => void;
    fail: (e: Error) => void;
  }[] = [];

  pick<V>(_items: readonly PickItem<V>[], options: { title?: string }): Promise<V | undefined> {
    return new Promise((resolve, reject) => {
      this.pending.push({
        title: options.title,
        answer: (value) => {
          resolve(value as V);
        },
        fail: reject,
      });
    });
  }
}

const items: PickItem<string>[] = [
  { label: "A", value: "a" },
  { label: "B", value: "b" },
];

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await nextTurn();
  }
};

suite("QuickPickの抽象（Picker）", () => {
  test("直列化したPickerは前の選択が終わるまで次の選択を出さない", async () => {
    const inner = new ManualPicker();
    const picker = new SerialPicker(inner);

    const first = picker.pick(items, { title: "1" });
    const second = picker.pick(items, { title: "2" });
    await settle();
    assert.deepStrictEqual(
      inner.pending.map((p) => p.title),
      ["1"]
    );

    inner.pending[0].answer("a");
    assert.strictEqual(await first, "a");
    await settle();
    assert.deepStrictEqual(
      inner.pending.map((p) => p.title),
      ["1", "2"]
    );
    inner.pending[1].answer("b");
    assert.strictEqual(await second, "b");
  });

  test("直列化したPickerは前の選択が失敗しても次の選択を出す", async () => {
    const inner = new ManualPicker();
    const picker = new SerialPicker(inner);

    const first = picker.pick(items, { title: "1" });
    const second = picker.pick(items, { title: "2" });
    await settle();
    inner.pending[0].fail(new Error("失敗"));
    await assert.rejects(first, /失敗/);
    await settle();

    assert.strictEqual(inner.pending.length, 2);
    inner.pending[1].answer("a");
    assert.strictEqual(await second, "a");
  });

  test("差し替えたPickerがあればそれを使い、外すと元に戻る", async () => {
    const fallback = new ScriptedPicker("a");
    const override = new ScriptedPicker("b");
    const picker = new OverridablePicker(fallback);

    picker.setOverride(override);
    assert.strictEqual(await picker.pick(items, {}), "b");
    picker.setOverride(undefined);
    assert.strictEqual(await picker.pick(items, {}), "a");
    assert.strictEqual(override.calls.length, 1);
    assert.strictEqual(fallback.calls.length, 1);
  });
});
