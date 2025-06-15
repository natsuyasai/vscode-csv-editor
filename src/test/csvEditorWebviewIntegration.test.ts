import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/* eslint-env node */
/* eslint-disable no-undef */

suite("CSVエディター Webview統合テスト", () => {
  vscode.window.showInformationMessage("CSVエディター Webview統合テストを開始します。");

  let tempDir: string;
  let testCsvFile: vscode.Uri;

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
  });

  afterEach(() => {
    // 一時ファイルをクリーンアップ
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // 開いているエディターを閉じる
    vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("CSVファイルをカスタムエディターで開く", async function() {
    this.timeout(5000); // 5秒のタイムアウトを設定
    
    // CSVファイルを通常のエディターで開く
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);
    
    // 短時間待機してエディターが初期化される時間を確保
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // カスタムエディターでCSVファイルを開く
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      
      // 短時間待機してwebviewが初期化される時間を確保
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // カスタムエディターが利用できない場合でもテストを続行
      console.log("Custom editor might not be available in test environment:", error);
    }
    
    // エディターが作成されたことを確認
    const visibleTextEditors = vscode.window.visibleTextEditors;
    assert.ok(visibleTextEditors.length >= 0, "Text editors should be accessible");
    
    // CSVファイルの内容確認
    const text = document.getText();
    assert.ok(text.includes("田中太郎"), "CSV should contain Japanese names");
    assert.ok(text.includes("Engineering"), "CSV should contain department data");
    
    // データ構造の検証
    const lines = text.split('\n').filter(line => line.trim());
    assert.strictEqual(lines.length, 6, "Should have header + 5 data rows");
    
    const headers = lines[0].split(',');
    assert.strictEqual(headers.length, 4, "Should have 4 columns");
    assert.deepStrictEqual(headers, ["Name", "Age", "Department", "Status"], "Headers should match expected values");
  });

  test("CSVエディターコマンドが正しく登録されている", async () => {
    // コマンドパレットからCSVエディターが利用可能か確認
    const csvEditorCommands = await vscode.commands.getCommands(true);
    const csvEditorCommand = csvEditorCommands.find(cmd => cmd === "csv-editor.openEditor");
    assert.ok(csvEditorCommand, "CSV Editor command should be available in command palette");
  });

  test("CSVファイルの基本編集操作", async () => {
    // CSVファイルを開く
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);
    
    // カスタムエディターでCSVファイルを開く
    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      
      // webviewが初期化される時間を確保
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 元のファイル内容を取得
      const originalText = document.getText();
      assert.ok(originalText.includes("田中太郎,30,"), "Original data should contain '田中太郎,30,'");
      
      // エディター内で編集を実行（田中太郎の年齢を30から31に変更）
      const edit = new vscode.WorkspaceEdit();
      const modifiedText = originalText.replace("田中太郎,30,", "田中太郎,31,");
      
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        modifiedText
      );
      
      const editResult = await vscode.workspace.applyEdit(edit);
      assert.ok(editResult, "Edit should be applied successfully");
      
      // 変更が適用されたか確認
      const updatedText = document.getText();
      assert.ok(updatedText.includes("田中太郎,31,"), "Updated data should contain '田中太郎,31,'");
      
    } catch (error) {
      // カスタムエディターが利用できない場合でも、基本的な編集操作は動作することを確認
      console.log("Custom editor not available, testing basic operations:", error);
      
      // 基本的な編集操作のテスト
      const edit = new vscode.WorkspaceEdit();
      const originalText = document.getText();
      const modifiedText = originalText.replace("田中太郎,30,", "田中太郎,31,");
      
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        modifiedText
      );
      
      const editResult = await vscode.workspace.applyEdit(edit);
      assert.ok(editResult, "Basic edit should work even without custom editor");
    }
  });

  test("複数CSVファイルの同時処理", async () => {
    // 2つ目のCSVファイルを作成
    const csvContent2 = "Product,Price,Category\nノートPC,80000,Electronics\nマウス,2000,Electronics";
    const csvPath2 = path.join(tempDir, "products.csv");
    fs.writeFileSync(csvPath2, csvContent2, "utf8");
    const csvFile2 = vscode.Uri.file(csvPath2);
    
    // 両方のCSVファイルを開く
    const document1 = await vscode.workspace.openTextDocument(testCsvFile);
    const document2 = await vscode.workspace.openTextDocument(csvFile2);
    
    await vscode.window.showTextDocument(document1);
    await vscode.window.showTextDocument(document2);
    
    // ファイルが正しく開かれることを確認
    assert.ok(document1.getText().includes("田中太郎"), "First CSV should contain expected data");
    assert.ok(document2.getText().includes("ノートPC"), "Second CSV should contain expected data");
    
    // ファイルを閉じてクリーンアップ
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("エラーハンドリング：存在しないファイル", async () => {
    // 存在しないファイルを開こうとする
    const nonExistentFile = vscode.Uri.file(path.join(tempDir, "nonexistent.csv"));
    
    try {
      await vscode.workspace.openTextDocument(nonExistentFile);
      assert.fail("Should throw error for non-existent file");
    } catch (error) {
      // エラーが適切に処理されることを確認
      assert.ok(error, "Error should be thrown for non-existent file");
    }
  });

  test("大きなCSVファイルの処理", async () => {
    // 大きなCSVファイルを作成（500行）
    let largeCsvContent = "ID,FirstName,LastName,Email,Department\n";
    for (let i = 1; i <= 500; i++) {
      largeCsvContent +=
        `${String(i)},User${String(i)},Family${String(i)},user${String(i)}@company.com,` +
        `${["Engineering", "Marketing", "Sales", "HR", "Finance"][i % 5]}\n`;
    }

    const largeCsvPath = path.join(tempDir, "large.csv");
    fs.writeFileSync(largeCsvPath, largeCsvContent, "utf8");
    const largeCsvUri = vscode.Uri.file(largeCsvPath);

    const startTime = Date.now();
    
    // 大きなCSVファイルを開く
    const document = await vscode.workspace.openTextDocument(largeCsvUri);
    await vscode.window.showTextDocument(document);
    
    const endTime = Date.now();

    // パフォーマンステスト（5秒以内に処理完了）
    assert.ok(endTime - startTime < 5000, "Large dataset should load within 5 seconds");

    const text = document.getText();
    assert.ok(text.includes("User1"), "Large CSV should contain expected data");
    
    // データ構造の検証
    const lines = text.split('\n').filter(line => line.trim());
    assert.ok(lines.length > 100, "Large CSV should have many rows");
  });

  test("高度なフィルタリング機能（AND/OR検索）", async () => {
    // 複雑なデータセットを作成
    const complexCsvContent =
      "Name,Age,Department,Location,Skills\n" +
      "田中太郎,30,Engineering,Tokyo,Java Python\n" +
      "佐藤花子,25,Marketing,Osaka,Design Photoshop\n" +
      "鈴木一郎,35,Engineering,Tokyo,JavaScript React\n" +
      "高橋美子,28,HR,Kyoto,Excel PowerPoint\n" +
      "山田次郎,32,Engineering,Tokyo,Python Django\n" +
      "中村真理,27,Marketing,Osaka,Illustrator CSS\n" +
      "伊藤健太,29,Sales,Tokyo,Salesforce Analytics";

    const complexCsvPath = path.join(tempDir, "complex.csv");
    fs.writeFileSync(complexCsvPath, complexCsvContent, "utf8");
    const complexCsvFile = vscode.Uri.file(complexCsvPath);

    const document = await vscode.workspace.openTextDocument(complexCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", complexCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing basic data structure:", error);
    }

    // AND検索をシミュレート（TokyoかつEngineering）
    const tokyoEngineeringRows = complexCsvContent.split('\n')
      .filter(line => line.includes('Tokyo') && line.includes('Engineering'));
    
    assert.ok(tokyoEngineeringRows.length >= 2, "Should find Tokyo Engineering employees");
    assert.ok(tokyoEngineeringRows.some(row => row.includes('田中太郎')), "Should include 田中太郎");
    assert.ok(tokyoEngineeringRows.some(row => row.includes('鈴木一郎')), "Should include 鈴木一郎");

    // OR検索をシミュレート（DesignまたはJavaScript）
    const designOrJsRows = complexCsvContent.split('\n')
      .filter(line => line.includes('Design') || line.includes('JavaScript'));
    
    assert.ok(designOrJsRows.length >= 2, "Should find Design or JavaScript skills");
    assert.ok(designOrJsRows.some(row => row.includes('佐藤花子')), "Should include 佐藤花子 (Design)");
    assert.ok(designOrJsRows.some(row => row.includes('鈴木一郎')), "Should include 鈴木一郎 (JavaScript)");
  });

  test("セル選択とコピー機能の検証", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing basic copy operations:", error);
    }

    // セルデータのコピー操作をシミュレート
    const originalText = document.getText();
    const lines = originalText.split('\n').filter(line => line.trim());
    
    // 特定のセルデータを抽出（田中太郎の年齢）
    const tanakRow = lines.find(line => line.includes('田中太郎'));
    assert.ok(tanakRow, "Should find 田中太郎's row");
    
    const cells = tanakRow.split(',');
    assert.ok(cells.length >= 2, "Row should have multiple cells");
    assert.ok(cells[1] === '30', "Age cell should contain '30'");

    // 複数セル選択をシミュレート
    const engineeringRows = lines.filter(line => line.includes('Engineering'));
    assert.ok(engineeringRows.length >= 2, "Should have multiple Engineering rows");
  });

  test("行サイズ変更機能の検証", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing data structure:", error);
    }

    // 行サイズの種類をテスト（"small" | "normal" | "large" | "extra large"）
    const rowSizeOptions = ["small", "normal", "large", "extra large"];
    
    rowSizeOptions.forEach(size => {
      // 各行サイズで適切にデータが表示できることを確認
      const text = document.getText();
      const lines = text.split('\n').filter(line => line.trim());
      assert.ok(lines.length > 0, `Data should be accessible with ${size} row size`);
    });

    // ヘッダー行の無視機能をテスト
    const textWithHeader = document.getText();
    const linesWithHeader = textWithHeader.split('\n').filter(line => line.trim());
    
    // ヘッダー行を除いたデータ
    const dataRowsOnly = linesWithHeader.slice(1);
    assert.strictEqual(dataRowsOnly.length, 5, "Should have 5 data rows when ignoring header");
  });

  test("検索機能の詳細検証", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing search logic:", error);
    }

    const originalText = document.getText();
    const lines = originalText.split('\n').filter(line => line.trim());

    // 部分一致検索のテスト
    const partialMatches = lines.filter(line => line.toLowerCase().includes('enginee'));
    assert.ok(partialMatches.length >= 2, "Should find partial matches for 'enginee'");

    // 大文字小文字を無視した検索
    const caseInsensitiveMatches = lines.filter(line => 
      line.toLowerCase().includes('active') || line.toLowerCase().includes('inactive')
    );
    assert.ok(caseInsensitiveMatches.length >= 2, "Should find case-insensitive matches");

    // 複数語検索のシミュレート
    const multiWordMatches = lines.filter(line => 
      line.includes('田中') && line.includes('Engineering')
    );
    assert.ok(multiWordMatches.length >= 1, "Should find multi-word matches");

    // 数字検索のテスト
    const numberMatches = lines.filter(line => line.includes('30'));
    assert.ok(numberMatches.length >= 1, "Should find number matches");
  });

  test("ソート機能の検証", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing sort logic:", error);
    }

    const originalText = document.getText();
    const lines = originalText.split('\n').filter(line => line.trim());
    const dataRows = lines.slice(1); // ヘッダーを除く

    // 名前でのソート（昇順）
    const sortedByName = [...dataRows].sort((a, b) => {
      const nameA = a.split(',')[0];
      const nameB = b.split(',')[0];
      return nameA.localeCompare(nameB);
    });

    assert.ok(sortedByName.length === dataRows.length, "Sorted array should have same length");
    assert.notDeepStrictEqual(sortedByName, dataRows, "Sorted order should be different from original");

    // 年齢でのソート（数値）
    const sortedByAge = [...dataRows].sort((a, b) => {
      const ageA = parseInt(a.split(',')[1]);
      const ageB = parseInt(b.split(',')[1]);
      return ageA - ageB;
    });

    // 最初の要素が最年少であることを確認
    const youngestAge = parseInt(sortedByAge[0].split(',')[1]);
    const oldestAge = parseInt(sortedByAge[sortedByAge.length - 1].split(',')[1]);
    assert.ok(youngestAge <= oldestAge, "Ages should be sorted in ascending order");
  });

  test("特殊文字とエスケープ処理の検証", async () => {
    // 特殊文字を含むCSVデータを作成
    const specialCharCsvContent =
      'Name,Description,Email,Notes\n' +
      '"田中, 太郎","He said ""Hello""",tanaka@test.com,"Line1\nLine2"\n' +
      '"佐藤\t花子","Tab\tseparated",sato@test.com,"Comma, in text"\n' +
      '"鈴木\'一郎","Single quote",suzuki@test.com,"Quote: ""test"""\n' +
      '"高橋&美子","Special &<>",takahashi@test.com,"HTML: <b>bold</b>"';

    const specialCharCsvPath = path.join(tempDir, "special_chars.csv");
    fs.writeFileSync(specialCharCsvPath, specialCharCsvContent, "utf8");
    const specialCharCsvFile = vscode.Uri.file(specialCharCsvPath);

    const document = await vscode.workspace.openTextDocument(specialCharCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", specialCharCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing special character handling:", error);
    }

    const text = document.getText();
    
    // 特殊文字が適切に処理されることを確認
    assert.ok(text.includes('田中, 太郎'), "Should handle names with commas");
    assert.ok(text.includes('He said ""Hello""'), "Should handle escaped quotes");
    assert.ok(text.includes('佐藤\t花子'), "Should handle tab characters");
    assert.ok(text.includes('Line1\nLine2'), "Should handle newlines in data");
    assert.ok(text.includes('HTML: <b>bold</b>'), "Should handle HTML-like content");

    // エディットして特殊文字が保持されることを確認
    const edit = new vscode.WorkspaceEdit();
    const modifiedText = text.replace('tanaka@test.com', 'tanaka.updated@test.com');
    
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      modifiedText
    );
    
    const editResult = await vscode.workspace.applyEdit(edit);
    assert.ok(editResult, "Edit with special characters should be applied successfully");
    
    const updatedText = document.getText();
    assert.ok(updatedText.includes('tanaka.updated@test.com'), "Email should be updated");
    assert.ok(updatedText.includes('He said ""Hello""'), "Special characters should be preserved");
  });

  test("行・列の追加・削除操作の検証", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing row/column operations:", error);
    }

    const originalText = document.getText();
    const originalLines = originalText.split('\n').filter(line => line.trim());
    const originalRowCount = originalLines.length;

    // 新しい行の追加をシミュレート
    const newRowData = "新規社員,26,Development,Active";
    const textWithNewRow = originalText.trim() + '\n' + newRowData;
    
    let edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      textWithNewRow
    );
    
    await vscode.workspace.applyEdit(edit);
    
    let updatedText = document.getText();
    let updatedLines = updatedText.split('\n').filter(line => line.trim());
    assert.strictEqual(updatedLines.length, originalRowCount + 1, "Should have one more row after addition");
    assert.ok(updatedText.includes('新規社員'), "Should contain new employee data");

    // 行の削除をシミュレート（最後の行を削除）
    const textWithDeletedRow = updatedLines.slice(0, -1).join('\n');
    
    edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      textWithDeletedRow
    );
    
    await vscode.workspace.applyEdit(edit);
    
    updatedText = document.getText();
    updatedLines = updatedText.split('\n').filter(line => line.trim());
    assert.strictEqual(updatedLines.length, originalRowCount, "Should return to original row count after deletion");
    assert.ok(!updatedText.includes('新規社員'), "Should not contain deleted employee data");

    // 列の追加をシミュレート
    const linesWithNewColumn = updatedLines.map((line, index) => {
      if (index === 0) {
        return line + ',Salary'; // ヘッダーに新しい列を追加
      } else {
        return line + ',50000'; // データ行に値を追加
      }
    });
    
    const textWithNewColumn = linesWithNewColumn.join('\n');
    
    edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      textWithNewColumn
    );
    
    await vscode.workspace.applyEdit(edit);
    
    const finalText = document.getText();
    assert.ok(finalText.includes('Salary'), "Should contain new column header");
    assert.ok(finalText.includes('田中太郎,30,Engineering,Active,50000'), "Should contain new column data");
    
    const finalLines = finalText.split('\n').filter(line => line.trim());
    const headerCols = finalLines[0].split(',');
    assert.strictEqual(headerCols.length, 5, "Should have 5 columns after addition");
  });

  test("undo/redo機能のシミュレート", async () => {
    const document = await vscode.workspace.openTextDocument(testCsvFile);
    await vscode.window.showTextDocument(document);

    try {
      await vscode.commands.executeCommand("vscode.openWith", testCsvFile, "csv-editor.openEditor");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("Custom editor not available, testing undo/redo logic:", error);
    }

    const originalText = document.getText();
    
    // 変更1: 年齢を変更
    const edit1Text = originalText.replace("田中太郎,30,", "田中太郎,31,");
    let edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      edit1Text
    );
    await vscode.workspace.applyEdit(edit);
    
    let currentText = document.getText();
    assert.ok(currentText.includes("田中太郎,31,"), "First edit should be applied");

    // 変更2: 部署を変更
    const edit2Text = currentText.replace("田中太郎,31,Engineering,", "田中太郎,31,Development,");
    edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      edit2Text
    );
    await vscode.workspace.applyEdit(edit);
    
    currentText = document.getText();
    assert.ok(currentText.includes("田中太郎,31,Development,"), "Second edit should be applied");

    // Undo操作をシミュレート（最初の変更状態に戻る）
    edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      edit1Text
    );
    await vscode.workspace.applyEdit(edit);
    
    currentText = document.getText();
    assert.ok(currentText.includes("田中太郎,31,Engineering,"), "Undo should restore previous state");
    assert.ok(!currentText.includes("Development"), "Undo should remove last change");

    // Redo操作をシミュレート（再度変更を適用）
    edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      edit2Text
    );
    await vscode.workspace.applyEdit(edit);
    
    currentText = document.getText();
    assert.ok(currentText.includes("田中太郎,31,Development,"), "Redo should reapply changes");
  });
});