import * as assert from "assert";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

suite("複数CSVを同時に開いたときのパネル分離", () => {
  const temp = useTempDir("isolation");

  async function openTwo() {
    const docA = await openCsv(temp.writeCsv("a.csv", "a1,a2\n1,2\n"));
    const docB = await openCsv(temp.writeCsv("b.csv", "b1,b2\n3,4\n"));
    const harnessA = createProviderHarness(docA);
    const harnessB = createProviderHarness(docB);
    return { docA, docB, harnessA, harnessB };
  }

  test("片方のドキュメントの外部変更は他方のwebviewへ通知されない", async () => {
    const { docA, harnessA, harnessB } = await openTwo();

    await replaceAll(docA, "a1,a2\n9,9\n");
    await sleep(50);

    const updatesA = harnessA.postedOf("update");
    assert.strictEqual(updatesA.length, 1);
    assert.strictEqual(updatesA[0].payload, "a1,a2\n9,9\n");
    assert.strictEqual(harnessB.postedOf("update").length, 0);
  });

  test("片方のwebviewからのupdateは他方のドキュメントに影響せず、他方へ通知もされない", async () => {
    const { docA, docB, harnessA, harnessB } = await openTwo();

    await harnessA.send({ type: "update", payload: "a1,a2\n1,2\n5,6\n" });
    await sleep(50);

    assert.strictEqual(docA.getText(), "a1,a2\n1,2\n5,6\n");
    assert.strictEqual(docB.getText(), "b1,b2\n3,4\n");
    assert.strictEqual(harnessB.posted.length, 0);
    assert.strictEqual(docB.isDirty, false);
  });

  test("両方のパネルから交互に更新しても互いのドキュメント内容が混ざらない", async () => {
    const { docA, docB, harnessA, harnessB } = await openTwo();

    await Promise.all([
      harnessA.send({ type: "update", payload: "A,1\n" }),
      harnessB.send({ type: "update", payload: "B,1\n" }),
    ]);
    await Promise.all([
      harnessB.send({ type: "update", payload: "B,2\n" }),
      harnessA.send({ type: "update", payload: "A,2\n" }),
    ]);
    await sleep(50);

    assert.strictEqual(docA.getText(), "A,2\n");
    assert.strictEqual(docB.getText(), "B,2\n");
    // webview自身の編集はエコーされない
    assert.strictEqual(harnessA.postedOf("update").length, 0);
    assert.strictEqual(harnessB.postedOf("update").length, 0);
  });
});
