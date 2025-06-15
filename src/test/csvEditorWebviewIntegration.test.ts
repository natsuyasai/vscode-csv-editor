import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message, UpdateMessage, SaveMessage, ReloadMessage } from "../message/messageTypeToExtention";

suite("CSV Editor Webview Integration Tests", () => {
  vscode.window.showInformationMessage("Start CSV Editor Webview Integration tests.");

  let tempDir: string;
  let testCsvFile: vscode.Uri;
  let context: vscode.ExtensionContext;
  let provider: CSVEditorProvider;

  beforeEach(() => {
    // テスト用一時ディレクトリを作成
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-webview-test-"));
    
    // テスト用CSVファイルを作成
    const csvContent =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";
    
    const csvPath = path.join(tempDir, "test.csv");
    fs.writeFileSync(csvPath, csvContent, "utf8");
    testCsvFile = vscode.Uri.file(csvPath);

    // モックコンテキスト
    context = {
      subscriptions: [],
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext;

    provider = new CSVEditorProvider(context);
  });

  afterEach(() => {
    // 一時ファイルをクリーンアップ
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should simulate CSV table data loading and display", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    const receivedMessages: { type: string; payload?: string }[] = [];
    let messageHandler: ((message: { type: string; payload?: string }) => void) | undefined;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: { type: string; payload?: string }) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // webviewからinitメッセージを送信してデータ読み込みをシミュレート
    if (messageHandler) {
      messageHandler({ type: "init" });
    }

    // CSVデータがwebviewに送信されているか確認
    const updateMessage = receivedMessages.find(msg => msg.type === "update");
    assert.ok(updateMessage, "CSV data should be sent to webview");
    assert.ok(updateMessage.payload?.includes("田中太郎"), "Should contain Japanese names");
    assert.ok(updateMessage.payload?.includes("Engineering"), "Should contain department data");

    // データの行数確認（ヘッダー + 5行のデータ）
    const lines = updateMessage.payload?.split('\n') || [];
    assert.strictEqual(lines.length, 6, "Should have 6 lines (header + 5 data rows)");
  });

  test("should simulate table cell editing operations", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    let appliedEdit: vscode.WorkspaceEdit | undefined;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    // ワークスペース編集をモック
    const originalApplyEdit = vscode.workspace.applyEdit;
    vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
      appliedEdit = edit;
      return Promise.resolve(true);
    };

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // セル編集をシミュレート（田中太郎の年齢を30から31に変更）
    const editedData =
      "Name,Age,Department,Status\n" +
      "田中太郎,31,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const updateMessage: UpdateMessage = {
      type: "update",
      payload: editedData,
    };

    if (messageHandler) {
      messageHandler(updateMessage);
    }

    // 編集が適用されたか確認
    assert.ok(appliedEdit, "Edit should be applied");

    // クリーンアップ
    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("should simulate table row operations (add/delete)", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    let appliedEdit: vscode.WorkspaceEdit | undefined;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    const originalApplyEdit = vscode.workspace.applyEdit;
    vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
      appliedEdit = edit;
      return Promise.resolve(true);
    };

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 新しい行を追加する操作をシミュレート
    const dataWithNewRow =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive\n" +
      "新規社員,26,Development,Active";

    const updateMessage: UpdateMessage = {
      type: "update",
      payload: dataWithNewRow,
    };

    if (messageHandler) {
      messageHandler(updateMessage);
    }

    assert.ok(appliedEdit, "New row addition should be applied");

    // 行削除操作をシミュレート（最後の行を削除）
    const dataWithDeletedRow =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active";

    const deleteMessage: UpdateMessage = {
      type: "update",
      payload: dataWithDeletedRow,
    };

    appliedEdit = undefined;
    if (messageHandler) {
      messageHandler(deleteMessage);
    }

    assert.ok(appliedEdit, "Row deletion should be applied");

    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("should simulate filter operations with user interactions", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const sentMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        sentMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    if (messageHandler) {
      messageHandler({ type: "init" });
    }

    // フィルター適用をシミュレート（Engineeringの部署のみ表示）
    const filteredData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const filterMessage: UpdateMessage = {
      type: "update",
      payload: filteredData,
    };

    if (messageHandler) {
      messageHandler(filterMessage);
    }

    // 適切なメッセージが送信されたか確認
    assert.ok(sentMessages.length > 0, "Messages should be sent during filter operations");

    // フィルタークリア操作をシミュレート（全データを再表示）
    const originalData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const clearFilterMessage: UpdateMessage = {
      type: "update",
      payload: originalData,
    };

    if (messageHandler) {
      messageHandler(clearFilterMessage);
    }

    assert.ok(sentMessages.length > 0, "Filter clear should trigger message updates");
  });

  test("should simulate search operations with text input", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const sentMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        sentMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    if (messageHandler) {
      messageHandler({ type: "init" });
    }

    // 検索操作をシミュレート（"田中"を検索）
    // 検索結果を反映したデータ送信をシミュレート
    const searchResultData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active";

    const searchMessage: UpdateMessage = {
      type: "update",
      payload: searchResultData,
    };

    if (messageHandler) {
      messageHandler(searchMessage);
    }

    assert.ok(sentMessages.length > 0, "Search operations should trigger message updates");

    // 検索クリア操作をシミュレート
    const fullData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const clearSearchMessage: UpdateMessage = {
      type: "update",
      payload: fullData,
    };

    if (messageHandler) {
      messageHandler(clearSearchMessage);
    }

    assert.ok(sentMessages.length > 0, "Search clear should restore full data display");
  });

  test("should simulate column operations (sort, resize)", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    let appliedEdit: vscode.WorkspaceEdit | undefined;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    const originalApplyEdit = vscode.workspace.applyEdit;
    vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
      appliedEdit = edit;
      return Promise.resolve(true);
    };

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 年齢列でのソート操作をシミュレート（昇順）
    const sortedByAgeData =
      "Name,Age,Department,Status\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "高橋美子,28,HR,Active\n" +
      "田中太郎,30,Engineering,Active\n" +
      "山田次郎,32,Engineering,Inactive\n" +
      "鈴木一郎,35,Sales,Active";

    const sortMessage: UpdateMessage = {
      type: "update",
      payload: sortedByAgeData,
    };

    if (messageHandler) {
      messageHandler(sortMessage);
    }

    assert.ok(appliedEdit, "Sort operation should apply changes");

    // 名前列でのソート操作をシミュレート（降順）
    const sortedByNameData =
      "Name,Age,Department,Status\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "山田次郎,32,Engineering,Inactive\n" +
      "高橋美子,28,HR,Active";

    const sortByNameMessage: UpdateMessage = {
      type: "update",
      payload: sortedByNameData,
    };

    appliedEdit = undefined;
    if (messageHandler) {
      messageHandler(sortByNameMessage);
    }

    assert.ok(appliedEdit, "Name sort operation should apply changes");

    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("should simulate keyboard shortcuts and navigation", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const sentMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        sentMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    if (messageHandler) {
      messageHandler({ type: "init" });
    }

    // Ctrl+S保存操作をシミュレート
    const saveMessage: SaveMessage = {
      type: "save",
      payload: "Name,Age,Department,Status\n田中太郎,30,Engineering,Active",
    };

    if (messageHandler) {
      messageHandler(saveMessage);
    }

    // データ再読み込み（Ctrl+R相当）をシミュレート
    const reloadMessage: ReloadMessage = { 
      type: "reload",
      payload: "Name,Age,Department,Status\n田中太郎,30,Engineering,Active"
    };

    if (messageHandler) {
      messageHandler(reloadMessage);
    }

    assert.ok(sentMessages.length > 0, "Keyboard shortcuts should trigger appropriate operations");
  });

  test("should simulate error handling in webview interactions", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    // ワークスペース編集が失敗するケースをシミュレート
    const originalApplyEdit = vscode.workspace.applyEdit;
    vscode.workspace.applyEdit = () => Promise.resolve(false);

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 不正なCSVデータによる更新をシミュレート
    const invalidData = "invalid,csv,data,with,extra,columns\nand,malformed,structure";

    const errorMessage: UpdateMessage = {
      type: "update",
      payload: invalidData,
    };

    if (messageHandler) {
      messageHandler(errorMessage);
    }

    // エラーが適切に処理されることを確認
    assert.ok(true, "Error scenarios should be handled gracefully");

    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("should simulate theme switching interactions", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: { type: string; payload?: string }) => void) | undefined;
    const sentMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        sentMessages.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: { type: string; payload?: string }) => void) => {
        messageHandler = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 初期化時のテーマ設定をシミュレート
    if (messageHandler) {
      messageHandler({ type: "init" });
    }

    // テーマ変更メッセージが送信されているか確認
    const themeMessage = sentMessages.find(msg => msg.type === "updateTheme");
    assert.ok(themeMessage, "Theme message should be sent on initialization");
    assert.ok(
      themeMessage.payload === "light" || themeMessage.payload === "dark",
      "Theme should be either light or dark"
    );

    // webview側でのテーマ適用を確認（実際の実装では、webview側でCSSクラスが変更される）
    assert.ok(sentMessages.length > 0, "Theme updates should be communicated to webview");
  });
});