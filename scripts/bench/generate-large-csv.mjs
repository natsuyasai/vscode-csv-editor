#!/usr/bin/env node
/**
 * ベンチマーク用の大きな CSV を生成する（ストリーム書き出し。メモリは一定）。
 * 生成物はリポジトリに置かない。既定の出力先は OS の一時ディレクトリ。CI では実行しない。
 *
 * 使い方:
 *   node scripts/bench/generate-large-csv.mjs --size 500MB
 *   node scripts/bench/generate-large-csv.mjs --size 50MB --cols 20 --eol crlf --multiline 0.05 --out ./tmp.csv
 *   node scripts/bench/generate-large-csv.mjs --size 10MB --encoding shift_jis   (iconv-lite が必要)
 *
 * オプション:
 *   --size       目標サイズ（例 10MB / 1.5GB / 123456）。既定 10MB。実サイズは目標を超えない範囲で行単位に丸める
 *   --cols       列数。既定 10
 *   --eol        lf | crlf。既定 lf
 *   --multiline  クォート内改行を含む行の割合 0〜1。既定 0.01
 *   --encoding   utf8 | shift_jis。既定 utf8（shift_jis は iconv-lite をインストールしている場合のみ）
 *   --out        出力先ファイル。既定 <OS一時ディレクトリ>/large-csv-bench/<サイズ>-<列数>c-<eol>.csv
 *   --seed       乱数シード（整数）。既定 1。同じ引数なら同じ内容になる
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { parseArgs } from "node:util";

const UNITS = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };

/** "500MB" 形式をバイト数にする */
export function parseSize(text) {
  const m = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(text.trim());
  if (!m) {
    throw new Error(`サイズを解釈できません: ${text}`);
  }
  return Math.floor(Number(m[1]) * UNITS[(m[2] ?? "b").toLowerCase()]);
}

/** 再現可能な軽量乱数（mulberry32） */
function createRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ["alpha", "beta", "gamma", "データ", "テスト", "日本語", "ｱｲｳ", "①②", "tokyo", "osaka"];

async function loadEncoder(encoding) {
  if (encoding === "utf8") {
    return (s) => Buffer.from(s, "utf8");
  }
  if (encoding === "shift_jis") {
    try {
      const iconv = (await import("iconv-lite")).default;
      return (s) => iconv.encode(s, "shift_jis");
    } catch {
      console.error("shift_jis は未対応: iconv-lite が見つかりません（npm install iconv-lite 後に再実行）");
      process.exit(2);
    }
  }
  console.error(`未対応の文字コード: ${encoding}`);
  process.exit(2);
}

async function main() {
  const { values } = parseArgs({
    options: {
      size: { type: "string", default: "10MB" },
      cols: { type: "string", default: "10" },
      eol: { type: "string", default: "lf" },
      multiline: { type: "string", default: "0.01" },
      encoding: { type: "string", default: "utf8" },
      out: { type: "string" },
      seed: { type: "string", default: "1" },
    },
  });
  const targetBytes = parseSize(values.size);
  const cols = Number(values.cols);
  const multilineRatio = Number(values.multiline);
  const eol = values.eol === "crlf" ? "\r\n" : "\n";
  if (!Number.isInteger(cols) || cols < 1 || !(multilineRatio >= 0 && multilineRatio <= 1)) {
    throw new Error("--cols は1以上の整数、--multiline は0〜1で指定してください");
  }
  const encode = await loadEncoder(values.encoding);
  const random = createRandom(Number(values.seed));
  const out =
    values.out ??
    path.join(os.tmpdir(), "large-csv-bench", `${values.size}-${cols}c-${values.eol}${values.encoding === "utf8" ? "" : "-" + values.encoding}.csv`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const stream = fs.createWriteStream(out);
  const write = async (buf) => {
    if (!stream.write(buf)) {
      await once(stream, "drain");
    }
  };

  const makeCell = (row, col) => {
    const word = WORDS[Math.floor(random() * WORDS.length)];
    if (col === 0) {
      return String(row);
    }
    if (col === 1 && random() < multilineRatio) {
      // クォート内改行・カンマ・エスケープされたクォートを含むセル
      return `"line1 ${word}${eol === "\r\n" ? "\n" : "\r\n"}line2, ""${word}"" ${row}"`;
    }
    return col % 3 === 0 ? String(Math.floor(random() * 1e6)) : `${word}-${row}-${col}`;
  };

  let written = 0;
  let rows = 0;
  const startedAt = Date.now();
  const chunk = [];
  let chunkBytes = 0;
  const flush = async () => {
    if (chunk.length > 0) {
      await write(Buffer.concat(chunk));
      chunk.length = 0;
      chunkBytes = 0;
    }
  };
  const header = Array.from({ length: cols }, (_, c) => `col${c}`).join(",") + eol;
  const headerBuf = encode(header);
  chunk.push(headerBuf);
  written += headerBuf.length;
  chunkBytes += headerBuf.length;

  for (;;) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      cells.push(makeCell(rows, c));
    }
    const buf = encode(cells.join(",") + eol);
    if (written + buf.length > targetBytes) {
      break;
    }
    chunk.push(buf);
    chunkBytes += buf.length;
    written += buf.length;
    rows++;
    if (chunkBytes >= 1 << 20) {
      await flush();
    }
  }
  await flush();
  stream.end();
  await once(stream, "finish");
  console.log(
    JSON.stringify({ out, bytes: written, dataRows: rows, cols, eol: values.eol, encoding: values.encoding, seconds: (Date.now() - startedAt) / 1000 })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
