import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";

/**
 * エディタタイトルの「Open CSV Editor」ボタン（issue #93）
 *
 * 旧条件 `resourceExtname == .csv && editorLangId == plaintext` は、CSV言語拡張で言語IDが
 * `csv` になったときや拡張子が `.CSV` のときにボタンが出なかった。
 * 表示条件（when）と customEditors.selector が大文字小文字の違いを扱えることを検証する。
 */

const VIEW_TYPE = "csv-editor.openEditor";
const COMMAND = "csv-editor.openEditor";

type MenuItem = { command: string; when?: string; group?: string };
type PackageJson = {
  contributes: {
    menus: Record<string, MenuItem[] | undefined>;
    customEditors: { viewType: string; selector: { filenamePattern?: string }[] }[];
  };
};

type WhenContext = {
  resourceExtname?: string;
  editorLangId?: string;
  activeCustomEditorId?: string;
};

/**
 * VSCode が読み込んだ拡張機能（このリポジトリ）の package.json マニフェストを返す。
 * テスト実行時のカレントディレクトリはVSCodeのインストール先になるため、ファイルパスではなく拡張機能APIから取得する。
 */
function readPackageJson(): PackageJson {
  const extension = vscode.extensions.all.find(
    (e) => (e.packageJSON as { name?: string } | undefined)?.name === "csv-editor"
  );
  assert.ok(extension, "csv-editor 拡張機能が読み込まれている");
  return extension.packageJSON as PackageJson;
}

/**
 * package.json の when 条件を評価する最小実装。
 * 対象は `&&` で連結された `==` / `!=` / `=~ /regex/` のみ。
 * 想定外の構文が来た場合は例外にし、検証が黙ってすり抜けないようにする。
 */
function evaluateWhen(when: string, ctx: WhenContext): boolean {
  if (when.includes("||") || when.includes("(") || when.includes(")")) {
    throw new Error(`評価未対応の when 構文: ${when}`);
  }
  return when.split("&&").every((rawClause) => {
    const clause = rawClause.trim();
    const match = /^(\w+)\s*(==|!=|=~)\s*(.+)$/.exec(clause);
    if (!match) {
      throw new Error(`評価未対応の when 句: ${clause}`);
    }
    const [, key, operator, rhs] = match;
    const actual = ctx[key as keyof WhenContext];
    switch (operator) {
      case "==":
        return actual === rhs;
      case "!=":
        return actual !== rhs;
      case "=~": {
        const lastSlash = rhs.lastIndexOf("/");
        const pattern = rhs.slice(1, lastSlash);
        const flags = rhs.slice(lastSlash + 1);
        return typeof actual === "string" && new RegExp(pattern, flags).test(actual);
      }
      default:
        throw new Error(`未対応の演算子: ${operator}`);
    }
  });
}

function getOpenEditorTitleWhen(): string {
  const pkg = readPackageJson();
  const item = pkg.contributes.menus["editor/title"]?.find((m) => m.command === COMMAND);
  assert.ok(item, "editor/title に csv-editor.openEditor が登録されている");
  assert.ok(item.when, "when 条件が設定されている");
  return item.when;
}

/**
 * 開いているエディタをすべて閉じ、タブ groups が空になるまで上限付きで待つ。
 */
async function closeAllEditorsAndWait(timeoutMs = 10000): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  const deadline = Date.now() + timeoutMs;
  while (vscode.window.tabGroups.all.some((group) => group.tabs.length > 0)) {
    if (Date.now() >= deadline) {
      return;
    }
    await sleep(100);
  }
}

/**
 * 指定URIのタブが TabInputCustom（カスタムエディタ）になるまで、上限付きでポーリングする。
 * タブ反映は非同期のため固定 sleep ではなく待機し、反映されなければ undefined を返す（ハングさせない）。
 */
async function waitForCustomEditorTab(
  uri: vscode.Uri,
  viewType: string,
  timeoutMs = 10000
): Promise<vscode.TabInputCustom | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
    const found = tabs.find(
      (tab) =>
        tab.input instanceof vscode.TabInputCustom &&
        tab.input.viewType === viewType &&
        tab.input.uri.toString() === uri.toString()
    );
    if (found?.input instanceof vscode.TabInputCustom) {
      return found.input;
    }
    if (Date.now() >= deadline) {
      return undefined;
    }
    await sleep(100);
  }
}

