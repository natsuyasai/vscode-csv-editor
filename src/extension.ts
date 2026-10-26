import * as vscode from "vscode";
import { CSVEditorProvider } from "@/editor/csvEditorProvider";
import {
  LargeCsvEditorProvider,
  type LargeCsvEditorProviderOptions,
} from "@/large/largeCsvEditorProvider";
import { createOpenRouterDeps, OpenRouter, registerOpenRouting } from "@/large/openRouting";
import { PendingEncodings } from "@/large/pendingEncodings";
import { OverridablePicker, SerialPicker, windowPicker, type Picker } from "@/large/picker";

/** テストのときだけ `activate` が返す API（拡張機能のテストモードでのみ公開する） */
export interface CsvEditorTestingApi {
  /** QuickPick の代わりに使う Picker を設定する。undefined で元に戻す */
  setPickerForTesting(picker: Picker | undefined): void;
  /**
   * 大容量モードの provider の差し替え（行インデックスの作成・webview とのやり取りの観測）を設定する。
   * 次に開く文書・パネルから使われる。undefined で元に戻す
   */
  setLargeEditorForTesting(hooks: LargeEditorTestingHooks | undefined): void;
}

/** テストで差し替えられる大容量モードの provider の設定 */
export type LargeEditorTestingHooks = Pick<
  LargeCsvEditorProviderOptions,
  "document" | "wrapWebview"
>;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): CsvEditorTestingApi | undefined {
  const overridable = new OverridablePicker(windowPicker);
  // QuickPick は同時に1つしか出せないので、復元時などに重なっても1つずつ尋ねる
  const picker = new SerialPicker(overridable);
  // 入口で選んだ文字コードを大容量モードの provider へ渡す
  const pending = new PendingEncodings();
  const router = new OpenRouter(createOpenRouterDeps(picker, pending));
  // provider は参照を持つので、テストの差し替えはこのオブジェクトを書き換える
  const largeOptions: LargeCsvEditorProviderOptions = { picker, pending };

  context.subscriptions.push(
    CSVEditorProvider.register(context, router),
    LargeCsvEditorProvider.register(context, largeOptions),
    registerOpenRouting(router)
  );

  if (context.extensionMode !== vscode.ExtensionMode.Test) {
    return undefined;
  }
  return {
    setPickerForTesting: (override) => {
      overridable.setOverride(override);
    },
    setLargeEditorForTesting: (hooks) => {
      largeOptions.document = hooks?.document;
      largeOptions.wrapWebview = hooks?.wrapWebview;
    },
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
