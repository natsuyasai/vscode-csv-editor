import * as assert from "assert";
import * as fs from "fs";
import * as vscode from "vscode";
import { setTimeout as sleep } from "timers/promises";
import { suite, test } from "mocha";
import type { RowOp } from "../shared/csv/ops";
import { createProviderHarness, openCsv, replaceAll, useTempDir } from "./helpers/providerHarness";

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

function replaceRows(start: number, deleteCount: number, rows: string[][]): RowOp {
  return { type: "replaceRows", start, deleteCount, rows };
}

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

suite("編集差分の文書への反映", () => {
  const temp = useTempDir("incremental-sync");

  /** CSVファイルを開き、webview の init まで済ませる */
  async function open(name: string, content: string) {
    const filePath = temp.writeCsv(name, content);
    const document = await openCsv(filePath);
    const harness = createProviderHarness(document);
    await harness.send({ type: "init" });
    const latestUpdate = () => harness.postedOf("update").at(-1);
    const latestEpoch = () => {
      const epoch = latestUpdate()?.epoch;
      assert.strictEqual(typeof epoch, "number", "全文の送信にエポックが付いている");
      return epoch as number;
    };
    return { filePath, document, harness, latestUpdate, latestEpoch };
  }

  test("セルの編集で該当行だけが書き換わる", async () => {
    const { document, harness, latestEpoch } = await open("cell.csv", "a,b\n1,2\n3,4\n");
    const ranges: vscode.Range[] = [];
    const sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === document) {
        ranges.push(...e.contentChanges.map((c) => c.range));
      }
    });
    try {
      await harness.send({
        type: "applyOps",
        epoch: latestEpoch(),
        ops: [replaceRows(1, 1, [["9", "2"]])],
      });

      assert.strictEqual(document.getText(), "a,b\n9,2\n3,4\n");
      assert.ok(ranges.length > 0, "文書が変更されている");
      for (const range of ranges) {
        assert.ok(
          range.start.line >= 1 &&
            range.end.line <= 2 &&
            (range.end.line < 2 || range.end.character === 0),
          `2行目の範囲外が変更された: ${JSON.stringify(range)}`
        );
      }
    } finally {
      sub.dispose();
    }
  });

  test("1回の送信に含まれる複数の操作が順に反映される", async () => {
    const { document, harness, latestEpoch } = await open("batch.csv", "a,b\n1,2\n3,4\n");
    const updatesBefore = harness.postedOf("update").length;
    // 後の op の行番号は前の op を適用した後の行番号
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [
        replaceRows(1, 1, []),
        replaceRows(1, 1, [["9", "9"]]),
        replaceRows(2, 0, [["5", "6"]]),
      ],
    });
    await sleep(100);

    assert.strictEqual(document.getText(), "a,b\n9,9\n5,6\n");
    assert.strictEqual(
      harness.postedOf("update").length,
      updatesBefore,
      "エコーの全文は送られない"
    );
  });

  test("末尾改行のないファイルの末尾に行を追加できる", async () => {
    const { document, harness, latestEpoch } = await open("append.csv", "a,b\n1,2");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(2, 0, [["3", "4"]])],
    });

    assert.strictEqual(document.getText(), "a,b\n1,2\n3,4");
  });

  test("編集していない不揃いな行は空セルで埋められない", async () => {
    const { document, harness, latestEpoch } = await open("ragged.csv", "a,b,c\n1\n2,3,4\n");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(2, 1, [["5", "6", "7"]])],
    });

    assert.strictEqual(document.getText(), "a,b,c\n1\n5,6,7\n");
  });

  test("外部変更後に古いエポックの操作は適用されない", async () => {
    const { document, harness, latestUpdate, latestEpoch } = await open("stale.csv", "a,b\n1,2\n");
    const staleEpoch = latestEpoch();
    await replaceAll(document, "x,y\n0,0\n");
    await waitFor(() => latestEpoch() > staleEpoch);
    assert.strictEqual(latestUpdate()?.payload, "x,y\n0,0\n");
    const externalEpoch = latestEpoch();

    await harness.send({
      type: "applyOps",
      epoch: staleEpoch,
      ops: [replaceRows(1, 1, [["9", "9"]])],
    });

    assert.strictEqual(document.getText(), "x,y\n0,0\n");
    assert.ok(latestEpoch() > externalEpoch, "さらに新しいエポックで送られる");
    assert.strictEqual(latestUpdate()?.payload, "x,y\n0,0\n");
  });

  test("保存時に未送信の操作が反映されてから保存される", async () => {
    const { filePath, document, harness, latestEpoch } = await open("save.csv", "a,b\n1,2\n");
    // 応答を待たずに続けて送る（保存は編集の適用の後ろに並ぶ）
    await Promise.all([
      harness.send({
        type: "applyOps",
        epoch: latestEpoch(),
        ops: [replaceRows(1, 1, [["9", "9"]])],
      }),
      harness.send({ type: "save" }),
    ]);

    assert.strictEqual(fs.readFileSync(filePath, "utf8"), "a,b\n9,9\n");
    assert.strictEqual(document.isDirty, false);
  });

  test("競合で操作が破棄された後の保存は警告して保存しない", async () => {
    const { filePath, document, harness, latestEpoch } = await open("save-race.csv", "a,b\n1,2\n");
    const staleEpoch = latestEpoch();
    await replaceAll(document, "x,y\n0,0\n");
    await waitFor(() => latestEpoch() > staleEpoch);
    const warning = stubWarning();
    try {
      await Promise.all([
        harness.send({
          type: "applyOps",
          epoch: staleEpoch,
          ops: [replaceRows(1, 1, [["9", "9"]])],
        }),
        harness.send({ type: "save" }),
      ]);

      assert.strictEqual(warning.calls.length, 1);
      assert.ok((warning.calls[0][0] as string).includes("保存できませんでした"));
      assert.strictEqual(document.isDirty, true);
      assert.strictEqual(fs.readFileSync(filePath, "utf8"), "a,b\n1,2\n");

      await harness.send({ type: "save" });
      assert.strictEqual(document.isDirty, false);
      assert.strictEqual(warning.calls.length, 1, "2回目の保存では警告しない");
    } finally {
      warning.restore();
    }
  });

  test("webview自身の編集はwebviewへ送り返されない", async () => {
    const { document, harness, latestUpdate, latestEpoch } = await open("echo.csv", "a,b\n1,2\n");
    const updatesBefore = harness.postedOf("update").length;
    const epochBefore = latestEpoch();
    await harness.send({
      type: "applyOps",
      epoch: epochBefore,
      ops: [replaceRows(1, 1, [["9", "9"]])],
    });
    await sleep(100);

    assert.strictEqual(document.getText(), "a,b\n9,9\n");
    assert.strictEqual(
      harness.postedOf("update").length,
      updatesBefore,
      "エコーの全文は送られない"
    );

    await replaceAll(document, "x,y\n");
    await waitFor(() => latestUpdate()?.payload === "x,y\n");
    assert.ok(latestEpoch() > epochBefore, "新しいエポックで送られる");
  });

  test("適用後の行構造が操作と一致しないときは全文を送り直す", async () => {
    const { document, harness, latestUpdate, latestEpoch } = await open("verify.csv", "a,b\n1,2");
    const epochBefore = latestEpoch();
    // 末尾改行なしで最終行が空になると、再走査で行が消えて行数が合わなくなる
    await harness.send({
      type: "applyOps",
      epoch: epochBefore,
      ops: [replaceRows(1, 1, [[""]])],
    });

    assert.ok(latestEpoch() > epochBefore, "新しいエポックで送られる");
    assert.strictEqual(latestUpdate()?.payload, document.getText());
  });

  test("範囲外の操作は適用せず全文を送り直す", async () => {
    const { document, harness, latestUpdate, latestEpoch } = await open("range.csv", "a,b\n1,2\n");
    const epochBefore = latestEpoch();
    await harness.send({
      type: "applyOps",
      epoch: epochBefore,
      ops: [replaceRows(4, 1, [])],
    });

    assert.strictEqual(document.getText(), "a,b\n1,2\n");
    assert.ok(latestEpoch() > epochBefore, "新しいエポックで送られる");
    assert.strictEqual(latestUpdate()?.payload, "a,b\n1,2\n");
  });

  /** 改行コードの違いを無視して比べるために CR を取り除く */
  const withoutCr = (text: string) => text.split("\r").join("");

  /** 操作と内容を持たない保存を、応答を待たずに続けて送る */
  async function sendOpsAndSave(
    harness: ReturnType<typeof createProviderHarness>,
    epoch: number,
    ops: RowOp[]
  ) {
    await Promise.all([
      harness.send({ type: "applyOps", epoch, ops }),
      harness.send({ type: "save" }),
    ]);
  }

  test("空のファイルに行を追加できる", async () => {
    const { filePath, document, harness, latestEpoch } = await open("empty.csv", "");
    await sendOpsAndSave(harness, latestEpoch(), [
      replaceRows(0, 0, [
        ["a", "b"],
        ["1", "2"],
      ]),
    ]);

    // 空ファイルは改行コードを持たないため、VSCode の files.eol（Windows では CRLF）になり得る
    assert.strictEqual(withoutCr(fs.readFileSync(filePath, "utf8")), "a,b\n1,2\n");
    assert.strictEqual(document.isDirty, false);
  });

  test("全行を削除すると文書は空になる", async () => {
    const { filePath, document, harness, latestEpoch } = await open("delete-all.csv", "a,b\n1,2\n");
    await sendOpsAndSave(harness, latestEpoch(), [replaceRows(0, 2, [])]);

    assert.strictEqual(fs.readFileSync(filePath, "utf8"), "");
    assert.strictEqual(document.getText(), "");
    assert.strictEqual(document.isDirty, false);
  });

  test("全行を削除した後に行を追加しても元の改行コードと末尾改行の有無を保つ", async () => {
    const { document, harness, latestEpoch } = await open("delete-all-crlf.csv", "a,b\r\n1,2");
    const updatesBefore = harness.postedOf("update").length;
    await harness.send({ type: "applyOps", epoch: latestEpoch(), ops: [replaceRows(0, 2, [])] });
    assert.strictEqual(document.getText(), "");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [
        replaceRows(0, 0, [
          ["x", "y"],
          ["3", "4"],
        ]),
      ],
    });

    assert.strictEqual(document.getText(), "x,y\r\n3,4");
    assert.strictEqual(
      harness.postedOf("update").length,
      updatesBefore,
      "全文の送り直しで済ませていない"
    );
  });

  test("ヘッダー行だけのファイルにデータ行を追加できる", async () => {
    const { document, harness, latestEpoch } = await open("header-only.csv", "a,b\n");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(1, 0, [["1", "2"]])],
    });

    assert.strictEqual(document.getText(), "a,b\n1,2\n");
  });

  test("末尾改行のないヘッダー行だけのファイルにデータ行を追加できる", async () => {
    const { document, harness, latestEpoch } = await open("header-only-no-eol.csv", "a,b");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(1, 0, [["1", "2"]])],
    });

    // 改行を含まないファイルは改行コードを持たないため、VSCode の files.eol（Windows では CRLF）になり得る
    assert.strictEqual(withoutCr(document.getText()), "a,b\n1,2");
  });

  test("CRLFのファイルでセルを編集して保存しても改行コードはCRLFのまま", async () => {
    const { filePath, harness, latestEpoch } = await open("crlf.csv", "a,b\r\n1,2\r\n3,4\r\n");
    await sendOpsAndSave(harness, latestEpoch(), [replaceRows(1, 1, [["9", "9"]])]);

    assert.strictEqual(fs.readFileSync(filePath, "utf8"), "a,b\r\n9,9\r\n3,4\r\n");
  });

  test("末尾改行のないファイルの最終行を編集しても末尾改行は付かない", async () => {
    const { document, harness, latestEpoch } = await open("last-row.csv", "a,b\n1,2");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(1, 1, [["9", "9"]])],
    });

    assert.strictEqual(document.getText(), "a,b\n9,9");
  });

  test("末尾改行のないファイルの最終行を削除しても末尾改行は付かない", async () => {
    const { document, harness, latestEpoch } = await open("delete-last.csv", "a,b\n1,2\n3,4");
    await harness.send({
      type: "applyOps",
      epoch: latestEpoch(),
      ops: [replaceRows(2, 1, [])],
    });

    assert.strictEqual(document.getText(), "a,b\n1,2");
  });
});