suite("エディタタイトルボタンの表示条件 (issue #93)", () => {
  suite("package.json の when 条件", () => {
    test("CSVファイルは拡張子の大文字小文字や言語IDに関係なく表示条件を満たす", () => {
      const when = getOpenEditorTitleWhen();
      const contexts: WhenContext[] = [
        { resourceExtname: ".csv", editorLangId: "plaintext" },
        { resourceExtname: ".csv", editorLangId: "csv" },
        { resourceExtname: ".csv" },
        { resourceExtname: ".CSV", editorLangId: "plaintext" },
        { resourceExtname: ".CSV", editorLangId: "csv" },
        { resourceExtname: ".Csv", editorLangId: "csv" },
      ];
      for (const ctx of contexts) {
        assert.ok(evaluateWhen(when, ctx), `表示されるべき: ${JSON.stringify(ctx)}`);
      }
    });

    test("CSV以外のファイルや、カスタムエディタ表示中には表示条件を満たさない", () => {
      const when = getOpenEditorTitleWhen();
      const contexts: WhenContext[] = [
        { resourceExtname: ".txt", editorLangId: "plaintext" },
        { resourceExtname: ".tsv", editorLangId: "csv" },
        { resourceExtname: ".csv.bak", editorLangId: "plaintext" },
        { editorLangId: "plaintext" },
        // カスタムエディタ（同じビュー）表示中に再度ボタンを出さない
        {
          resourceExtname: ".csv",
          editorLangId: "plaintext",
          activeCustomEditorId: VIEW_TYPE,
        },
        // 大容量モードのエディタ表示中も出さない
        { resourceExtname: ".csv", activeCustomEditorId: "csv-editor.largeEditor" },
      ];
      for (const ctx of contexts) {
        assert.ok(!evaluateWhen(when, ctx), `表示されるべきでない: ${JSON.stringify(ctx)}`);
      }
    });
  });

  suite("package.json の customEditors.selector", () => {
    test("大文字拡張子（*.CSV）のファイルもカスタムエディタの対象になる", () => {
      const pkg = readPackageJson();
      const editor = pkg.contributes.customEditors.find((e) => e.viewType === VIEW_TYPE);
      assert.ok(editor, "customEditors に csv-editor.openEditor が登録されている");
      const patterns = editor.selector.map((s) => s.filenamePattern);
      assert.ok(patterns.includes("*.csv"), "小文字 *.csv が含まれる");
      assert.ok(patterns.includes("*.CSV"), "大文字 *.CSV が含まれる");
    });
  });

  suite("VSCode 上での動作", () => {
    let tempDir: string;

    beforeEach(async function () {
      this.timeout(15000);
      // 前のテストが開いたエディタの残り（非同期のタブ反映を含む）が無い状態から始める
      await closeAllEditorsAndWait();
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-title-button-"));
    });

    afterEach(async function () {
      this.timeout(15000);
      await closeAllEditorsAndWait();
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    });

    test(".CSV 拡張子のファイルをカスタムエディタで開ける", async function () {
      this.timeout(10000);
      const uri = vscode.Uri.file(path.join(tempDir, "UPPER.CSV"));
      fs.writeFileSync(uri.fsPath, "a,b\n1,2\n");

      await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);

      const input = await waitForCustomEditorTab(uri, VIEW_TYPE);
      assert.ok(input, "カスタムエディタで開いている");
      assert.strictEqual(input.viewType, VIEW_TYPE);
    });

    test("言語ID csv のテキストエディタから csv-editor.openEditor を実行するとカスタムエディタに切り替わる", async function () {
      this.timeout(10000);
      const uri = vscode.Uri.file(path.join(tempDir, "lang.csv"));
      fs.writeFileSync(uri.fsPath, "a,b\n1,2\n");

      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
      // CSV言語拡張が入っている環境を再現する
      const csvDocument = await vscode.languages.setTextDocumentLanguage(document, "csv");
      assert.strictEqual(csvDocument.languageId, "csv");

      await vscode.commands.executeCommand(COMMAND);

      const input = await waitForCustomEditorTab(uri, VIEW_TYPE);
      assert.ok(input, "カスタムエディタに切り替わっている");
      assert.strictEqual(input.viewType, VIEW_TYPE);
    });
  });
});
