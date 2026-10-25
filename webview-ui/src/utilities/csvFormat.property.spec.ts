import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseCsv, stringifyCsv, type CsvFormat } from "./csvFormat";

describe("csvFormat - Property-Based Tests", () => {
  // 空行はパース時に無視されるため、各行は1列以上かつ「全セル空」の1列行を避ける
  const cellArb = fc.string({
    unit: fc.constantFrom("a", "b", "1", " ", ",", '"', "\n", "\r\n", "あ"),
  });
  const rowsArb = fc
    .integer({ min: 1, max: 4 })
    .chain((cols) =>
      fc.array(fc.array(cellArb, { minLength: cols, maxLength: cols }), {
        minLength: 1,
        maxLength: 6,
      })
    )
    .filter((rows) => rows.every((row) => row.length > 1 || row[0] !== ""));
  const formatArb: fc.Arbitrary<CsvFormat> = fc.record({
    delimiter: fc.constant(","),
    eol: fc.constantFrom("\r\n" as const, "\n" as const),
    bom: fc.boolean(),
    trailingNewline: fc.boolean(),
  });

  it("書式で文字列化したテキストをparse→stringifyすると元に戻り、書式も保持される", () => {
    fc.assert(
      fc.property(rowsArb, formatArb, (rows, format) => {
        const text = stringifyCsv(rows, format);
        const result = parseCsv(text);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.rows).toEqual(rows);
        // 改行が1つも現れない(1行・末尾改行なし)場合は改行コードを判別できないため、それ以外で書式一致を確認する
        const eolDetectable = rows.length > 1 || format.trailingNewline;
        expect(result.format).toEqual(eolDetectable ? format : { ...format, eol: "\n" });
        expect(stringifyCsv(result.rows, result.format)).toBe(text);
      }),
      { numRuns: 200 }
    );
  });

  it("BOMはヘッダー(先頭セル)に混入しない", () => {
    fc.assert(
      fc.property(rowsArb, formatArb, (rows, format) => {
        const result = parseCsv(stringifyCsv(rows, { ...format, bom: true }));
        expect(result.ok && result.rows[0][0].startsWith("﻿")).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
