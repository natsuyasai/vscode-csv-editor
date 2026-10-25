import * as assert from "assert";
import * as fs from "fs";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

suite("ダーティ状態での再オープン", () => {
  const temp = useTempDir("dirty-reopen");

  test("未保存編集があるドキュメントを新しいパネルで開くと、未保存の内容がinitで送られる", async () => {
    const filePath = temp.writeCsv("dirty.csv", "a,b\n1,2\n");
    const document = await openCsv(filePath);
    const first = createProviderHarness(document);
    await first.send({ type: "update", payload: "a,b\n1,2\n3,4\n" });
    await sleep(50);
    assert.ok(document.isDirty);
    first.disposePanel();

    // 同じドキュメント（未保存状態）を新しいパネルで開き直す
    const reopened = await openCsv(filePath);
    assert.strictEqual(reopened, document, "同一のTextDocumentインスタンス");
    const second = createProviderHarness(reopened);
    await second.send({ type: "init" });

    const updates = second.postedOf("update");
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].payload, "a,b\n1,2\n3,4\n");
    assert.strictEqual(fs.readFileSync(filePath, "utf8"), "a,b\n1,2\n", "ディスクは未変更");
    assert.ok(reopened.isDirty, "再オープンでダーティ状態が失われない");
  });

  test("外部拡張による未保存変更も、新しいパネルのinitで送られる", async () => {
    const document = await openCsv(temp.writeCsv("dirty-ext.csv", "a,b\n1,2\n"));
    await replaceAll(document, "x,y\n0,0\n");

    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });

    assert.strictEqual(harness.postedOf("update")[0].payload, "x,y\n0,0\n");
  });
});
