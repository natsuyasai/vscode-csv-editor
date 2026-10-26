import * as assert from "assert";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import {
  createProviderHarness,
  openCsv,
  replaceAll,
  replaceRows,
  useTempDir,
} from "./helpers/providerHarness";

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

  test("片方のwebviewからの編集は他方のドキュメントに影響せず、他方へ通知もされない", async () => {
    const { docA, docB, harnessA, harnessB } = await openTwo();

    await harnessA.send({ type: "init" });
    await harnessA.sendOps([replaceRows(2, 0, [["5", "6"]])]);
    await sleep(50);

    assert.strictEqual(docA.getText(), "a1,a2\n1,2\n5,6\n");
    assert.strictEqual(docB.getText(), "b1,b2\n3,4\n");
    assert.strictEqual(harnessB.posted.length, 0);
    assert.strictEqual(docB.isDirty, false);
  });

  test("両方のパネルから交互に更新しても互いのドキュメント内容が混ざらない", async () => {
    const { docA, docB, harnessA, harnessB } = await openTwo();

    await Promise.all([harnessA.send({ type: "init" }), harnessB.send({ type: "init" })]);
    await Promise.all([
      harnessA.sendOps([replaceRows(0, 2, [["A", "1"]])]),
      harnessB.sendOps([replaceRows(0, 2, [["B", "1"]])]),
    ]);
    await Promise.all([
      harnessB.sendOps([replaceRows(0, 1, [["B", "2"]])]),
      harnessA.sendOps([replaceRows(0, 1, [["A", "2"]])]),
    ]);
    await sleep(50);

    assert.strictEqual(docA.getText(), "A,2\n");
    assert.strictEqual(docB.getText(), "B,2\n");
    // webview自身の編集はエコーされない（init への応答の1回だけ）
    assert.strictEqual(harnessA.postedOf("update").length, 1);
    assert.strictEqual(harnessB.postedOf("update").length, 1);
  });
});
