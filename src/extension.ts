import * as vscode from "vscode";
import { CSVEditorProvider } from "@/editor/csvEditorProvider";
import { LargeCsvEditorProvider } from "@/large/largeCsvEditorProvider";
import { createOpenRouterDeps, OpenRouter, registerOpenRouting } from "@/large/openRouting";
import { PendingEncodings } from "@/large/pendingEncodings";
import { OverridablePicker, windowPicker, type Picker } from "@/large/picker";

/** テストのときだけ `activate` が返す API（拡張機能のテストモードでのみ公開する） */
export interface CsvEditorTestingApi {
  /** QuickPick の代わりに使う Picker を設定する。undefined で元に戻す */
  setPickerForTesting(picker: Picker | undefined): void;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): CsvEditorTestingApi | undefined {
  const picker = new OverridablePicker(windowPicker);
  // 入口で選んだ文字コードを大容量モードの provider へ渡す
  const pending = new PendingEncodings();
  const router = new OpenRouter(createOpenRouterDeps(picker, pending));

  context.subscriptions.push(
    CSVEditorProvider.register(context, router),
    LargeCsvEditorProvider.register(context, { picker, pending }),
    registerOpenRouting(router)
  );

  if (context.extensionMode !== vscode.ExtensionMode.Test) {
    return undefined;
  }
  return {
    setPickerForTesting: (override) => {
      picker.setOverride(override);
    },
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
