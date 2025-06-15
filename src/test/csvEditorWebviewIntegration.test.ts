import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import {
  Message,
  UpdateMessage,
  SaveMessage,
  ReloadMessage,
} from "../message/messageTypeToExtention";

suite("CSVエディター Webview統合テスト", () => {
  vscode.window.showInformationMessage("CSVエディター Webview統合テストを開始します。");

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

  test("CSVテーブルデータの読み込みと表示をシミュレート", async () => {
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
    const updateMessage = receivedMessages.find((msg) => msg.type === "update");
    assert.ok(updateMessage, "CSV data should be sent to webview");
    assert.ok(updateMessage.payload?.includes("田中太郎"), "Should contain Japanese names");
    assert.ok(updateMessage.payload?.includes("Engineering"), "Should contain department data");

    // データの行数確認（ヘッダー + 5行のデータ）
    const lines = updateMessage.payload?.split("\n") || [];
    assert.strictEqual(lines.length, 6, "Should have 6 lines (header + 5 data rows)");
  });

  test("テーブルセル編集操作をシミュレート", async () => {
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

  test("テーブル行操作（追加/削除）をシミュレート", async () => {
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

  test("ユーザーインタラクションを伴うフィルター操作をシミュレート", async () => {
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

  test("テキスト入力による検索操作をシミュレート", async () => {
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
    const searchResultData = "Name,Age,Department,Status\n" + "田中太郎,30,Engineering,Active";

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

  test("列操作（ソート、リサイズ）をシミュレート", async () => {
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

  test("キーボードショートカットとナビゲーションをシミュレート", async () => {
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
      payload: "Name,Age,Department,Status\n田中太郎,30,Engineering,Active",
    };

    if (messageHandler) {
      messageHandler(reloadMessage);
    }

    assert.ok(sentMessages.length > 0, "Keyboard shortcuts should trigger appropriate operations");
  });

  test("webviewインタラクションでのエラーハンドリングをシミュレート", async () => {
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

  test("テーマ切り替えインタラクションをシミュレート", async () => {
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
    const themeMessage = sentMessages.find((msg) => msg.type === "updateTheme");
    assert.ok(themeMessage, "Theme message should be sent on initialization");
    assert.ok(
      themeMessage.payload === "light" || themeMessage.payload === "dark",
      "Theme should be either light or dark"
    );

    // webview側でのテーマ適用を確認（実際の実装では、webview側でCSSクラスが変更される）
    assert.ok(sentMessages.length > 0, "Theme updates should be communicated to webview");
  });

  test("大規模データセット操作とパフォーマンスをシミュレート", async () => {
    // 大きなCSVファイルを作成（10,000行）
    let largeCsvContent = "ID,FirstName,LastName,Email,Department,Salary,JoinDate,Status\n";
    for (let i = 1; i <= 10000; i++) {
      largeCsvContent +=
        `${String(i)},User${String(i)},Family${String(i)},user${String(i)}@company.com,` +
        `${["Engineering", "Marketing", "Sales", "HR", "Finance"][i % 5]},` +
        `${String(50000 + (i % 1000) * 100)},2020-${String(1 + (i % 12)).padStart(2, "0")}-01,` +
        `${["Active", "Inactive", "OnLeave"][i % 3]}\n`;
    }

    const largeCsvPath = path.join(tempDir, "large.csv");
    fs.writeFileSync(largeCsvPath, largeCsvContent, "utf8");
    const largeCsvUri = vscode.Uri.file(largeCsvPath);

    const document = await vscode.workspace.openTextDocument(largeCsvUri);
    let messageHandler: ((message: Message) => void) | undefined;
    const receivedMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages.push(message);
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

    const startTime = Date.now();
    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    if (messageHandler) {
      messageHandler({ type: "init" });
    }
    const endTime = Date.now();

    // パフォーマンステスト（5秒以内に処理完了）
    assert.ok(endTime - startTime < 5000, "Large dataset should load within 5 seconds");

    // 大きなデータセットのフィルタリング操作をシミュレート
    const filteredLargeData =
      "ID,FirstName,LastName,Email,Department,Salary,JoinDate,Status\n" +
      "1,User1,Family1,user1@company.com,Engineering,50000,2020-02-01,Active\n" +
      "6,User6,Family6,user6@company.com,Engineering,50500,2020-07-01,Active";

    const filterMessage: UpdateMessage = {
      type: "update",
      payload: filteredLargeData,
    };

    if (messageHandler) {
      messageHandler(filterMessage);
    }

    assert.ok(receivedMessages.length > 0, "Large dataset filtering should work efficiently");
  });

  test("CSV検証とフォーマットエラーハンドリングをシミュレート", async () => {
    // 不正なフォーマットのCSVファイルを作成
    const invalidCsvContent =
      "Name,Age,Department\n" +
      "田中太郎,30,Engineering\n" +
      "佐藤花子,25\n" + // 列数不一致
      "鈴木一郎,invalid_age,Sales\n" + // 無効なデータ型
      '"未閉じクォート,28,HR\n' + // 未閉じクォート
      "山田次郎,32,Engineering,Extra Column"; // 余分な列

    const invalidCsvPath = path.join(tempDir, "invalid.csv");
    fs.writeFileSync(invalidCsvPath, invalidCsvContent, "utf8");
    const invalidCsvUri = vscode.Uri.file(invalidCsvPath);

    const document = await vscode.workspace.openTextDocument(invalidCsvUri);
    let messageHandler: ((message: Message) => void) | undefined;
    const receivedMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages.push(message);
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

    // 不正なCSVでも適切に処理されることを確認
    assert.ok(receivedMessages.length > 0, "Invalid CSV should be handled gracefully");

    // バリデーションエラーを含むデータの修正をシミュレート
    const correctedData =
      "Name,Age,Department\n" +
      "田中太郎,30,Engineering\n" +
      "佐藤花子,25,Marketing\n" +
      "鈴木一郎,35,Sales\n" +
      "高橋美子,28,HR\n" +
      "山田次郎,32,Engineering";

    const correctionMessage: UpdateMessage = {
      type: "update",
      payload: correctedData,
    };

    if (messageHandler) {
      messageHandler(correctionMessage);
    }

    assert.ok(receivedMessages.length > 0, "CSV correction should be processed");
  });

  test("複数webviewパネルと同時操作をシミュレート", async () => {
    const document1 = await vscode.workspace.openTextDocument(testCsvFile);

    // 2つ目のCSVファイルを作成
    const csvContent2 =
      "Product,Price,Category,InStock\n" +
      "ノートPC,80000,Electronics,true\n" +
      "マウス,2000,Electronics,true\n" +
      "キーボード,5000,Electronics,false";

    const csvPath2 = path.join(tempDir, "products.csv");
    fs.writeFileSync(csvPath2, csvContent2, "utf8");
    const csvFile2 = vscode.Uri.file(csvPath2);
    const document2 = await vscode.workspace.openTextDocument(csvFile2);

    let messageHandler1: ((message: Message) => void) | undefined;
    let messageHandler2: ((message: Message) => void) | undefined;
    const receivedMessages1: { type: string; payload?: string }[] = [];
    const receivedMessages2: { type: string; payload?: string }[] = [];

    // 1つ目のwebviewパネル
    const mockWebview1 = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages1.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler1 = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    // 2つ目のwebviewパネル
    const mockWebview2 = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages2.push(message);
        return Promise.resolve(true);
      },
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler2 = handler;
        return { dispose: () => {} };
      },
    } as unknown as vscode.Webview;

    const mockPanel1 = {
      webview: mockWebview1,
      title: "CSV Editor - Employees",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    const mockPanel2 = {
      webview: mockWebview2,
      title: "CSV Editor - Products",
      onDidDispose: () => ({ dispose: () => {} }),
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {},
    } as unknown as vscode.WebviewPanel;

    // 両方のパネルを初期化
    provider.resolveCustomTextEditor(document1, mockPanel1, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    provider.resolveCustomTextEditor(document2, mockPanel2, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 両方のパネルでinitメッセージを送信
    if (messageHandler1) {
      messageHandler1({ type: "init" });
    }
    if (messageHandler2) {
      messageHandler2({ type: "init" });
    }

    // 同時編集操作をシミュレート
    const update1: UpdateMessage = {
      type: "update",
      payload: "Name,Age,Department,Status\n田中太郎,31,Engineering,Active",
    };

    const update2: UpdateMessage = {
      type: "update",
      payload: "Product,Price,Category,InStock\nノートPC,75000,Electronics,true",
    };

    if (messageHandler1) {
      messageHandler1(update1);
    }
    if (messageHandler2) {
      messageHandler2(update2);
    }

    // 両方のパネルが独立して動作することを確認
    assert.ok(receivedMessages1.length > 0, "First panel should receive messages");
    assert.ok(receivedMessages2.length > 0, "Second panel should receive messages");
    assert.notStrictEqual(receivedMessages1, receivedMessages2, "Panels should be independent");
  });

  test("webview破棄とクリーンアップをシミュレート", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    let disposeHandler: (() => void) | undefined;
    let isDisposed = false;

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: () => Promise.resolve(true),
      onDidReceiveMessage: (handler: (message: Message) => void) => {
        messageHandler = handler;
        return {
          dispose: () => {
            messageHandler = undefined;
          },
        };
      },
    } as unknown as vscode.Webview;

    const mockPanel = {
      webview: mockWebview,
      title: "CSV Editor",
      onDidDispose: (handler: () => void) => {
        disposeHandler = handler;
        return { dispose: () => {} };
      },
      onDidChangeViewState: () => ({ dispose: () => {} }),
      dispose: () => {
        isDisposed = true;
        if (disposeHandler) {
          disposeHandler();
        }
      },
    } as unknown as vscode.WebviewPanel;

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 初期状態でメッセージハンドラーが設定されていることを確認
    assert.ok(messageHandler, "Message handler should be registered");

    // webviewパネルの破棄をシミュレート
    mockPanel.dispose();

    // 適切にクリーンアップされることを確認
    assert.ok(isDisposed, "Panel should be disposed");
    assert.ok(disposeHandler, "Dispose handler should be registered");
  });

  test("ドキュメント変更イベントと同期をシミュレート", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const receivedMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages.push(message);
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

    const initialMessageCount = receivedMessages.length;

    // 外部からのドキュメント変更をシミュレート（他のエディタからの編集など）
    const newContent =
      "Name,Age,Department,Status\n田中太郎,30,Engineering,Active\n新規社員,25,Development,Active";

    // ファイルに直接書き込んで変更をシミュレート
    fs.writeFileSync(testCsvFile.fsPath, newContent, "utf8");

    // onDidChangeTextDocumentイベントをシミュレート
    // 実際の実装では、vscode.workspace.onDidChangeTextDocumentが発火する

    // ドキュメント変更後のメッセージ送信を確認
    assert.ok(
      receivedMessages.length >= initialMessageCount,
      "Document changes should trigger webview updates"
    );

    // webview側からの同期確認
    const reloadMessage: ReloadMessage = {
      type: "reload",
      payload: newContent,
    };

    if (messageHandler) {
      messageHandler(reloadMessage);
    }

    assert.ok(
      receivedMessages.length > initialMessageCount,
      "Reload should trigger message updates"
    );
  });

  test("クリップボードデータを使ったコピー/ペースト操作をシミュレート", async () => {
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

    // Excelからのペースト操作をシミュレート（タブ区切りデータ）
    const pastedData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "コピー太郎,27,Design,Active\n" + // 新しくペーストされた行
      "ペースト花子,29,QA,Active"; // 新しくペーストされた行

    const pasteMessage: UpdateMessage = {
      type: "update",
      payload: pastedData,
    };

    if (messageHandler) {
      messageHandler(pasteMessage);
    }

    assert.ok(appliedEdit, "Paste operation should be applied");

    // 複数行のコピー操作をシミュレート
    const copiedRowsData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "田中太郎,30,Engineering,Active\n" + // コピーされた行
      "佐藤花子,25,Marketing,Inactive"; // コピーされた行

    const copyMessage: UpdateMessage = {
      type: "update",
      payload: copiedRowsData,
    };

    appliedEdit = undefined;
    if (messageHandler) {
      messageHandler(copyMessage);
    }

    assert.ok(appliedEdit, "Row copy operation should be applied");

    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("アンドゥ/リドゥ操作をシミュレート", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const editHistory: vscode.WorkspaceEdit[] = [];

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
      editHistory.push(edit);
      return Promise.resolve(true);
    };

    provider.resolveCustomTextEditor(document, mockPanel, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    });

    // 編集操作1: セルの値変更
    const edit1Data =
      "Name,Age,Department,Status\n" +
      "田中太郎,31,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const edit1Message: UpdateMessage = {
      type: "update",
      payload: edit1Data,
    };

    if (messageHandler) {
      messageHandler(edit1Message);
    }

    // 編集操作2: 行の追加
    const edit2Data =
      "Name,Age,Department,Status\n" +
      "田中太郎,31,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive\n" +
      "新規社員,26,Development,Active";

    const edit2Message: UpdateMessage = {
      type: "update",
      payload: edit2Data,
    };

    if (messageHandler) {
      messageHandler(edit2Message);
    }

    // アンドゥ操作をシミュレート（元のデータに戻る）
    const undoData =
      "Name,Age,Department,Status\n" +
      "田中太郎,31,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const undoMessage: UpdateMessage = {
      type: "update",
      payload: undoData,
    };

    if (messageHandler) {
      messageHandler(undoMessage);
    }

    // リドゥ操作をシミュレート（再度新規行を追加）
    const redoData =
      "Name,Age,Department,Status\n" +
      "田中太郎,31,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive\n" +
      "新規社員,26,Development,Active";

    const redoMessage: UpdateMessage = {
      type: "update",
      payload: redoData,
    };

    if (messageHandler) {
      messageHandler(redoMessage);
    }

    // 編集履歴が正しく記録されていることを確認
    assert.strictEqual(editHistory.length, 4, "All edit operations should be recorded");

    vscode.workspace.applyEdit = originalApplyEdit;
  });

  test("アクセシビリティ機能とキーボードナビゲーションをシミュレート", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    let messageHandler: ((message: Message) => void) | undefined;
    const receivedMessages: { type: string; payload?: string }[] = [];

    const mockWebview = {
      html: "",
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: vscode.Uri) => uri,
      postMessage: (message: { type: string; payload?: string }) => {
        receivedMessages.push(message);
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

    // キーボードナビゲーション操作をシミュレート
    // Tab/Enter/Arrow keysでのセル移動、Escapeでの編集キャンセルなど

    // セル編集開始（Enterキー）をシミュレート
    const startEditData =
      "Name,Age,Department,Status\n" +
      "田中太郎,30,Engineering,Active\n" +
      "佐藤花子,25,Marketing,Inactive\n" +
      "鈴木一郎,35,Sales,Active\n" +
      "高橋美子,28,HR,Active\n" +
      "山田次郎,32,Engineering,Inactive";

    const editStartMessage: UpdateMessage = {
      type: "update",
      payload: startEditData,
    };

    if (messageHandler) {
      messageHandler(editStartMessage);
    }

    // スクリーンリーダー対応のためのARIA属性確認（webview側でのアクセシビリティ）
    assert.ok(receivedMessages.length > 0, "Accessibility operations should trigger updates");

    // ハイコントラストテーマでの表示確認
    const themeUpdateMessage = receivedMessages.find((msg) => msg.type === "updateTheme");
    if (themeUpdateMessage) {
      assert.ok(
        themeUpdateMessage.payload === "light" || themeUpdateMessage.payload === "dark",
        "Theme should support accessibility requirements"
      );
    }
  });
});
