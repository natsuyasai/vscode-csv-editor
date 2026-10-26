/* global __dirname */
import * as assert from "assert";
import { Buffer } from "buffer";
import * as fs from "fs";
import { suite, setup, teardown, test } from "mocha";
import * as os from "os";
import * as path from "path";

import { RowStore } from "../shared/large/rowStore";
import { stringifyRow } from "../shared/csv/rowCodec";
import {
  detectSortKind,
  normalizeFilters,
  normalizeSearchQuery,
  rowMatchesFilters,
  searchRows,
  sortKey,
  sortOrder,
  type FilterCondition,
  type SearchDirection,
  type SortDirection,
} from "../shared/large/query";
import type { LargeEncoding } from "../large/largeEncoding";
import type {
  QueryJobRequest,
  QuerySource,
  ViewJobResult,
  SearchJobResult,
} from "../large/queryProtocol";
import { QueryScanCancelledError, runQueryJob, type ScanContext } from "../large/queryScan";
import { QueryCancelledError, QueryWorkerClient } from "../large/queryWorkerClient";
import { RowIndex } from "../large/rowIndex";

/**
 * 検索・ソート・フィルタの走査（queryScan）と、それを動かすワーカー（dist/largeCsvWorker.js）。
 * 結果は、ファイルの内容を配列に読んだモデルに query.ts の規則を当てたものと比べる。
 */

const workerPath = path.resolve(__dirname, "../../dist/largeCsvWorker.js");

const noopContext = (): ScanContext => ({
  isCancelled: () => false,
  onProgress: () => {},
  onReleased: () => {},
});

/** データ行 i（1始まりのハンドル）の内容。数字・大文字小文字・クォートが必要な値を混ぜる */
const dataRow = (i: number): string[] => [
  `r${String(i)}`,
  ["Tokyo", "osaka", "Nagoya", "tokyo, east", 'say "hi"'][i % 5],
  String((i * 37) % 11),
  i % 7 === 0 ? "" : `x${String(i % 3)}`,
];

