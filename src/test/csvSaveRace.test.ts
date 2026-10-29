import * as assert from "assert";
import * as fs from "fs";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import {
  createProviderHarness,
  openCsv,
  replaceAll,
  replaceRows,
  useTempDir,
} from "./helpers/providerHarness";

suite("保存・連続applyOpsと外部変更の競合", () => {
  const temp = useTempDir("save-race");

  /** showWarningMessage をスタブ化して呼び出しを記録する。必ず restore() で復元する */
  function stubWarning() {
    const windowApi = vscode.window as unknown as {
      showWarningMessage: (...args: unknown[]) => Promise<undefined>;
    };
    const original = windowApi.showWarningMessage;
    const calls: unknown[][] = [];
    windowApi.showWarningMessage = (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve(undefined);
    };
    return {
      calls,
      restore: () => {
        windowApi.showWarningMessage = original;
      },
    };
  }

  /** 条件が満たされるまで待つ */
  async function waitFor(predicate: () => boolean, timeoutMs = 1500) {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("待機がタイムアウトしました");
      }
      await sleep(25);
    }
  }

  test("競合で保存が破棄されたときは警告を1回表示する（モーダルにしない）", async () => {
    const document = await openCsv(temp.writeCsv("warn.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    const staleEpoch = harness.latestEpoch();
    await replaceAll(document, "ext,ext\n0,0\n");
    await waitFor(() => harness.latestEpoch() > staleEpoch);
    const warning = stubWarning();
    try {
      // 外部変更の前の内容を前提にした編集と保存（webview はまだ作り直しを受け取っていない）
      await Promise.all([
        harness.send({
          type: "applyOps",
          epoch: staleEpoch,
          ops: [replaceRows(2, 0, [["3", "4"]])],
        }),
        harness.send({ type: "save" }),
      ]);

      assert.strictEqual(warning.calls.length, 1);
      assert.ok((warning.calls[0][0] as string).includes("保存できませんでした"));
      assert.strictEqual(warning.calls[0].length, 1, "モーダル等のオプションを渡さない");
    } finally {
      warning.restore();
    }
  });

  test("正常なapplyOps/saveでは警告を表示しない", async () => {
    const document = await openCsv(temp.writeCsv("nowarn.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    const warning = stubWarning();
    try {
      await harness.send({ type: "init" });
      await harness.sendOps([replaceRows(2, 0, [["3", "4"]])]);
      await harness.sendOps([replaceRows(1, 2, [["9", "9"]])]);
      await harness.send({ type: "save" });

      assert.strictEqual(document.isDirty, false);
      assert.strictEqual(document.getText(), "a,b\n9,9\n");
      assert.strictEqual(warning.calls.length, 0);
    } finally {
      warning.restore();
    }
  });

  test("save送信中に外部変更が入っても例外・デッドロックなく完了する", async () => {
    const filePath = temp.writeCsv("race.csv", "a,b\n1,2\n");
    const document = await openCsv(filePath);
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });

    // await せずに編集と保存を開始し、直後に外部変更を差し込む
    const savePromise = Promise.all([
      harness.sendOps([replaceRows(2, 0, [["3", "4"]])]),
      harness.send({ type: "save" }),
    ]);
    const externalPromise = replaceAll(document, "ext,ext\n0,0\n");

    await Promise.race([
      Promise.all([savePromise, externalPromise]),
      sleep(5000).then(() => {
        throw new Error("デッドロックの疑い: 5秒以内に完了しなかった");
      }),
    ]);

    // どちらが先に適用されるかは実装・タイミングに依存するため、
    // 内容が2つの変更のどちらかの完全な状態であることを検証する
    const finalText = document.getText();
    assert.ok(
      finalText === "a,b\n1,2\n3,4\n" || finalText === "ext,ext\n0,0\n",
      `最終内容が壊れている: ${JSON.stringify(finalText)}`
    );
    // 保存済み（ダーティではない）ならディスク内容 = ドキュメント内容
    if (!document.isDirty) {
      assert.strictEqual(fs.readFileSync(filePath, "utf8"), finalText);
    }
  });

  test("保存完了後に外部変更をしてもwebviewへ通知される（キューが詰まらない）", async () => {
    const document = await openCsv(temp.writeCsv("race-after.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    await harness.sendOps([replaceRows(1, 1, [["5", "6"]])]);
    await harness.send({ type: "save" });
    assert.strictEqual(document.isDirty, false);

    await replaceAll(document, "ext,ext\n0,0\n");
    await sleep(50);

    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, "ext,ext\n0,0\n");
    // 続けて、作り直した後のエポックで webview からの編集も適用できる
    await harness.sendOps([replaceRows(0, 2, [["next", "1"]])]);
    assert.strictEqual(document.getText(), "next,1\n");
  });

  test("連続applyOpsを高速に送っても順序が保たれ、最終値がドキュメントに反映される", async () => {
    const document = await openCsv(temp.writeCsv("rapid.csv", "n\n0\n"));
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    const updatesBefore = harness.postedOf("update").length;
    const changes: string[] = [];
    const sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document && e.contentChanges.length > 0) {
        changes.push(e.document.getText());
      }
    });

    try {
      const values = Array.from({ length: 20 }, (_, i) => String(i + 1));
      // await せずに全て送信する
      await Promise.all(values.map((v) => harness.sendOps([replaceRows(1, 1, [[v]])])));
      await sleep(100);

      const expected = values.map((v) => `n\n${v}\n`);
      assert.strictEqual(document.getText(), expected[expected.length - 1]);
      assert.deepStrictEqual(changes, expected, "適用順 = 送信順");
      assert.strictEqual(
        harness.postedOf("update").length,
        updatesBefore,
        "自身の編集はエコーされない"
      );
    } finally {
      sub.dispose();
    }
  });

  test("連続applyOps中に外部変更が混ざっても最終的に整合した状態になる", async () => {
    const document = await openCsv(temp.writeCsv("rapid-ext.csv", "n\n0\n"));
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    const epoch = harness.latestEpoch();
    const sendValue = (value: string) =>
      harness.send({ type: "applyOps", epoch, ops: [replaceRows(1, 1, [[value]])] });

    const sends = [sendValue("1"), sendValue("2")];
    const external = replaceAll(document, "ext\n");
    sends.push(sendValue("3"));
    const [externalApplied] = await Promise.all([external, ...sends]);
    await sleep(100);

    if (externalApplied) {
      // 外部変更が入った後の古いエポックの操作は適用されず、webview は外部変更の内容で作り直される
      assert.strictEqual(document.getText(), "ext\n");
      const updates = harness.postedOf("update");
      assert.strictEqual(updates[updates.length - 1].payload, "ext\n");
    } else {
      // 外部変更が webview の編集と競合して拒否された場合は、webview の最後の編集が最終値になる
      assert.strictEqual(document.getText(), "n\n3\n");
    }
  });
});
