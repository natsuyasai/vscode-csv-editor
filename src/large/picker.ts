import * as vscode from "vscode";

/** QuickPick の1項目。選ばれたら value を返す */
export interface PickItem<V> {
  label: string;
  description?: string;
  detail?: string;
  value: V;
}

export interface PickOptions {
  title?: string;
  placeHolder?: string;
}

/**
 * 項目を1つ選ばせる UI（QuickPick）の抽象。キャンセルされたら undefined。
 * テストでは、提示された項目を記録して決めた値を返す実装に差し替える。
 */
export interface Picker {
  pick<V>(items: readonly PickItem<V>[], options: PickOptions): Promise<V | undefined>;
}

/** `window.showQuickPick` で選ばせる */
export const windowPicker: Picker = {
  async pick<V>(items: readonly PickItem<V>[], options: PickOptions) {
    const picked = await vscode.window.showQuickPick(items, {
      title: options.title,
      placeHolder: options.placeHolder,
      // 誤ってフォーカスを外しただけでキャンセル扱いにしない（Esc でキャンセルできる）
      ignoreFocusOut: true,
    });
    return picked?.value;
  },
};

/** 既定の Picker を、テストのときだけ差し替えられるようにする */
export class OverridablePicker implements Picker {
  private override: Picker | undefined;

  constructor(private readonly fallback: Picker) {}

  setOverride(picker: Picker | undefined): void {
    this.override = picker;
  }

  pick<V>(items: readonly PickItem<V>[], options: PickOptions): Promise<V | undefined> {
    return (this.override ?? this.fallback).pick(items, options);
  }
}
