import * as vscode from "vscode";
import { CSVEditorProvider } from "@/editor/csvEditorProvider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(CSVEditorProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
