#!/usr/bin/env node
/**
 * 大容量モードの RowIndex（行インデックスの作成）と FileRowReader（範囲読み取り）の性能を測る。
 * CI では実行しない（手元の計測用）。
 *
 * 測るもの:
 *   firstRow : 作成開始から1行目（ヘッダー）が確定するまでの時間（先頭行を表示できるまで）
 *   header   : firstRow の後、1行目を FileRowReader で読むまでの時間
 *   index    : 作成完了までの時間と行数
 *   memory   : 作成前後の rss / heapUsed / external / arrayBuffers の増分（--expose-gc なら GC 後）と、作成中の rss の最大
 *   read     : 先頭・中央・末尾付近の 500 行と、中央の 5000 行（MAX_ROWS_PER_REQUEST）の読み取り時間
 *
 * 使い方:
 *   node --expose-gc scripts/bench/measure-large-index.mjs                  # 500MB を OS の一時ディレクトリに生成して測り、計測後に削除
 *   node --expose-gc scripts/bench/measure-large-index.mjs --size 100MB --eol crlf
 *   node --expose-gc scripts/bench/measure-large-index.mjs --file C:\path\to.csv --encoding shift_jis   # 既存ファイル（削除しない）
 * 前提: ルートで npm install 済み（esbuild で src/large を一時ディレクトリにバンドルして読み込む）。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

const { values } = parseArgs({
  options: {
    size: { type: "string", default: "500MB" },
    eol: { type: "string", default: "lf" },
    multiline: { type: "string", default: "0.01" },
    file: { type: "string" },
    encoding: { type: "string", default: "utf-8" },
    keep: { type: "boolean", default: false },
  },
});

const MB = 1024 * 1024;
const fmtMB = (bytes) => `${(bytes / MB).toFixed(1)}MB`;
const now = () => performance.now();
const gc = () => globalThis.gc?.();

/** src/large の部品を一時ディレクトリにバンドルして import する */
async function loadModules(workDir) {
  const esbuild = require("esbuild");
  const entry = path.join(workDir, "entry.ts");
  fs.writeFileSync(
    entry,
    [
      `export { RowIndex } from ${JSON.stringify(path.join(root, "src/large/rowIndex.ts"))};`,
      `export { FileRowReader } from ${JSON.stringify(path.join(root, "src/large/fileRowReader.ts"))};`,
      `export { skipsBom } from ${JSON.stringify(path.join(root, "src/large/largeEncoding.ts"))};`,
    ].join("\n")
  );
  const outfile = path.join(workDir, "bundle.mjs");
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "error",
  });
  return import(pathToFileURL(outfile).href);
}

function generate(workDir) {
  const out = path.join(workDir, `bench-${values.size}-${values.eol}.csv`);
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/bench/generate-large-csv.mjs"),
      "--size",
      values.size,
      "--eol",
      values.eol,
      "--multiline",
      values.multiline,
      "--out",
      out,
    ],
    { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error("CSV の生成に失敗しました");
  }
  console.log(`生成: ${result.stdout.trim()}`);
  return out;
}

const memory = () => {
  gc();
  const m = process.memoryUsage();
  return { rss: m.rss, heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers };
};

async function main() {
  if (!globalThis.gc) {
    console.warn("注意: --expose-gc なしで実行しているため、メモリ値は GC 前の値を含む");
  }
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "large-index-bench-"));
  try {
    const { RowIndex, FileRowReader, skipsBom } = await loadModules(workDir);
    const filePath = values.file ?? generate(workDir);
    const fileSize = fs.statSync(filePath).size;
    const encoding = values.encoding;

    const before = memory();
    let peakRss = before.rss;
    const begin = now();
    const index = RowIndex.build(filePath, {
      skipBom: skipsBom(encoding),
      onProgress: () => {
        peakRss = Math.max(peakRss, process.memoryUsage.rss());
      },
    });
    const reader = await FileRowReader.open(filePath, { encoding });

    await index.firstRow;
    const firstRowMs = now() - begin;
    const header = await reader.readRows(index, 0, 1);
    const headerMs = now() - begin;
    const summary = await index.done;
    const indexMs = now() - begin;
    const after = memory();

    const reads = [];
    const measureRead = async (label, start, count) => {
      const t = now();
      const { rows } = await reader.readRows(index, start, count);
      reads.push({ label, start, count: rows.length, ms: +(now() - t).toFixed(1) });
    };
    const n = summary.rowCount;
    await measureRead("先頭 500行", 1, 500);
    await measureRead("中央 500行", Math.floor(n / 2), 500);
    await measureRead("末尾付近 500行", Math.max(0, n - 500), 500);
    await measureRead("中央 5000行", Math.floor(n / 3), 5000);
    await reader.close();

    const delta = (key) => after[key] - before[key];
    console.log(
      JSON.stringify(
        {
          file: { path: filePath, size: fmtMB(fileSize), encoding },
          firstRowMs: +firstRowMs.toFixed(1),
          headerReadMs: +headerMs.toFixed(1),
          headerCells: header.rows[0]?.length,
          index: {
            ms: +indexMs.toFixed(0),
            rowCount: n,
            delimiter: summary.delimiter,
            throughput: `${(fileSize / MB / (indexMs / 1000)).toFixed(0)}MB/s`,
          },
          memoryDelta: {
            rss: fmtMB(delta("rss")),
            heapUsed: fmtMB(delta("heapUsed")),
            external: fmtMB(delta("external")),
            arrayBuffers: fmtMB(delta("arrayBuffers")),
            peakRssDuringIndex: fmtMB(peakRss - before.rss),
          },
          reads,
        },
        null,
        2
      )
    );
  } finally {
    // 作業ディレクトリ（バンドルと生成した CSV）は消す。--file で渡したファイルは作業ディレクトリの外なので消さない
    if (!values.keep) {
      fs.rmSync(workDir, { recursive: true, force: true });
    } else {
      console.log(`作業ディレクトリ: ${workDir}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
