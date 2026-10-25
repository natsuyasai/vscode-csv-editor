import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { CSVEditorProvider } from "../editor/csvEditorProvider";
import { Message, UpdateMessage, SaveMessage } from "../message/messageTypeToExtension";

suite("CSVEditorProvider", () => {
  test("registerが返すDisposableでコマンドとカスタムエディタの登録を解除できる", () => {
    // 拡張機能が有効化済みでも衝突しないよう、登録APIをスタブに差し替えて検証する
    const commandsApi = vscode.commands as {
      registerCommand: (
        command: string,
        callback: (...args: unknown[]) => unknown
      ) => vscode.Disposable;
    };
    const windowApi = vscode.window as {
      registerCustomEditorProvider: (viewType: string, provider: unknown) => vscode.Disposable;
    };
    const originalRegisterCommand = commandsApi.registerCommand;
    const originalRegisterCustomEditorProvider = windowApi.registerCustomEditorProvider;

    const registeredCommands: string[] = [];
    const registeredViewTypes: string[] = [];
    const disposedNames: string[] = [];
    const trackedDisposable = (name: string): vscode.Disposable => ({
      dispose: () => {
        disposedNames.push(name);
      },
    });
    commandsApi.registerCommand = (command) => {
      registeredCommands.push(command);
      return trackedDisposable(`command:${command}`);
    };
    windowApi.registerCustomEditorProvider = (viewType) => {
      registeredViewTypes.push(viewType);
      return trackedDisposable(`editor:${viewType}`);
    };

    try {
      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.parse("file:///fake"),
      } as unknown as vscode.ExtensionContext;

      const disposable = CSVEditorProvider.register(context);
      assert.deepStrictEqual(registeredCommands, ["csv-editor.openEditor"]);
      assert.deepStrictEqual(registeredViewTypes, ["csv-editor.openEditor"]);
      assert.deepStrictEqual(disposedNames, [], "dispose前は何も解除されない");

      disposable.dispose();
      assert.deepStrictEqual(
        [...disposedNames].sort(),
        ["command:csv-editor.openEditor", "editor:csv-editor.openEditor"],
        "コマンドとカスタムエディタの両方が解除される"
      );

      // 解除後に再度登録しても問題ない
      CSVEditorProvider.register(context).dispose();
      assert.strictEqual(registeredCommands.length, 2);
      assert.strictEqual(registeredViewTypes.length, 2);
    } finally {
      commandsApi.registerCommand = originalRegisterCommand;
      windowApi.registerCustomEditorProvider = originalRegisterCustomEditorProvider;
    }
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
      let messageHandler: ((message: Message) => unknown) | undefined;

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
      await messageHandler(updateMessage);

      // 適切な編集が適用されたか確認
      assert.ok(appliedEdit);

      // クリーンアップ
      vscode.workspace.applyEdit = originalApplyEdit;
    });

    test("webviewメッセージを通じてフィルター操作を実行", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      let messageHandler: ((message: Message) => unknown) | undefined;
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
        await messageHandler(updateMessage);
      }

      // メッセージが送信されたか確認
      assert.ok(sentMessages.length > 0);
    });

    function createHarness(document: vscode.TextDocument) {
      const sentMessages: { type: string; payload?: string }[] = [];
      let messageHandler: ((message: Message) => unknown) | undefined;
      const mockWebview = {
        html: "",
        cspSource: "vscode-resource:",
        asWebviewUri: (uri: vscode.Uri) => uri,
        postMessage: (message: { type: string; payload?: string }) => {
          sentMessages.push(message);
          return Promise.resolve(true);
        },
        onDidReceiveMessage: (handler: (message: Message) => unknown) => {
          messageHandler = handler;
          return { dispose: () => {} };
        },
      } as unknown as vscode.Webview;
      let disposeHandler: (() => void) | undefined;
      const mockPanel = {
        webview: mockWebview,
        title: "CSV Editor",
        onDidDispose: (handler: () => void) => {
          disposeHandler = handler;
          return { dispose: () => {} };
        },
        onDidChangeViewState: () => ({ dispose: () => {} }),
        dispose: () => {},
      } as unknown as vscode.WebviewPanel;
      provider.resolveCustomTextEditor(document, mockPanel, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      });
      return {
        sentMessages,
        send: async (message: Message) => {
          assert.ok(messageHandler, "Message handler should be registered");
          await messageHandler(message);
        },
        dispose: () => disposeHandler?.(),
      };
    }

    const waitForEvents = () => sleep(100);

    test("updateメッセージはドキュメントを更新してダーティにするが保存しない", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);
      const newText = "Name,Age\n田中太郎,31";

      await harness.send({ type: "update", payload: newText } satisfies UpdateMessage);

      assert.strictEqual(document.getText(), newText);
      assert.strictEqual(document.isDirty, true);
      assert.strictEqual(
        fs.readFileSync(testCsvFile.fsPath, "utf8").includes("田中太郎,31"),
        false,
        "ファイルは保存されていない"
      );
      harness.dispose();
    });

    test("末尾の内容も含めて全置換される", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);

      await harness.send({ type: "update", payload: "A\n" } satisfies UpdateMessage);

      assert.strictEqual(document.getText(), "A\n");
      harness.dispose();
    });

    test("自分が適用した編集はwebviewへ送り返さない", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);

      await harness.send({ type: "update", payload: "A,B\n1,2" } satisfies UpdateMessage);
      await waitForEvents();

      assert.strictEqual(
        harness.sentMessages.filter((m) => m.type === "update").length,
        0,
        "エコーのupdateは送られない"
      );
      harness.dispose();
    });

    test("外部からの変更はwebviewへupdateとして送る", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);

      const edit = new vscode.WorkspaceEdit();
      edit.insert(document.uri, new vscode.Position(0, 0), "X");
      await vscode.workspace.applyEdit(edit);
      await waitForEvents();

      const updates = harness.sentMessages.filter((m) => m.type === "update");
      assert.strictEqual(updates.length, 1);
      assert.strictEqual(updates[0].payload, document.getText());
      harness.dispose();
    });

    test("同じ内容のupdateではドキュメントを変更しない", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);

      await harness.send({ type: "update", payload: document.getText() } satisfies UpdateMessage);

      assert.strictEqual(document.isDirty, false);
      harness.dispose();
    });

    test("saveメッセージはドキュメントへ反映して保存する", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      const harness = createHarness(document);
      const saveData = "Name,Age,Department\n田中太郎,31,Engineering";

      await harness.send({ type: "save", payload: saveData } satisfies SaveMessage);

      assert.strictEqual(document.isDirty, false);
      assert.strictEqual(fs.readFileSync(testCsvFile.fsPath, "utf8"), saveData);
      await waitForEvents();
      assert.strictEqual(
        harness.sentMessages.filter((m) => m.type === "update").length,
        0,
        "保存時もupdateは送り返さない"
      );
      harness.dispose();
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

    test("パネルを閉じた後はテーマ変更を通知しない（テーマ変更リスナーが解除される）", async () => {
      const document = await vscode.workspace.openTextDocument(testCsvFile);
      // テーマ変更イベントを手動で発火できるよう差し替える
      const themeEmitter = new vscode.EventEmitter<vscode.ColorTheme>();
      const windowApi = vscode.window as {
        onDidChangeActiveColorTheme: vscode.Event<vscode.ColorTheme>;
      };
      const originalOnDidChangeTheme = windowApi.onDidChangeActiveColorTheme;
      windowApi.onDidChangeActiveColorTheme = themeEmitter.event;
      try {
        const harness = createHarness(document);

        themeEmitter.fire(vscode.window.activeColorTheme);
        const themeMessagesBeforeDispose = harness.sentMessages.filter(
          (m) => m.type === "updateTheme"
        );
        assert.strictEqual(
          themeMessagesBeforeDispose.length,
          1,
          "パネル表示中はテーマ変更を通知する"
        );

        harness.dispose();
        themeEmitter.fire(vscode.window.activeColorTheme);

        const themeMessagesAfterDispose = harness.sentMessages.filter(
          (m) => m.type === "updateTheme"
        );
        assert.strictEqual(
          themeMessagesAfterDispose.length,
          1,
          "パネルを閉じた後はテーマ変更を通知しない"
        );
      } finally {
        windowApi.onDidChangeActiveColorTheme = originalOnDidChangeTheme;
        themeEmitter.dispose();
      }
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
      let messageHandler: ((message: Message) => unknown) | undefined;

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
        await messageHandler(updateMessage);
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
      let messageHandler: ((message: Message) => unknown) | undefined;

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
        await messageHandler(updateMessage);
      }

      assert.ok(appliedEdit);
      vscode.workspace.applyEdit = originalApplyEdit;
    });
  });
});
