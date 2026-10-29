import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, suiteSetup, suiteTeardown, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";
import * as vscode from "vscode";

import type { CsvEditorTestingApi } from "../extension";
import { ScriptedPicker } from "./helpers/fakePicker";

/**
 * 大容量CSVを開くときの振り分け（largeOpen.feature）。
 * 実際に読み込まれた拡張機能（dist）を、コマンド・openWith・タブで動かす。
 * QuickPick は拡張機能がテストモードで公開する API で ScriptedPicker に差し替える。
 * 10MB / 50MB のしきい値は実際のサイズのファイル（11MiB / 51MiB）で確かめる。
 */

const MiB = 1024 * 1024;
const COMMAND = "csv-editor.openEditor";
const NORMAL = "csv-editor.openEditor";
const LARGE = "csv-editor.largeEditor";
const MODES = ["normal", "large", "text", "cancel"];
const ENCODINGS = ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"];
/** 「尋ねられない」「開かない」ことを確かめるための待ち時間 */
const QUIET_WAIT_MS = 1000;

/** 指定した行を繰り返して、指定バイト数以上のファイルを作る */
function writeRepeated(filePath: string, minBytes: number): void {
  const line = "aaaaaaaaaa,bbbbbbbbbb,cccccccccc\n";
  const chunk = Buffer.from(line.repeat(Math.ceil(MiB / line.length)));
  const fd = fs.openSync(filePath, "w");
  try {
    let written = fs.writeSync(fd, Buffer.from("h1,h2,h3\n"));
    while (written < minBytes) {
      written += fs.writeSync(fd, chunk);
    }
  } finally {
    fs.closeSync(fd);
  }
}

async function getApi(): Promise<CsvEditorTestingApi> {
  const extension = vscode.extensions.getExtension<CsvEditorTestingApi | undefined>(
    "natsuyasai.csv-editor"
  );
  assert.ok(extension, "csv-editor 拡張機能が読み込まれている");
  const api = await extension.activate();
  assert.ok(api, "テストモードでは API が公開される");
  return api;
}

/** 指定したファイルのタブの種類（テキストなら "text"、カスタムエディタなら viewType） */
function tabKindsOf(uri: vscode.Uri): string[] {
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .flatMap((tab) => {
      const input = tab.input;
      if (input instanceof vscode.TabInputText && input.uri.fsPath === uri.fsPath) {
        return ["text"];
      }
      if (input instanceof vscode.TabInputCustom && input.uri.fsPath === uri.fsPath) {
        return [input.viewType];
      }
      return [];
    });
}

async function waitFor(predicate: () => boolean, message: string, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`待機がタイムアウトしました: ${message}`);
    }
    await sleep(50);
  }
}

async function closeAllEditorsAndWait() {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  await waitFor(
    () => vscode.window.tabGroups.all.every((group) => group.tabs.length === 0),
    "全タブが閉じる"
  );
}