suite("検索・ソート・フィルタの走査とワーカー", function () {
  this.timeout(60000);
  let dir = "";

  setup(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-large-query-"));
  });

  teardown(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** ヘッダー＋データ n 行のファイルを書き、行インデックスを作り終える */
  const prepare = async (n: number, eol = "\n", encoding: LargeEncoding = "utf-8") => {
    const filePath = path.join(dir, `data-${String(n)}.csv`);
    const lines = [
      ["h1", "h2", "h3", "h4"],
      ...Array.from({ length: n }, (_, i) => dataRow(i + 1)),
    ];
    fs.writeFileSync(filePath, lines.map((row) => stringifyRow(row) + eol).join(""));
    const index = RowIndex.build(filePath, { skipBom: true });
    const summary = await index.done;
    const source: QuerySource = { filePath, encoding, starts: index.offsets(), summary };
    return { filePath, source, lines };
  };

  /** RowStore に編集（挿入・削除・セルの編集）を当て、走査に渡す並びと、その並びの行の内容（モデル）を返す */
  const edited = (n: number, lines: string[][]) => {
    const store = new RowStore(n + 1);
    store.apply({
      type: "insertRows",
      beforeHandle: 3,
      handles: [-1, -2],
      rows: [
        ["new1", "TOKYO"],
        ["r99", "kyoto", "5"],
      ],
    });
    store.apply({ type: "deleteRows", handles: [5, 6] });
    store.apply({ type: "setRow", handle: 8, row: ["r8", "Edited Tokyo", "10", "x"] });
    store.apply({
      type: "insertRows",
      beforeHandle: null,
      handles: [-3],
      rows: [["last", "tokyo", "0"]],
    });
    const order = store.handlesSnapshot();
    const edits = store.editedEntries();
    const editMap = new Map(edits);
    const rowOf = (h: number) => editMap.get(h) ?? lines[h];
    return { order, edits, rowOf };
  };

  const expectedView = (
    order: Float64Array,
    rowOf: (h: number) => readonly string[],
    filters: FilterCondition[],
    sort: { column: number; direction: SortDirection } | null
  ) => {
    const normalized = normalizeFilters(filters);
    const kept = Array.from(order).filter((h) => rowMatchesFilters(rowOf(h), normalized));
    if (!sort) {
      return kept;
    }
    const values = kept.map((h) => rowOf(h)[sort.column] ?? "");
    const kind = detectSortKind(values);
    const keys = values.map((v) => sortKey(v, kind));
    return sortOrder(keys, sort.direction).map((i) => kept[i]);
  };

  test("表示順はフィルタ（AND・部分一致）→ ソート（安定）で作り、編集した行・追加行は編集後の内容で扱う", async () => {
    const n = 40;
    const { source, lines } = await prepare(n);
    const { order, edits, rowOf } = edited(n, lines);
    const cases: {
      filters: FilterCondition[];
      sort: { column: number; direction: SortDirection } | null;
    }[] = [
      { filters: [{ column: 1, text: "TOKYO" }], sort: null },
      {
        filters: [
          { column: 1, text: "tokyo" },
          { column: 3, text: "x1" },
        ],
        sort: null,
      },
      { filters: [], sort: { column: 0, direction: "asc" } },
      { filters: [], sort: { column: 2, direction: "desc" } },
      { filters: [{ column: 1, text: "o" }], sort: { column: 1, direction: "asc" } },
      { filters: [{ column: 1, text: "nagoya" }], sort: { column: 2, direction: "asc" } },
      { filters: [{ column: 9, text: "a" }], sort: { column: 0, direction: "asc" } },
    ];
    for (const { filters, sort } of cases) {
      const result = (await runQueryJob(
        {
          kind: "view",
          source: { ...source, starts: source.starts.slice() },
          rows: { order: order.slice(), edits },
          filters: normalizeFilters(filters),
          sort,
          tuning: { batchRows: 7 },
        },
        noopContext()
      )) as ViewJobResult;
      assert.deepStrictEqual(
        Array.from(result.handles),
        expectedView(order, rowOf, filters, sort),
        JSON.stringify({ filters, sort })
      );
    }
  });

  test("検索は並びの開始セルの次から一周して最初に一致するセルを返す（並びがファイル順でもソート後でも）", async () => {
    const n = 25;
    const { source, lines } = await prepare(n, "\r\n");
    const { order, edits, rowOf } = edited(n, lines);
    const sorted = Float64Array.from(
      expectedView(order, rowOf, [], { column: 2, direction: "desc" })
    );
    for (const view of [order, sorted]) {
      const rows = Array.from(view).map(rowOf);
      for (const query of ["tokyo", " HI", "r2", "zzz", "edited"]) {
        const needle = normalizeSearchQuery(query) ?? "";
        for (const direction of ["forward", "backward"] as SearchDirection[]) {
          for (const [from, fromCol] of [
            [0, undefined],
            [3, 1],
            [view.length - 1, 3],
            [10, undefined],
            [7, 0],
          ] as [number, number | undefined][]) {
            const result = (await runQueryJob(
              {
                kind: "search",
                source: { ...source, starts: source.starts.slice() },
                rows: { order: view.slice(), edits },
                needle,
                from,
                fromCol,
                direction,
                tuning: { batchRows: 4 },
              },
              noopContext()
            )) as SearchJobResult;
            const expected = searchRows(rows, needle, from, fromCol, direction);
            const label = JSON.stringify({
              query,
              direction,
              from,
              fromCol,
              sorted: view === sorted,
            });
            assert.deepStrictEqual(
              result.match && { row: result.match.position, col: result.match.col },
              expected,
              label
            );
            if (result.match) {
              assert.strictEqual(result.match.handle, view[result.match.position], label);
            }
          }
        }
      }
    }
  });

  test("Shift_JIS のファイルでもフィルタできる", async () => {
    const filePath = path.join(dir, "sjis.csv");
    // "名前\n日本\nソ表\n" の Shift_JIS（ソ・表は2バイト目が 0x5C）
    fs.writeFileSync(
      filePath,
      Buffer.from([
        0x96, 0xbc, 0x91, 0x4f, 0x0a, 0x93, 0xfa, 0x96, 0x7b, 0x0a, 0x83, 0x5c, 0x95, 0x5c, 0x0a,
      ])
    );
    const index = RowIndex.build(filePath, { skipBom: false });
    const summary = await index.done;
    const result = (await runQueryJob(
      {
        kind: "view",
        source: { filePath, encoding: "shift_jis", starts: index.offsets(), summary },
        rows: { order: Float64Array.from([1, 2]), edits: [] },
        filters: normalizeFilters([{ column: 0, text: "表" }]),
        sort: null,
      },
      noopContext()
    )) as ViewJobResult;
    assert.deepStrictEqual(Array.from(result.handles), [2]);
  });

  test("キャンセルすると走査を止めてファイルを閉じる（閉じた後は置き換えられる）", async () => {
    const { source, filePath } = await prepare(500);
    let progressed = 0;
    let released = false;
    const request: QueryJobRequest = {
      kind: "view",
      source,
      rows: { order: Float64Array.from({ length: 500 }, (_, i) => i + 1), edits: [] },
      filters: [],
      sort: { column: 0, direction: "asc" },
      tuning: { batchRows: 10, progressIntervalMs: 0 },
    };
    await assert.rejects(
      runQueryJob(request, {
        isCancelled: () => progressed >= 2,
        onProgress: () => {
          progressed += 1;
        },
        onReleased: () => {
          released = true;
        },
      }),
      QueryScanCancelledError
    );
    assert.ok(released, "キャンセルでもファイルを閉じたことを知らせる");
    fs.renameSync(filePath, filePath + ".moved");
  });

  test("ソートする行数が上限を超えたら、全部を読む前に失敗してファイルを閉じる", async () => {
    const { source, filePath } = await prepare(500);
    const ratios: number[] = [];
    let released = false;
    await assert.rejects(
      runQueryJob(
        {
          kind: "view",
          source,
          rows: { order: Float64Array.from({ length: 500 }, (_, i) => i + 1), edits: [] },
          // すべての行に合うフィルタ（フィルタ後の行数は読み終えるまで分からない）
          filters: normalizeFilters([{ column: 0, text: "r" }]),
          sort: { column: 0, direction: "asc" },
          maxSortRows: 50,
          tuning: { batchRows: 10, progressIntervalMs: 0 },
        },
        {
          isCancelled: () => false,
          onProgress: (ratio) => {
            ratios.push(ratio);
          },
          onReleased: () => {
            released = true;
          },
        }
      ),
      /上限/
    );
    assert.ok(
      Math.max(0, ...ratios) < 0.2,
      `上限を超えた時点で止める（進捗 ${String(ratios.at(-1))}）`
    );
    assert.ok(released);
    fs.renameSync(filePath, filePath + ".moved");

    // フィルタが無ければ読む前に分かる
    const { source: second } = await prepare(60);
    await assert.rejects(
      runQueryJob(
        {
          kind: "view",
          source: second,
          rows: { order: Float64Array.from({ length: 60 }, (_, i) => i + 1), edits: [] },
          filters: [],
          sort: { column: 0, direction: "asc" },
          maxSortRows: 50,
        },
        noopContext()
      ),
      /上限/
    );
  });

  suite("ワーカー（dist/largeCsvWorker.js）", () => {
    let client: QueryWorkerClient | undefined;

    teardown(async () => {
      await client?.dispose();
      client = undefined;
    });

    test("ワーカーで表示順を作ると、走査をその場で行ったときと同じ結果になる", async () => {
      assert.ok(fs.existsSync(workerPath), `${workerPath} が無い。node esbuild.js を先に実行する`);
      const n = 60;
      const { source, lines } = await prepare(n);
      const { order, edits, rowOf } = edited(n, lines);
      client = new QueryWorkerClient(workerPath);
      const ratios: number[] = [];
      const job = client.run(
        {
          kind: "view",
          source: { ...source, starts: source.starts.slice() },
          rows: { order: order.slice(), edits },
          filters: normalizeFilters([{ column: 1, text: "o" }]),
          sort: { column: 2, direction: "asc" },
          tuning: { batchRows: 5, progressIntervalMs: 0 },
        },
        {
          onProgress: (ratio) => {
            ratios.push(ratio);
          },
        }
      );
      const result = (await job.result) as ViewJobResult;
      assert.deepStrictEqual(
        Array.from(result.handles),
        expectedView(order, rowOf, [{ column: 1, text: "o" }], { column: 2, direction: "asc" })
      );
      assert.ok(ratios.length > 0, "進捗が届く");
      assert.ok(ratios.every((r) => r >= 0 && r <= 1));
      assert.ok(result.stats.peakHeapUsed > 0);
    });

    test("実行中のジョブをキャンセルすると結果は取り消しになり、ファイルは閉じられる", async () => {
      const n = 20000;
      const { source, filePath } = await prepare(n);
      client = new QueryWorkerClient(workerPath);
      let resolveProgress: () => void = () => {};
      const progressed = new Promise<void>((resolve) => {
        resolveProgress = resolve;
      });
      const job = client.run(
        {
          kind: "view",
          // 転送で使えなくなるので、後のジョブのためにコピーを渡す
          source: { ...source, starts: source.starts.slice() },
          rows: { order: Float64Array.from({ length: n }, (_, i) => i + 1), edits: [] },
          filters: [],
          sort: { column: 0, direction: "desc" },
          tuning: { batchRows: 10, progressIntervalMs: 0 },
        },
        {
          onProgress: () => {
            resolveProgress();
          },
        }
      );
      await progressed;
      await job.cancel();
      await assert.rejects(job.result, QueryCancelledError);
      // Windows では開いたままのファイルは置き換えられない（EPERM）
      fs.renameSync(filePath, filePath + ".moved");

      // キャンセルの後も次のジョブを受け付ける
      const next = client.run(
        {
          kind: "search",
          source: { ...source, filePath: filePath + ".moved", starts: source.starts.slice() },
          rows: { order: Float64Array.from([1, 2, 3]), edits: [] },
          needle: "r3",
          from: 0,
          direction: "forward",
        },
        {}
      );
      const found = (await next.result) as SearchJobResult;
      assert.deepStrictEqual(found.match, { position: 2, col: 0, handle: 3 });
    });

    test("release は実行中のジョブを取り消し、ファイルを閉じるまで待つ", async () => {
      const n = 20000;
      const { source, filePath } = await prepare(n);
      client = new QueryWorkerClient(workerPath);
      let resolveProgress: () => void = () => {};
      const progressed = new Promise<void>((resolve) => {
        resolveProgress = resolve;
      });
      const job = client.run(
        {
          kind: "search",
          source,
          rows: { order: Float64Array.from({ length: n }, (_, i) => i + 1), edits: [] },
          needle: "not-found",
          from: 0,
          direction: "forward",
          tuning: { batchRows: 10, progressIntervalMs: 0 },
        },
        {
          onProgress: () => {
            resolveProgress();
          },
        }
      );
      await progressed;
      await client.release();
      await assert.rejects(job.result, QueryCancelledError);
      fs.renameSync(filePath, filePath + ".moved");
    });
  });
});
