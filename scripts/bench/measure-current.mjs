#!/usr/bin/env node
/**
 * 現在の構成（全文をメモリに載せる方式）の破綻点を測るスクリプト。CI では実行しない（手元の計測用）。
 *
 * 測るもの（サイズごとに別プロセスで実行し、OOM などの異常終了も記録する）:
 *   read   : fs.readFile(utf8) だけ
 *   parse  : readFile → webview の parseCsv（csv-parse）。時間とメモリ
 *   scan   : readFile → src/shared/csv/rowScanner.ts の scanRows。時間とメモリ
 *   json   : parseCsv の結果を JSON.stringify（postMessage で行配列を送る場合の相当）。時間と文字列サイズ
 *
 * 使い方:
 *   node scripts/bench/generate-large-csv.mjs --size 100MB          # 先に CSV を生成する
 *   node scripts/bench/measure-current.mjs 10MB 50MB 100MB 200MB    # 引数は生成済みの "<size>" ラベル
 *   node scripts/bench/measure-current.mjs --file C:\path\to.csv    # 任意のファイルを測る
 * 前提: ルートと webview-ui で npm install 済み（esbuild と csv-parse を使う）。
 * 環境変数 HEAP_MB で子プロセスの --max-old-space-size を指定できる（既定は Node の既定値）。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const esbuild = require(path.join(root, "node_modules/esbuild"));

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "csv-bench-run-"));
const runner = path.join(workDir, "runner.cjs");

// 子プロセスで実行するコードを一時バンドルする（parseCsv は webview の実装をそのまま使う）
const runnerSource = `
import fs from "node:fs";
import { parseCsv } from ${JSON.stringify(path.join(root, "webview-ui/src/utilities/csvFormat.ts"))};
import { scanRows } from ${JSON.stringify(path.join(root, "src/shared/csv/rowScanner.ts"))};

const [mode, file] = process.argv.slice(2);
const mb = (n) => Math.round(n / 1048576);
const mem = () => { const m = process.memoryUsage(); return { rssMB: mb(m.rss), heapUsedMB: mb(m.heapUsed), externalMB: mb(m.external) }; };
const result = { mode, file };
let t = performance.now();
const text = fs.readFileSync(file, "utf8");
result.readMs = Math.round(performance.now() - t);
result.afterRead = mem();
t = performance.now();
if (mode === "scan") {
  const r = scanRows(text);
  result.rows = r.rows.length;
} else if (mode === "parse" || mode === "json") {
  const r = parseCsv(text);
  if (!r.ok) throw new Error("parse failed: " + r.error.code + " " + r.error.message);
  result.rows = r.rows.length;
  result.parseMs = Math.round(performance.now() - t);
  result.afterParse = mem();
  if (mode === "json") {
    t = performance.now();
    const json = JSON.stringify(r.rows);
    result.jsonMs = Math.round(performance.now() - t);
    result.jsonMB = mb(json.length);
    result.afterJson = mem();
  }
}
if (mode === "scan") { result.scanMs = Math.round(performance.now() - t); result.afterScan = mem(); }
console.log("RESULT " + JSON.stringify(result));
`;
fs.writeFileSync(path.join(workDir, "runner.ts"), runnerSource);
await esbuild.build({
  entryPoints: [path.join(workDir, "runner.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: runner,
  alias: { "@shared": path.join(root, "src/shared") },
  nodePaths: [path.join(root, "webview-ui/node_modules")],
  logLevel: "error",
});

const args = process.argv.slice(2);
const files = args[0] === "--file" ? [args[1]] : args.map((s) => path.join(os.tmpdir(), "large-csv-bench", `${s}-10c-lf.csv`));
const nodeArgs = process.env.HEAP_MB ? [`--max-old-space-size=${process.env.HEAP_MB}`] : [];

for (const file of files) {
  console.log(`\n## ${file} (${Math.round(fs.statSync(file).size / 1048576)} MB)`);
  for (const mode of ["scan", "parse", "json"]) {
    const start = performance.now();
    const r = spawnSync(process.execPath, [...nodeArgs, runner, mode, file], { encoding: "utf8", maxBuffer: 1 << 24 });
    const line = r.stdout.split("\n").find((l) => l.startsWith("RESULT "));
    const wall = Math.round(performance.now() - start);
    if (line) {
      console.log(`${mode}: ${line.slice(7)} wall=${wall}ms`);
    } else {
      const err = (r.stderr.match(/(w*Error: .*|ERR_[A-Z_]+|heap out of memory|Invalid string length|RangeError[^\n]*)/) ?? [r.stderr.trim().split(/\r?\n/).slice(-8).join(" | ").slice(0, 200)])[0];
      console.log(`${mode}: FAILED exit=${r.status} signal=${r.signal} ${err} wall=${wall}ms`);
    }
  }
}
fs.rmSync(workDir, { recursive: true, force: true });
