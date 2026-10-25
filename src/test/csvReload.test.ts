import * as assert from "assert";
import * as fs from "fs";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

suite("reload メッセージ", () => {
  const temp = useTempDir("reload");

  test("reload を送ると現在のドキュメント内容が update として送られる", async () => {
    const document = await openCsv(temp.writeCsv("reload.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);

    await harness.send({ type: "reload" });

    const updates = harness.postedOf("update");
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].payload, "a,b\n1,2\n");
  });

  test("未保存の編集後に reload すると、ディスクではなく最新のドキュメント内容が送られる", async () => {
    const document = await openCsv(temp.writeCsv("reload-dirty.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    await harness.send({ type: "update", payload: "a,b\n1,2\n3,4\n" });
    await sleep(100);
    assert.ok(document.isDirty);
    const before = harness.postedOf("update").length;

    await harness.send({ type: "reload" });

    const updates = harness.postedOf("update");
    assert.strictEqual(updates.length, before + 1);
    assert.strictEqual(updates[updates.length - 1].payload, "a,b\n1,2\n3,4\n");
    assert.strictEqual(fs.readFileSync(document.uri.fsPath, "utf8"), "a,b\n1,2\n");
  });

  test("外部変更後に reload すると外部変更を含む内容が送られる", async () => {
    const document = await openCsv(temp.writeCsv("reload-external.csv", "a,b\n1,2\n"));
    const harness = createProviderHarness(document);
    await replaceAll(document, "x,y\n9,9\n");

    await harness.send({ type: "reload" });

    const updates = harness.postedOf("update");
    assert.strictEqual(updates[updates.length - 1].payload, "x,y\n9,9\n");
  });
});
