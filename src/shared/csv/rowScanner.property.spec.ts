import * as fc from "fast-check";
import { parseCsv } from "@/utilities/csvFormat";
import { scanRows } from "./rowScanner";

const BOM = "﻿";
const NUM_RUNS = 1000;

/** parseCsv が成功する前提で行を返す */
function parseRows(text: string): string[][] {
  const result = parseCsv(text);
  if (!result.ok) {
    throw new Error(`パースに失敗しました: ${result.error.message}`);
  }
  return result.rows;
}

/** csv-stringify と同じ規則（区切り文字・`"`・CR・LF を含むセルだけクォート）でセルを書き出す。force で常にクォートする */
function quoteCell(cell: string, force: boolean): string {
  return force || /[,"\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/**
 * 行境界の検出結果が parseCsv のレコード分割と一致することを確かめる。
 * - 行数がレコード数と一致する
 * - 各行が隙間なく並び（BOMの直後から始まりテキスト末尾で終わる）、行間はちょうど行区切りである
 * - 各行の「次の行の開始位置」までのテキストをパースすると、ちょうどその行までのレコードになり内容も一致する
 */
function expectMatchesParseCsv(text: string) {
  const fullRows = parseRows(text);
  const { delimiter, rows } = scanRows(text);
  expect(rows).toHaveLength(fullRows.length);

  const contentStart = text.startsWith(BOM) ? 1 : 0;
  rows.forEach((row, index) => {
    expect(row.start).toBe(index === 0 ? contentStart : rows[index - 1].next);
    expect(row.start).toBeLessThanOrEqual(row.end);
    const separator = text.slice(row.end, row.next);
    if (index < rows.length - 1 || separator !== "") {
      expect(separator).toBe(delimiter);
    }

    const prefixRows = parseRows(text.slice(0, row.next));
    expect(prefixRows).toHaveLength(index + 1);
    // parseCsv は最大列数まで空セルで補うため、補われる前の列数の範囲で比べる
    prefixRows.forEach((prefixRow, i) => {
      expect(fullRows[i].slice(0, prefixRow.length)).toEqual(prefixRow);
    });
  });
  const last = rows.at(-1);
  expect(last ? last.next : contentStart).toBe(text.length);
}

describe("rowScanner - Property-Based Tests", () => {
  describe("正しくクォートされたCSV", () => {
    const cellArb = fc.string({
      unit: fc.constantFrom("a", "b", " ", ",", '"', "\n", "\r", "\r\n", "あ"),
      maxLength: 6,
    });
    const encodedCellArb = fc
      .tuple(cellArb, fc.boolean())
      .map(([cell, force]) => quoteCell(cell, force));
    // 列数は行ごとに変え（不揃いな列数）、空セルを含める
    const rowArb = fc.array(encodedCellArb, { minLength: 1, maxLength: 4 });
    const csvArb = fc
      .record({
        rows: fc.array(rowArb, { minLength: 0, maxLength: 8 }),
        eol: fc.constantFrom("\n", "\r\n"),
        bom: fc.boolean(),
        trailingNewline: fc.boolean(),
      })
      .map(({ rows, eol, bom, trailingNewline }) => {
        const body = rows.map((row) => row.join(",")).join(eol);
        return (bom ? BOM : "") + body + (trailingNewline && rows.length > 0 ? eol : "");
      });

    it("行境界が parseCsv のレコード分割と一致する", () => {
      fc.assert(
        fc.property(csvArb, (text) => {
          expectMatchesParseCsv(text);
        }),
        { numRuns: NUM_RUNS }
      );
    });

    it("生成した各行の位置をそのまま検出する", () => {
      const rowsArb = fc.array(rowArb, { minLength: 1, maxLength: 8 });
      fc.assert(
        fc.property(rowsArb, fc.constantFrom("\n", "\r\n"), fc.boolean(), (rows, eol, bom) => {
          const lines = rows.map((row) => row.join(","));
          const text = (bom ? BOM : "") + lines.map((line) => line + eol).join("");
          let offset = bom ? 1 : 0;
          const expected = lines.map((line) => {
            const range = {
              start: offset,
              end: offset + line.length,
              next: offset + line.length + eol.length,
            };
            offset = range.next;
            return range;
          });
          const result = scanRows(text);
          expect(result.rows).toEqual(expected);
          expect(result.delimiter).toBe(eol);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  describe("改行コードが混在するCSV", () => {
    // 区切りに CR 単独や異種の改行を混ぜ、クォートの外に現れる「行区切りでない改行」（セル内容になる）も生成する
    const unquotedArb = fc.string({ unit: fc.constantFrom("a", " ", "あ"), maxLength: 3 });
    const quotedArb = fc
      .string({ unit: fc.constantFrom("a", ",", "\n", "\r", '""'), maxLength: 4 })
      .map((inner) => `"${inner}"`);
    const fieldArb = fc.oneof(unquotedArb, quotedArb);
    const separatorArb = fc.constantFrom(",", "\n", "\r", "\r\n");
    const textArb = fc
      .record({
        first: fieldArb,
        rest: fc.array(fc.tuple(separatorArb, fieldArb), { maxLength: 12 }),
        trailing: fc.option(separatorArb, { nil: undefined }),
        bom: fc.boolean(),
      })
      .map(
        ({ first, rest, trailing, bom }) =>
          (bom ? BOM : "") +
          first +
          rest.map(([separator, field]) => separator + field).join("") +
          (trailing ?? "")
      );

    it("parseCsv が受け付けるテキストで行境界がレコード分割と一致する", () => {
      let generated = 0;
      let accepted = 0;
      fc.assert(
        fc.property(textArb, (text) => {
          generated++;
          fc.pre(parseCsv(text).ok);
          accepted++;
          expectMatchesParseCsv(text);
        }),
        { numRuns: NUM_RUNS }
      );
      // 前提条件で捨てすぎて検証が空振りしていないこと
      expect(accepted / generated).toBeGreaterThan(0.3);
    });
  });
});
