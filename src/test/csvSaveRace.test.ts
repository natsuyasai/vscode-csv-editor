import * as assert from "assert";
import * as fs from "fs";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

suite("保存・連続updateと外部変更の競合", () => {
  const temp = useTempDir("save-race");

  /** showWarningMessage をスタブ化して呼び出しを記録する。必ず restore() で復元する */
  function stubWarning() {
    const windowApi = vscode.window as unknown as {
      showWarningMessage: (...args: unknown[]) => Thenable<undefined>;
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

  test("競合で保存が破棄されたときは警告を1回表示する（モーダルにしない）", async () => {
    const document = await openCsv(temp.writeCsv("warn.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    const warning = stubWarning();
    try {
      const savePromise = harness.send({ type: "save", payload: "a,b\n1,2\n3,4\n" });
      const externalPromise = replaceAll(document, "ext,ext\n0,0\n");
      await Promise.all([savePromise, externalPromise]);

      assert.strictEqual(warning.calls.length, 1);
      assert.ok((warning.calls[0][0] as string).includes("保存できませんでした"));
      assert.strictEqual(warning.calls[0].length, 1, "モーダル等のオプションを渡さない");
    } finally {
      warning.restore();
    }
  });

  test("正常なsave/updateでは警告を表示しない", async () => {
    const document = await openCsv(temp.writeCsv("nowarn.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    const warning = stubWarning();
    try {
      await harness.send({ type: "update", payload: "a,b\n1,2\n3,4\n" });
      await harness.send({ type: "save", payload: "a,b\n9,9\n" });

      assert.strictEqual(document.isDirty, false);
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

    // await せずに save を開始し、直後に外部変更を差し込む
    const savePromise = harness.send({ type: "save", payload: "a,b\n1,2\n3,4\n" });
    const externalPromise = replaceAll(document, "ext,ext\n0,0\n");

    await Promise.race([
      Promise.all([savePromise, externalPromise]),
      sleep(5000).then(() => {
        throw new Error("デッドロックの疑い: 5秒以内に完了しなかった");
      }),
    ]);

    // 観察した実挙動: 外部変更が先に適用され、webview側の全置換は applyEdit が false を返して
    // 適用されず、save も中断される（外部変更が勝ち、ダーティのまま・ディスク未変更）。
    // 実装変更に過度に縛られないよう、ここでは内容が2つの変更のどちらかの完全な状態であることを検証する
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
    await harness.send({ type: "save", payload: "a,b\n5,6\n" });
    assert.strictEqual(document.isDirty, false);

    await replaceAll(document, "ext,ext\n0,0\n");
    await sleep(50);

    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, "ext,ext\n0,0\n");
    // 続けてwebviewからの更新も適用できる
    await harness.send({ type: "update", payload: "next,1\n" });
    assert.strictEqual(document.getText(), "next,1\n");
  });

  test("連続updateを高速に送っても順序が保たれ、最終値がドキュメントに反映される", async () => {
    const document = await openCsv(temp.writeCsv("rapid.csv", "n\n0\n"));
    const harness = createProviderHarness(document);
    const changes: string[] = [];
    const sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document && e.contentChanges.length > 0) {
        changes.push(e.document.getText());
      }
    });

    try {
      const payloads = Array.from({ length: 20 }, (_, i) => `n\n${String(i + 1)}\n`);
      // await せずに全て送信する
      await Promise.all(payloads.map((p) => harness.send({ type: "update", payload: p })));
      await sleep(100);

      assert.strictEqual(document.getText(), payloads[payloads.length - 1]);
      assert.deepStrictEqual(changes, payloads, "適用順 = 送信順");
      assert.strictEqual(harness.postedOf("update").length, 0, "自身の編集はエコーされない");
    } finally {
      sub.dispose();
    }
  });

  test("連続update中に外部変更が混ざっても最終的に整合した状態になる", async () => {
    const document = await openCsv(temp.writeCsv("rapid-ext.csv", "n\n0\n"));
    const harness = createProviderHarness(document);

    const sends = [
      harness.send({ type: "update", payload: "n\n1\n" }),
      harness.send({ type: "update", payload: "n\n2\n" }),
    ];
    const external = replaceAll(document, "ext\n");
    sends.push(harness.send({ type: "update", payload: "n\n3\n" }));
    await Promise.all([...sends, external]);
    await sleep(100);

    // 最後にキューへ積まれたwebviewの更新が最終値になる
    assert.strictEqual(document.getText(), "n\n3\n");
  });
});
