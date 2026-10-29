import * as fc from "fast-check";
import { stringifyCsv } from "@/utilities/csvFormat";
import { parseRow, stringifyRow } from "./rowCodec";

describe("rowCodec - Property-Based Tests", () => {
  const cellArb = fc.string({
    unit: fc.constantFrom("a", "b", "1", " ", ",", '"', "\n", "\r", "\r\n", "", "あ", "😀", "\t"),
  });
  const rowArb = fc.array(cellArb, { minLength: 1, maxLength: 8 });

  it("stringifyRow は webview の stringifyCsv(csv-stringify) で1行を書いた結果（末尾改行を除く）と一致する", () => {
    fc.assert(
      fc.property(rowArb, fc.constantFrom("\n" as const, "\r\n" as const), (row, eol) => {
        const expected = stringifyCsv([row], {
          delimiter: ",",
          eol,
          bom: false,
          trailingNewline: false,
        });
        expect(stringifyRow(row, { delimiter: "," })).toBe(expected);
      }),
      { numRuns: 300 }
    );
  });

  it("parseRow(stringifyRow(row)) は元の行に戻る", () => {
    fc.assert(
      fc.property(rowArb, (row) => {
        expect(parseRow(stringifyRow(row))).toEqual(row);
      }),
      { numRuns: 300 }
    );
  });

  it("末尾に改行を付けても同じ結果にパースされる", () => {
    fc.assert(
      fc.property(rowArb, fc.constantFrom("\n", "\r\n"), (row, eol) => {
        expect(parseRow(stringifyRow(row) + eol)).toEqual(row);
      }),
      { numRuns: 100 }
    );
  });
});
