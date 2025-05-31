import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import { CSVEditorProvider } from "../editor/csvEditorProvider";

suite("csvEditorProvider Test Suite", () => {
  vscode.window.showInformationMessage("Start CSVEditorProvider tests.");

  test("register should return a Disposable", () => {
    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext;

    const disposable = CSVEditorProvider.register(context);
    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
  });

  test("getHtmlForWebview returns HTML string", () => {
    const context = {
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext;

    const provider = new CSVEditorProvider(context);

    // Mock webview
    const webview = {
      cspSource: "vscode-resource:",
      asWebviewUri: () => {},
    } as unknown as vscode.Webview;

    const html = provider["getHtmlForWebview"](webview);
    assert.ok(typeof html === "string");
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes('<div id="root"></div>'));
  });

  test("updateTextDocument applies edit", async () => {
    // Create a mock document
    const uri = vscode.Uri.parse("untitled:test.csv");
    const doc = await vscode.workspace.openTextDocument(uri);
    const provider = new CSVEditorProvider({
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext);

    const result = await provider["updateTextDocument"](doc, "a,b,c\n1,2,3");
    assert.ok(result);
  });
});
