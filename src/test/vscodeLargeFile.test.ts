import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { setTimeout as sleep } from "timers/promises";
import { TextDecoder } from "util";
import * as vscode from "vscode";
import { suite, suiteSetup, suiteTeardown, teardown, test } from "mocha";

/**
 * 大容量モード（フェーズ2）の入口設計が前提にしている VSCode の挙動を確かめる特性テスト（スパイク S1）。
 * ここが変わると、モードの振り分け・URI の取り方・文字コードの扱い・Undo の連動の前提が崩れる。
 *
 * - 50MiB 前後のファイルを一時ディレクトリに作る（生成は1ファイル 0.3 秒程度）。
 *   スイート全体で 20 秒前後のため、環境変数での切り替えはせず通常の `npm test` で実行する。
 * - viewType `csv-editor-test.probeText` / `csv-editor-test.probeCustom` は
 *   テスト用拡張 `src/test/fixtures/custom-editor-probe` が contributes で宣言している
 *   （contributes に無い viewType を registerCustomEditorProvider しても openWith はテキストエディタで開く）。
 */

const MiB = 1024 * 1024;
/** VSCode が拡張機能へ同期しない文書の長さ（TextModel._MODEL_SYNC_LIMIT。バイト数ではなくデコード後の文字数） */
const MODEL_SYNC_LIMIT = 50 * MiB;
const PROBE_TEXT = "csv-editor-test.probeText";
const PROBE_CUSTOM = "csv-editor-test.probeCustom";
/** resolve が「呼ばれない」ことを確かめるための待ち時間。呼ばれるときは 49MiB でも 1 秒以内に呼ばれる */
const NOT_CALLED_WAIT_MS = 1500;

/** 指定した行を繰り返して、指定バイト数以上のファイルを作る */
function writeRepeated(filePath: string, line: string, minBytes: number): number {
  const chunk = Buffer.from(line.repeat(Math.ceil(MiB / Buffer.byteLength(line))));
  const fd = fs.openSync(filePath, "w");
  let written = 0;
  try {
    written += fs.writeSync(fd, Buffer.from("h1,h2,h3\n"));
    while (written < minBytes) {
      written += fs.writeSync(fd, chunk);
    }
  } finally {
    fs.closeSync(fd);
  }
  return written;
}

function activeTab() {
  return vscode.window.tabGroups.activeTabGroup.activeTab;
}

function allTabInputs() {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs.map((tab) => tab.input));
}

function isProbeTextTab(tab: vscode.Tab): tab is vscode.Tab & { input: vscode.TabInputCustom } {
  return tab.input instanceof vscode.TabInputCustom && tab.input.viewType === PROBE_TEXT;
}

async function waitFor(predicate: () => boolean, timeoutMs = 5000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("待機がタイムアウトしました");
    }
    await sleep(25);
  }
}

/** 呼ばれた順に記録する最小の CustomEditorProvider */
function createProbeCustomProvider(html = "<!DOCTYPE html><html><body>probe</body></html>") {
  const calls: string[] = [];
  const emitter = new vscode.EventEmitter<vscode.CustomDocumentEditEvent>();
  const provider: vscode.CustomEditorProvider = {
    onDidChangeCustomDocument: emitter.event,
    openCustomDocument: (uri) => {
      calls.push("openCustomDocument");
      return { uri, dispose: () => {} };
    },
    resolveCustomEditor: (_document, panel) => {
      calls.push("resolveCustomEditor");
      panel.webview.options = { enableScripts: true };
      panel.webview.onDidReceiveMessage((message) => {
        calls.push(`message:${JSON.stringify(message)}`);
      });
      panel.webview.html = html;
    },
    saveCustomDocument: async () => {},
    saveCustomDocumentAs: async () => {},
    revertCustomDocument: async () => {},
    backupCustomDocument: (document) =>
      Promise.resolve({ id: document.uri.toString(), delete: () => {} }),
  };
  return {
    calls,
    provider,
    /** undo/redo 付きの編集を通知する */
    fireEdit: (document: vscode.CustomDocument) => {
      emitter.fire({
        document,
        label: "edit",
        undo: () => {
          calls.push("undo");
        },
        redo: () => {
          calls.push("redo");
        },
      });
    },
  };
}