suite("大容量CSVを開く", function () {
  this.timeout(60000);
  let api: CsvEditorTestingApi;
  let dir = "";
  let small: vscode.Uri;
  let medium: vscode.Uri;
  let over: vscode.Uri;
  let picker: ScriptedPicker;

  const usePicker = (...answers: unknown[]) => {
    picker = new ScriptedPicker(...answers);
    api.setPickerForTesting(picker);
    return picker;
  };

  suiteSetup(async () => {
    api = await getApi();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-open-"));
    small = vscode.Uri.file(path.join(dir, "small.csv"));
    fs.writeFileSync(small.fsPath, "a,b\n" + "1,2\n".repeat(200));
    medium = vscode.Uri.file(path.join(dir, "medium.csv"));
    writeRepeated(medium.fsPath, 11 * MiB);
    over = vscode.Uri.file(path.join(dir, "over.csv"));
    writeRepeated(over.fsPath, 51 * MiB);
  });

  setup(async () => {
    picker = new ScriptedPicker();
    await closeAllEditorsAndWait();
  });

  teardown(async () => {
    // 答えが選択肢に無くてキャンセル扱いになると、キャンセルを期待するテストが素通りするため確かめる
    assert.deepStrictEqual(picker.mismatches, [], "答えはすべて選択肢にある");
    // 残った振り分けが本物の QuickPick を出さないよう、すべてキャンセルする Picker にしておく
    api.setPickerForTesting(new ScriptedPicker());
    await closeAllEditorsAndWait();
  });

  suiteTeardown(() => {
    api.setPickerForTesting(undefined);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  test("10MB未満のファイルは確認なしで通常モードで開く", async () => {
    usePicker();
    await vscode.commands.executeCommand(COMMAND, small);

    await waitFor(() => tabKindsOf(small).includes(NORMAL), "通常モードのタブ");
    assert.strictEqual(picker.calls.length, 0);
  });

  test("10MB以上50MB未満のファイルは開く前にモードを確認する", async () => {
    usePicker("normal");
    await vscode.commands.executeCommand(COMMAND, medium);

    assert.deepStrictEqual(picker.valuesOf(0), MODES);
    await waitFor(() => tabKindsOf(medium).includes(NORMAL), "通常モードのタブ");
    await sleep(QUIET_WAIT_MS);
    assert.strictEqual(picker.calls.length, 1, "resolve で再び尋ねない");
    assert.deepStrictEqual(tabKindsOf(medium), [NORMAL]);
  });

  test("50MB以上のファイルでは通常モードを選べない", async () => {
    usePicker("cancel");
    await vscode.commands.executeCommand(COMMAND, over);

    assert.deepStrictEqual(picker.valuesOf(0), ["large", "text", "cancel"]);
    assert.match(picker.calls[0].options.placeHolder ?? "", /50MB/);
  });

  test("大容量モードを選ぶと文字コードを確認する", async () => {
    usePicker("large", "shift_jis");
    await vscode.commands.executeCommand(COMMAND, medium);

    assert.deepStrictEqual(picker.valuesOf(1), ENCODINGS);
    await waitFor(() => tabKindsOf(medium).includes(LARGE), "大容量モードのタブ");
    await sleep(QUIET_WAIT_MS);
    assert.strictEqual(picker.calls.length, 2, "openCustomDocument で再び尋ねない");
  });

  test("キャンセルするとファイルを開かない", async () => {
    usePicker("cancel");
    await vscode.commands.executeCommand(COMMAND, medium);
    await sleep(QUIET_WAIT_MS);

    assert.strictEqual(picker.calls.length, 1);
    assert.deepStrictEqual(tabKindsOf(medium), []);
  });

  test("文字コードの選択をキャンセルするとファイルを開かない", async () => {
    usePicker("large");
    await vscode.commands.executeCommand(COMMAND, medium);
    await sleep(QUIET_WAIT_MS);

    assert.strictEqual(picker.calls.length, 2);
    assert.deepStrictEqual(tabKindsOf(medium), []);
  });

  test("テキストとして開くを選ぶとテキストエディタで開く", async () => {
    usePicker("text");
    await vscode.commands.executeCommand(COMMAND, medium);

    await waitFor(() => tabKindsOf(medium).includes("text"), "テキストエディタのタブ");
    assert.deepStrictEqual(tabKindsOf(medium), ["text"]);
  });

  test("通常モードのエディタで直接開いた10MB以上のファイルもモードを確認して振り分ける", async () => {
    usePicker("large", "utf-8");
    await vscode.commands.executeCommand("vscode.openWith", medium, NORMAL);

    await waitFor(
      () => JSON.stringify(tabKindsOf(medium)) === JSON.stringify([LARGE]),
      "大容量モードのタブだけになる"
    );
    assert.deepStrictEqual(picker.valuesOf(0), MODES);
    await sleep(QUIET_WAIT_MS);
    assert.deepStrictEqual(tabKindsOf(medium), [LARGE]);
    assert.strictEqual(picker.calls.length, 2);
  });

  test("50MBを超えるファイルを通常モードのエディタで開くと大容量モードで開き直す", async () => {
    usePicker("utf-8");
    await vscode.commands.executeCommand("vscode.openWith", over, NORMAL);

    await waitFor(
      () => JSON.stringify(tabKindsOf(over)) === JSON.stringify([LARGE]),
      "大容量モードのタブだけになる"
    );
    await sleep(QUIET_WAIT_MS);
    assert.strictEqual(picker.calls.length, 1, "モードは尋ねない");
    assert.deepStrictEqual(picker.valuesOf(0), ENCODINGS);
    assert.deepStrictEqual(tabKindsOf(over), [LARGE]);
  });

  test("文字コードを指定せずに大容量モードのエディタで開くと文字コードを確認する", async () => {
    usePicker();
    await vscode.commands.executeCommand("vscode.openWith", small, LARGE);

    await waitFor(() => picker.calls.length === 1, "文字コードを尋ねる");
    assert.deepStrictEqual(picker.valuesOf(0), ENCODINGS);
    await waitFor(() => tabKindsOf(small).length === 0, "タブが閉じる");
  });

  test("引数が無ければアクティブなタブのファイルを開く", async () => {
    await vscode.commands.executeCommand("vscode.open", over);
    await waitFor(() => {
      const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
      return input instanceof vscode.TabInputText && input.uri.fsPath === over.fsPath;
    }, "テキストエディタのタブ");
    usePicker("large", "utf-8");

    await vscode.commands.executeCommand(COMMAND);

    await waitFor(() => tabKindsOf(over).includes(LARGE), "大容量モードのタブ");
    assert.deepStrictEqual(picker.valuesOf(0), ["large", "text", "cancel"]);
  });
});
