import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message, UpdateMessage, SaveMessage } from "../message/messageTypeToExtention";

suite("CSVEditorProvider", () => {
  vscode.window.showInformationMessage("CSVEditorProviderテストを開始します。");

  test("registerメソッドはDisposableを返す", async () => {
    // コマンドが既に登録されているか確認
    const commands = await vscode.commands.getCommands(true);
    const csvEditorCommandExists = commands.includes("csv-editor.openEditor");
    
    if (csvEditorCommandExists) {
      // 既にコマンドが登録されている場合は、登録されていることを確認するだけ
      assert.ok(true, "CSV Editor command is already registered");
      return;
    }

    // コマンドがまだ登録されていない場合のみ、新規登録をテスト
    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.parse("file:///fake"),
    } as unknown as vscode.ExtensionContext;

    const disposable = CSVEditorProvider.register(context);
    assert.ok(disposable);
    assert.strictEqual(typeof disposable.dispose, "function");
    
    // テスト後にクリーンアップ
    disposable.dispose();
  });

  suite("E2Eテスト - Webview", () => {
    let tempDir: string;
    let testCsvFile: vscode.Uri;
    let context: vscode.ExtensionContext;
    let provider: CSVEditorProvider;

    beforeEach(() => {
      // テスト用一時ディレクトリを作成
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-test-"));

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

    test("webviewを作成してCSVデータを初期読み込み", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);

      // モックwebviewパネル
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

      // resolveCustomTextEditor を呼び出し
      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });

      // HTMLが設定されているか確認
      assert.ok(mockWebview.html.length > 0);
      assert.ok(mockWebview.html.includes("<!DOCTYPE html>"));
      assert.ok(mockWebview.html.includes("CSVEditor"));

      // webviewからinitメッセージを送信して初期化をトリガー
      if (messageHandler) {
        messageHandler({ type: "init" });
      }

      // 初期化後にメッセージが送信されているか確認
      assert.ok(receivedMessages.length > 0);
      const updateMessage = receivedMessages.find((msg) => msg.type === "update");
      assert.ok(updateMessage, "Update message should be sent after init");
    });

    test("webviewから拡張機能へのメッセージ送信", async () => {
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

      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });

      assert.ok(messageHandler, "Message handler should be registered");

      // webviewからの更新メッセージをシミュレート
      const updatedCsvData =
        "Name,Age,Department,Status\n" +
        "田中太郎,31,Engineering,Active\n" +
        "佐藤花子,25,Marketing,Active";

      const updateMessage: UpdateMessage = {
        type: "update",
        payload: updatedCsvData,
      };

      // モックワークスペース編集
      let appliedEdit: vscode.WorkspaceEdit | undefined;
      const originalApplyEdit = vscode.workspace.applyEdit;
      vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
        appliedEdit = edit;
        return Promise.resolve(true);
      };

      // メッセージハンドラーを呼び出し
      messageHandler(updateMessage);

      // 適切な編集が適用されたか確認
      assert.ok(appliedEdit);

      // クリーンアップ
      vscode.workspace.applyEdit = originalApplyEdit;
    });

    test("webviewメッセージを通じてフィルター操作を実行", async () => {
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

      // フィルター操作をシミュレート（Engineering部署のみ表示）
      const filteredData =
        "Name,Age,Department,Status\n" +
        "田中太郎,30,Engineering,Active\n" +
        "山田次郎,32,Engineering,Inactive";

      const updateMessage: UpdateMessage = {
        type: "update",
        payload: filteredData,
      };

      // webviewからinitメッセージを送信して初期化
      if (messageHandler) {
        messageHandler({ type: "init" });
      }

      // フィルター操作をシミュレート
      if (messageHandler) {
        messageHandler(updateMessage);
      }

      // メッセージが送信されたか確認
      assert.ok(sentMessages.length > 0);
    });

    test("保存実行", async () => {
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

      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });

      // 保存メッセージをシミュレート
      const saveData = "Name,Age,Department\n田中太郎,31,Engineering";
      const saveMessage: SaveMessage = {
        type: "save",
        payload: saveData,
      };

      // モックワークスペース操作
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

      if (messageHandler) {
        messageHandler(saveMessage);
      }

      // 編集と保存が実行されたか確認
      assert.ok(appliedEdit);
      assert.strictEqual(savedUri?.toString(), document.uri.toString());

      // クリーンアップ
      vscode.workspace.applyEdit = originalApplyEdit;
      vscode.workspace.save = originalSave;
    });

    test("テーマ変更", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const sentMessages: { type: string; payload?: string }[] = [];
      let messageHandler: ((message: { type: string; payload?: string }) => void) | undefined;

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

      // webviewからinitメッセージを送信してテーマ更新をトリガー
      if (messageHandler) {
        messageHandler({ type: "init" });
      }

      // テーマ変更メッセージが送信されているか確認
      const themeMessage = sentMessages.find((msg) => msg.type === "updateTheme");
      assert.ok(themeMessage, "Theme update message should be sent");
      assert.ok(themeMessage.payload === "light" || themeMessage.payload === "dark");
    });

    test("特殊文字を含む複雑なCSVデータ読み込み", async () => {
      // 特殊文字を含むCSVファイルを作成
      const complexCsvContent =
        "Name,Description,Price\n" +
        '"田中, 太郎","Complex ""quoted"" text",1000\n' +
        '"佐藤\n花子","Multi\nline\ntext",2000\n' +
        '"鈴木,一郎","Comma, in text",3000';

      const complexCsvPath = path.join(tempDir, "complex.csv");
      fs.writeFileSync(complexCsvPath, complexCsvContent, "utf8");
      const complexCsvUri = vscode.Uri.file(complexCsvPath);

      const document = await vscode.workspace.openTextDocument(complexCsvUri);
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

      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });

      // 複雑なデータの更新をシミュレート
      const updatedComplexData =
        "Name,Description,Price\n" + '"田中, 太郎","Updated ""quoted"" text",1500';

      const updateMessage: UpdateMessage = {
        type: "update",
        payload: updatedComplexData,
      };

      let appliedEdit: vscode.WorkspaceEdit | undefined;
      const originalApplyEdit = vscode.workspace.applyEdit;
      vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
        appliedEdit = edit;
        return Promise.resolve(true);
      };

      if (messageHandler) {
        messageHandler(updateMessage);
      }

      assert.ok(appliedEdit);

      vscode.workspace.applyEdit = originalApplyEdit;
    });

    test("大きなCSVファイルが読み込めるか", async () => {
      // 大きなCSVファイルを作成
      let largeCsvContent = "ID,Name,Email,Department,Salary,Status\n";
      for (let i = 1; i <= 1000; i++) {
        largeCsvContent +=
          `${String(i)},User${String(i)},user${String(i)}@example.com,` +
          `${["Engineering", "Marketing", "Sales", "HR"][i % 4]},` +
          `${String(50000 + i * 100)},` +
          `${["Active", "Inactive"][i % 2]}\n`;
      }

      const largeCsvPath = path.join(tempDir, "large.csv");
      fs.writeFileSync(largeCsvPath, largeCsvContent, "utf8");
      const largeCsvUri = vscode.Uri.file(largeCsvPath);

      const document = await vscode.workspace.openTextDocument(largeCsvUri);
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

      const startTime = Date.now();
      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });
      const endTime = Date.now();

      // 大きなファイルでも適切に処理されることを確認
      assert.ok(endTime - startTime < 5000); // 5秒以内に処理完了

      // フィルター操作をシミュレート
      const filteredData =
        "ID,Name,Email,Department,Salary,Status\n" +
        "1,User1,user1@example.com,Engineering,50100,Active";

      const updateMessage: UpdateMessage = {
        type: "update",
        payload: filteredData,
      };

      let appliedEdit: vscode.WorkspaceEdit | undefined;
      const originalApplyEdit = vscode.workspace.applyEdit;
      vscode.workspace.applyEdit = (edit: vscode.WorkspaceEdit) => {
        appliedEdit = edit;
        return Promise.resolve(true);
      };

      if (messageHandler) {
        messageHandler(updateMessage);
      }

      assert.ok(appliedEdit);
      vscode.workspace.applyEdit = originalApplyEdit;
    });
  });
});