suite("VSCodeの大容量ファイルの挙動（大容量モードの入口の前提）", function () {
  this.timeout(60000);
  const disposables: vscode.Disposable[] = [];
  let dir = "";
  /** 51MiB の ASCII（文字数も上限超え） */
  let overCsv = "";
  let overProbe = "";
  /** 49MiB の ASCII（上限未満） */
  let underCsv = "";
  /** 60MiB 超だが、3バイト文字なので文字数は上限未満 */
  let multibyteCsv = "";
  let smallProbe = "";

  suiteSetup(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-editor-large-file-"));
    const asciiLine = "aaaaaaaaaa,bbbbbbbbbb,cccccccccc\n";
    overCsv = path.join(dir, "over.csv");
    writeRepeated(overCsv, asciiLine, 51 * MiB);
    overProbe = path.join(dir, "over.probecsv");
    fs.copyFileSync(overCsv, overProbe);
    underCsv = path.join(dir, "under.csv");
    writeRepeated(underCsv, asciiLine, 49 * MiB);
    // 1行 = "あ"×10 ×3列 + 区切り（3バイト×30 + 3 = 93バイト、31文字）
    multibyteCsv = path.join(dir, "multibyte.csv");
    const bytes = writeRepeated(
      multibyteCsv,
      "ああああああああああ,ああああああああああ,ああああああああああ\n",
      60 * MiB
    );
    assert.ok(bytes > MODEL_SYNC_LIMIT && bytes / 3 < MODEL_SYNC_LIMIT);
    smallProbe = path.join(dir, "small.probecsv");
    fs.writeFileSync(smallProbe, "a,b\n1,2\n");
  });

  teardown(async () => {
    // provider を外す前に閉じる（Undo のテストはダーティなので revert してから閉じる）
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    vscode.Disposable.from(...disposables.splice(0)).dispose();
  });

  suiteTeardown(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  suite("拡張機能への同期の上限", () => {
    test("文字数が50MiBを超えるファイルはopenTextDocumentが拒否される", async () => {
      await assert.rejects(
        Promise.resolve(vscode.workspace.openTextDocument(vscode.Uri.file(overCsv))),
        /Files above 50MB cannot be synchronized with extensions/
      );
    });

    test("49MiBのファイルはopenTextDocumentで開ける", async () => {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(underCsv));
      assert.ok(document.getText().length < MODEL_SYNC_LIMIT);
    });

    test("上限はバイト数ではなく文字数で判定される（50MiB超でも多バイト文字で文字数が少なければ開ける）", async () => {
      assert.ok(fs.statSync(multibyteCsv).size > MODEL_SYNC_LIMIT);
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(multibyteCsv));
      assert.ok(document.getText().length < MODEL_SYNC_LIMIT);
    });

    test("大きいファイルを開く前の確認（editorLargeFileConfirmation）は既定で1024MBなので50MiB前後では出ない", () => {
      const config = vscode.workspace.getConfiguration("workbench");
      assert.strictEqual(config.inspect<number>("editorLargeFileConfirmation")?.defaultValue, 1024);
    });
  });

  suite("上限を超えるファイルをカスタムエディタで開く", () => {
    test("CustomTextEditorProviderはresolveが呼ばれず、タブだけがカスタムエディタとして残る", async () => {
      let resolved = false;
      disposables.push(
        vscode.window.registerCustomEditorProvider(PROBE_TEXT, {
          resolveCustomTextEditor: () => {
            resolved = true;
          },
        })
      );
      // 拡張ホストで「Unable to retrieve document from URI」が出るが、openWith 自体は解決する
      await vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(overProbe),
        PROBE_TEXT
      );
      await sleep(NOT_CALLED_WAIT_MS);

      assert.strictEqual(resolved, false);
      const input = activeTab()?.input;
      assert.ok(input instanceof vscode.TabInputCustom);
      assert.strictEqual(input.viewType, PROBE_TEXT);
      assert.strictEqual(input.uri.fsPath, vscode.Uri.file(overProbe).fsPath);
    });

    // 既存の csv-editor.openEditor で開いたときの壊れたタブは、大容量モードの入口（openRouting）が
    // 検出して開き直すようになったため、ここでは probe の viewType だけで VSCode の挙動を確かめる
    // （開き直しは largeOpen.test.ts）。

    test("CustomEditorProviderはopenCustomDocumentとresolveCustomEditorが呼ばれる", async () => {
      const probe = createProbeCustomProvider();
      disposables.push(vscode.window.registerCustomEditorProvider(PROBE_CUSTOM, probe.provider));
      await vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(overProbe),
        PROBE_CUSTOM
      );
      await waitFor(() => probe.calls.includes("resolveCustomEditor"));

      assert.deepStrictEqual(probe.calls, ["openCustomDocument", "resolveCustomEditor"]);
    });
  });

  suite("上限を超えるファイルのURIの取り方", () => {
    test("テキストエディタで開いてもactiveTextEditorは無く、タブのTabInputTextからURIが取れる", async () => {
      await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(overCsv));
      await waitFor(() => activeTab()?.input instanceof vscode.TabInputText);

      assert.strictEqual(vscode.window.activeTextEditor, undefined);
      assert.strictEqual(vscode.window.visibleTextEditors.length, 0);
      const input = activeTab()?.input as vscode.TabInputText;
      assert.strictEqual(input.uri.fsPath, vscode.Uri.file(overCsv).fsPath);
    });
  });

  suite("通常のproviderから大容量用のproviderへの振り分け", () => {
    test("上限未満ならresolveCustomTextEditorの中でパネルを閉じてopenWithし直せ、TextDocumentは解放される", async () => {
      const probe = createProbeCustomProvider();
      disposables.push(
        vscode.window.registerCustomEditorProvider(PROBE_CUSTOM, probe.provider),
        vscode.window.registerCustomEditorProvider(PROBE_TEXT, {
          resolveCustomTextEditor: async (document, panel) => {
            panel.dispose();
            await vscode.commands.executeCommand("vscode.openWith", document.uri, PROBE_CUSTOM);
          },
        })
      );
      await vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(smallProbe),
        PROBE_TEXT
      );
      await waitFor(() => probe.calls.includes("resolveCustomEditor"));
      await sleep(300);

      const inputs = allTabInputs();
      assert.strictEqual(inputs.length, 1);
      assert.ok(inputs[0] instanceof vscode.TabInputCustom);
      assert.strictEqual(inputs[0].viewType, PROBE_CUSTOM);
      // 通常の provider が受け取った TextDocument（全文）は、振り分けた後に拡張ホストから解放される
      await waitFor(
        () =>
          !vscode.workspace.textDocuments.some(
            (d) => d.uri.fsPath === vscode.Uri.file(smallProbe).fsPath
          )
      );
    });

    test("上限超えで壊れたタブはonDidChangeTabsで検出して閉じ、openWithし直せる", async () => {
      const probe = createProbeCustomProvider();
      disposables.push(
        vscode.window.registerCustomEditorProvider(PROBE_CUSTOM, probe.provider),
        vscode.window.registerCustomEditorProvider(PROBE_TEXT, {
          resolveCustomTextEditor: () => {},
        }),
        vscode.window.tabGroups.onDidChangeTabs(async (event) => {
          for (const tab of event.opened.filter(isProbeTextTab)) {
            const target = tab.input.uri;
            await vscode.window.tabGroups.close(tab);
            await vscode.commands.executeCommand("vscode.openWith", target, PROBE_CUSTOM);
          }
        })
      );
      await vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(overProbe),
        PROBE_TEXT
      );
      await waitFor(() => probe.calls.includes("resolveCustomEditor"));
      await sleep(300);

      const inputs = allTabInputs();
      assert.strictEqual(inputs.length, 1);
      assert.ok(inputs[0] instanceof vscode.TabInputCustom);
      assert.strictEqual(inputs[0].viewType, PROBE_CUSTOM);
    });

    test("上限超えで壊れたタブは後から（拡張機能の起動時に）tabGroups.allを走査しても見つけて開き直せる", async () => {
      const probe = createProbeCustomProvider();
      disposables.push(
        vscode.window.registerCustomEditorProvider(PROBE_CUSTOM, probe.provider),
        vscode.window.registerCustomEditorProvider(PROBE_TEXT, {
          resolveCustomTextEditor: () => {},
        })
      );
      await vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(overProbe),
        PROBE_TEXT
      );
      await sleep(NOT_CALLED_WAIT_MS);

      const broken = vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .filter(isProbeTextTab);
      assert.strictEqual(broken.length, 1);
      const target = broken[0].input.uri;
      await vscode.window.tabGroups.close(broken);
      await vscode.commands.executeCommand("vscode.openWith", target, PROBE_CUSTOM);
      await waitFor(() => probe.calls.includes("resolveCustomEditor"));

      const inputs = allTabInputs();
      assert.strictEqual(inputs.length, 1);
      assert.ok(inputs[0] instanceof vscode.TabInputCustom);
      assert.strictEqual(inputs[0].viewType, PROBE_CUSTOM);
    });
  });

  suite("CustomEditorProviderのUndo/Redo", () => {
    test("webviewにフォーカスがあるときundo/redoコマンドで編集のundo/redoが呼ばれ、ダーティ状態が戻る", async () => {
      const html = `<!DOCTYPE html><html><body><textarea id="t"></textarea><script>
        const vscode = acquireVsCodeApi();
        document.getElementById("t").focus();
        vscode.postMessage({ hasFocus: document.hasFocus() });
      </script></body></html>`;
      const probe = createProbeCustomProvider(html);
      disposables.push(vscode.window.registerCustomEditorProvider(PROBE_CUSTOM, probe.provider));
      const uri = vscode.Uri.file(smallProbe);
      await vscode.commands.executeCommand("vscode.openWith", uri, PROBE_CUSTOM);
      await waitFor(() => probe.calls.includes(`message:${JSON.stringify({ hasFocus: true })}`));

      probe.fireEdit({ uri, dispose: () => {} });
      await waitFor(() => activeTab()?.isDirty === true);

      await vscode.commands.executeCommand("undo");
      await waitFor(() => probe.calls.includes("undo"));
      await waitFor(() => activeTab()?.isDirty === false);

      await vscode.commands.executeCommand("redo");
      await waitFor(() => probe.calls.includes("redo"));
      await waitFor(() => activeTab()?.isDirty === true);
    });
  });

  suite("拡張ホストのTextDecoder", () => {
    test("グローバルのTextDecoderはutilのTextDecoderと同じもの", () => {
      assert.strictEqual(globalThis.TextDecoder, TextDecoder);
    });

    test("ICUの日本語ロケールデータを持っている（full-icu）", () => {
      assert.strictEqual(
        new Intl.DateTimeFormat("ja", { month: "long" }).format(new Date(2020, 0, 1)),
        "1月"
      );
    });

    const cases: Array<[label: string, bytes: number[], expected: string]> = [
      ["shift_jis", [0x82, 0xa0, 0x8a, 0xbf], "あ漢"],
      ["shift_jis", [0x87, 0x40], "①"], // NEC特殊文字（CP932）
      ["shift_jis", [0xfa, 0x40], "ⅰ"], // IBM拡張文字（CP932）
      ["shift_jis", [0xed, 0x40], "纊"], // NEC選定IBM拡張文字（CP932）
      ["shift_jis", [0x81, 0x60], "～"], // 全角チルダ（CP932 と同じ割り当て）
      ["shift_jis", [0x5c], "\\"],
      ["shift_jis", [0xb1], "ｱ"], // 半角カナ
      ["euc-jp", [0xa4, 0xa2, 0xb4, 0xc1], "あ漢"],
      ["euc-jp", [0x8e, 0xb1], "ｱ"],
      ["euc-jp", [0xa1, 0xc1], "～"],
    ];
    for (const [label, bytes, expected] of cases) {
      test(`${label} の ${bytes.map((b) => b.toString(16)).join(" ")} を ${expected} にデコードできる`, () => {
        const decoded = new TextDecoder(label, { fatal: true }).decode(new Uint8Array(bytes));
        assert.strictEqual(decoded, expected);
      });
    }
  });
});
