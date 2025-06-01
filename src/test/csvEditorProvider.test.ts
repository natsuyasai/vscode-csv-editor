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
});
test("CSVEditorProvider.viewType should be correct", () => {
  // @ts-expect-error: access private static
  assert.strictEqual(CSVEditorProvider.viewType, "csv-editor.openEditor");
});

test("CSVEditorProvider constructor should set context", () => {
  const fakeContext = { extensionUri: vscode.Uri.parse("file:///fake") } as vscode.ExtensionContext;
  const provider = new CSVEditorProvider(fakeContext);
  // @ts-expect-error: access private
  assert.strictEqual(provider.context, fakeContext);
});

test("getHtmlForWebview should return HTML string with correct URIs and nonce", () => {
  const fakeContext = { extensionUri: vscode.Uri.parse("file:///fake") } as vscode.ExtensionContext;
  const provider = new CSVEditorProvider(fakeContext);

  const fakeWebview = {
    cspSource: "vscode-resource:",
    asWebviewUri: (uri: vscode.Uri) => uri,
  } as unknown as vscode.Webview;

  // @ts-expect-error: access private
  const html = provider.getHtmlForWebview(fakeWebview);
  assert.ok(typeof html === "string");
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("nonce="));
  assert.ok(html.includes("index.js"));
  assert.ok(html.includes("index.css"));
});

test("updateTextDocument should apply edit and save", async () => {
  const fakeUri = vscode.Uri.parse("file:///fake.csv");
  const fakeDocument = {
    uri: fakeUri,
    lineCount: 1,
  } as unknown as vscode.TextDocument;

  let appliedEdit: vscode.WorkspaceEdit | undefined;
  let savedUri: vscode.Uri | undefined;

  const originalApplyEdit = vscode.workspace.applyEdit;
  const originalSave = vscode.workspace.save;

  vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
    appliedEdit = edit;
    return Promise.resolve(true);
  };
  // @ts-expect-error: access private static
  vscode.workspace.save = (uri: vscode.Uri) => {
    savedUri = uri;
    return Promise.resolve(true);
  };

  const fakeContext = { extensionUri: vscode.Uri.parse("file:///fake") } as vscode.ExtensionContext;
  const provider = new CSVEditorProvider(fakeContext);

  // @ts-expect-error: access private
  await provider.updateTextDocument(fakeDocument, "a,b,c\n1,2,3");

  assert.ok(appliedEdit);
  assert.strictEqual(savedUri?.toString(), fakeUri.toString());

  vscode.workspace.applyEdit = originalApplyEdit;
  vscode.workspace.save = originalSave;
});
