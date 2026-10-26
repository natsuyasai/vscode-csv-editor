import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import { openCsv, useTempDir } from "./helpers/providerHarness";

/**
 * 差分同期（applyOps）が前提にしている VSCode のテキストモデルの挙動を確かめる特性テスト。
 * ここが変わると、行範囲 → Range の変換やバージョンによるエコー抑止の前提が崩れる。
 */
suite("VSCodeテキストモデルの挙動（差分同期の前提）", () => {
  const temp = useTempDir("text-model");
  const BOM = String.fromCharCode(0xfeff);

  test("BOM付きファイルのgetTextはBOMを含まない", async () => {
    const document = await openCsv(temp.writeCsv("bom.csv", `${BOM}a,b\n1,2\n`));
    assert.strictEqual(document.getText(), "a,b\n1,2\n");
  });

  test("CRLFとLFが混在するファイルは読み込み時に1つの改行コードへ正規化される", async () => {
    // 多数派の改行に揃う（同数なら VSCode の既定に従う）ため、ここでは CRLF を多数派にする
    const document = await openCsv(temp.writeCsv("mixed.csv", "a,b\r\n1,2\r\n3,4\n"));
    assert.strictEqual(document.getText(), "a,b\r\n1,2\r\n3,4\r\n");
    assert.strictEqual(document.eol, vscode.EndOfLine.CRLF);
  });

  test("CRのみの改行は読み込み時にLFかCRLFへ正規化される", async () => {
    const document = await openCsv(temp.writeCsv("cr.csv", "a,b\r1,2\r"));
    const text = document.getText();
    const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
    assert.strictEqual(text, `a,b${eol}1,2${eol}`);
  });

  test("挿入したテキストの改行は文書の改行コードに変換される", async () => {
    const document = await openCsv(temp.writeCsv("crlf.csv", "a,b\r\n1,2\r\n"));
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, document.positionAt(document.getText().length), "3,4\n5,6\n");
    assert.strictEqual(await vscode.workspace.applyEdit(edit), true);
    assert.strictEqual(document.getText(), "a,b\r\n1,2\r\n3,4\r\n5,6\r\n");
  });

  test("空ファイルへ挿入した改行は既定の改行コード(files.eol)に変換されうる", async () => {
    const document = await openCsv(temp.writeCsv("empty.csv", ""));
    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(0, 0), "a,b\n1,2\n");
    assert.strictEqual(await vscode.workspace.applyEdit(edit), true);
    const eol = document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
    assert.strictEqual(document.getText(), `a,b${eol}1,2${eol}`);
  });

  test("1つのWorkspaceEditで接する複数の置換と範囲端への挿入を適用でき、バージョンは1つだけ進む", async () => {
    const document = await openCsv(temp.writeCsv("touch.csv", "a\nb\nc\n"));
    const versionBefore = document.version;
    const changes: number[] = [];
    let applyResolved = false;
    let firedBeforeResolve: boolean | undefined;
    const sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document && e.contentChanges.length > 0) {
        changes.push(e.document.version);
        firedBeforeResolve ??= !applyResolved;
      }
    });
    try {
      const edit = new vscode.WorkspaceEdit();
      const at = (offset: number) => document.positionAt(offset);
      // "a\n" → "A\n"、"b\n" → "B\n"（接する）、末尾 [6,6) へ挿入（直前の置換 [4,6) と接する）
      edit.replace(document.uri, new vscode.Range(at(0), at(2)), "A\n");
      edit.replace(document.uri, new vscode.Range(at(2), at(4)), "B\n");
      edit.replace(document.uri, new vscode.Range(at(4), at(6)), "C\n");
      edit.replace(document.uri, new vscode.Range(at(6), at(6)), "d\n");
      const ok = await vscode.workspace.applyEdit(edit);
      applyResolved = true;

      assert.strictEqual(ok, true);
      assert.strictEqual(document.getText(), "A\nB\nC\nd\n");
      assert.strictEqual(document.version, versionBefore + 1, "バージョンは1つだけ進む");
      assert.deepStrictEqual(changes, [versionBefore + 1], "変更イベントは1回");
      assert.strictEqual(firedBeforeResolve, true, "変更イベントは applyEdit の解決より前に届く");
    } finally {
      sub.dispose();
    }
  });
});
