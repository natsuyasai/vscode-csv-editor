import * as assert from "assert";
import { Buffer } from "buffer";
import * as vscode from "vscode";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { setTimeout as sleep } from "timers/promises";
import { createProviderHarness, replaceRows } from "./helpers/providerHarness";

const BOM_BYTES = Buffer.from([0xef, 0xbb, 0xbf]);

interface FormatCase {
  label: string;
  /** ディスク上のバイト列（元ファイル） */
  original: Buffer;
  /** webviewが送る想定の操作の対象行（2行目）の、セル変更後の値 */
  editedRow: string[];
  /** 保存後に期待するディスク上のバイト列 */
  expected: Buffer;
}

// 元: a,b / 1,2 の2行。webviewは(b列の2→9)に編集し、2行目の置換を送信する想定（issue #82）
const CASES: FormatCase[] = [
  {
    label: "CRLF・末尾改行あり",
    original: Buffer.from("a,b\r\n1,2\r\n", "utf8"),
    editedRow: ["1", "9"],
    expected: Buffer.from("a,b\r\n1,9\r\n", "utf8"),
  },
  {
    label: "CRLF・末尾改行なし",
    original: Buffer.from("a,b\r\n1,2", "utf8"),
    editedRow: ["1", "9"],
    expected: Buffer.from("a,b\r\n1,9", "utf8"),
  },
  {
    label: "LF・末尾改行なし",
    original: Buffer.from("a,b\n1,2", "utf8"),
    editedRow: ["1", "9"],
    expected: Buffer.from("a,b\n1,9", "utf8"),
  },
  {
    label: "BOM付きUTF-8・CRLF・末尾改行なし",
    original: Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,2", "utf8")]),
    editedRow: ["1", "9"],
    expected: Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,9", "utf8")]),
  },
  {
    label: "BOM付きUTF-8・LF・末尾改行あり",
    original: Buffer.concat([BOM_BYTES, Buffer.from("a,b\n1,2\n", "utf8")]),
    editedRow: ["1", "9"],
    expected: Buffer.concat([BOM_BYTES, Buffer.from("a,b\n1,9\n", "utf8")]),
  },
];

suite("CSV書式(改行コード・BOM・末尾改行)の保持", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-format-"));
  });

  afterEach(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  for (const c of CASES) {
    test(`${c.label}: 操作の適用とsave後もディスク上のバイト列で書式が保持される`, async function () {
      this.timeout(10000);
      const filePath = path.join(tempDir, "format.csv");
      fs.writeFileSync(filePath, c.original);
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      const harness = createProviderHarness(document);

      await harness.send({ type: "init" });
      await harness.sendOps([replaceRows(1, 1, [c.editedRow])]);
      await sleep(100);
      await harness.send({ type: "save" });
      await sleep(300);

      assert.strictEqual(document.isDirty, false, "保存済み");
      const actual = fs.readFileSync(filePath);
      assert.deepStrictEqual(
        actual.toString("hex"),
        c.expected.toString("hex"),
        `ディスク上のバイト列が一致する (actual=${JSON.stringify(actual.toString("utf8"))})`
      );
    });
  }

  test("BOM付きファイルでwebviewへ送るテキストにBOM文字が含まれない", async () => {
    const filePath = path.join(tempDir, "bom.csv");
    fs.writeFileSync(filePath, Buffer.concat([BOM_BYTES, Buffer.from("a,b\r\n1,2", "utf8")]));
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const harness = createProviderHarness(document);

    await harness.send({ type: "init" });

    const payload = harness.posted.find((m) => m.type === "update")?.payload;
    assert.ok(typeof payload === "string");
    assert.strictEqual(payload.includes("﻿"), false);
    assert.strictEqual(payload, "a,b\r\n1,2");
  });
});
