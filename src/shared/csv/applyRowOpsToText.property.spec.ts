import * as fc from "fast-check";
import { applyRowOps } from "@/utilities/applyRowOps";
import { parseCsv } from "@/utilities/csvFormat";
import { applyRowOpsToText, applyTextEdits, verifyAppliedRows } from "./applyRowOpsToText";
import { detectCsvFormat } from "./csvFormat";
import type { RowOp } from "./ops";
import { parseRow, stringifyRow } from "./rowCodec";
import { scanRows } from "./rowScanner";

/*
 * 性質: テキストに op を当ててからパースした結果は、パースした配列に applyRowOps した結果と一致する
 * （verifyAppliedRows が成功する場合に限る。失敗すれば拡張機能は全文を送り直す）。
 *
 * verifyAppliedRows が失敗する既知の例外（これ以外では失敗しない）:
 * (a) 末尾改行なしのテキストで、適用後の最終行が空文字列に書き出される行（[""]）になる。
 *     末尾改行を足さない方針のため、再パースでその行が消える（BOM のみのファイルへの [""] 追加も含む）
 * (b) 改行コードが混在するテキストで、編集によってクォート外の最初の改行が変わり、検出される行区切りが変わる
 * (c) セル0個の行 [] は [""] として書き出される（行数は変わらないので検査では検出しない）。
 *     webview の行は必ず1セル以上なので、生成器は1セル以上の行だけを作る
 */

const BOM = "﻿";
const NUM_RUNS = 1000;

function parseRows(text: string): string[][] {
  const result = parseCsv(text);
  if (!result.ok) {
    throw new Error(`パースに失敗しました: ${result.error.message}`);
  }
  return result.rows;
}

/** parseCsv の列揃えの影響を除くため、両方を同じ列数まで空セルで埋める */
function padTo(rows: string[][], width: number): string[][] {
  return rows.map((row) => [...row, ...Array<string>(width - row.length).fill("")]);
}

function expectSameRows(actual: string[][], expected: string[][]) {
  const width = Math.max(
    0,
    ...actual.map((row) => row.length),
    ...expected.map((row) => row.length)
  );
  expect(padTo(actual, width)).toEqual(padTo(expected, width));
}

function quoteCell(cell: string, force: boolean): string {
  return force || /[,"\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

// --- op 列の生成（行数に依存するので、種から順に範囲内の op を作る） ---

const newCellArb = fc.string({
  unit: fc.constantFrom("a", "b", ",", '"', "\n", "\r", "\r\n", "あ"),
  maxLength: 4,
});
const newRowArb: fc.Arbitrary<string[]> = fc.oneof(
  fc.array(newCellArb, { minLength: 1, maxLength: 4 }),
  fc.constant<string[]>([""])
);

interface OpSeed {
  atHead: boolean;
  startSeed: number;
  deleteSeed: number;
  rows: string[][];
}

const opSeedsArb = (headBias: number) =>
  fc.array(
    fc.record({
      atHead: fc.integer({ min: 0, max: 99 }).map((n) => n < headBias),
      startSeed: fc.nat(),
      deleteSeed: fc.nat(),
      rows: fc.array(newRowArb, { maxLength: 3 }),
    }),
    { maxLength: 4 }
  );

function toOps(seeds: OpSeed[], initialRowCount: number): RowOp[] {
  let length = initialRowCount;
  return seeds.map(({ atHead, startSeed, deleteSeed, rows }) => {
    const start = atHead ? 0 : startSeed % (length + 1);
    const deleteCount = deleteSeed % (length - start + 1);
    length += rows.length - deleteCount;
    return { type: "replaceRows", start, deleteCount, rows };
  });
}

/** 置換が元テキスト基準で昇順に並び、互いに重ならず、BOM に触れないこと */
function expectWellFormedEdits(text: string, edits: { start: number; end: number }[]) {
  const contentStart = text.startsWith(BOM) ? BOM.length : 0;
  edits.forEach((edit, index) => {
    expect(edit.start).toBeGreaterThanOrEqual(contentStart);
    expect(edit.start).toBeLessThanOrEqual(edit.end);
    expect(edit.end).toBeLessThanOrEqual(text.length);
    if (index > 0) {
      expect(edits[index - 1].end).toBeLessThanOrEqual(edit.start);
    }
  });
}

describe("applyRowOpsToText - Property-Based Tests", () => {
  describe("改行コードが統一されたCSV", () => {
    const cellArb = fc.string({
      unit: fc.constantFrom("a", "b", " ", ",", '"', "\n", "\r", "\r\n", "あ"),
      maxLength: 6,
    });
    const encodedCellArb = fc
      .tuple(cellArb, fc.boolean())
      .map(([cell, force]) => quoteCell(cell, force));
    const rowArb = fc.array(encodedCellArb, { minLength: 1, maxLength: 4 });
    const csvArb = fc
      .record({
        rows: fc.array(rowArb, { minLength: 0, maxLength: 8 }),
        eol: fc.constantFrom("\n", "\r\n", "\r"),
        bom: fc.boolean(),
        trailingNewline: fc.boolean(),
      })
      .map(({ rows, eol, bom, trailingNewline }) => {
        const body = rows.map((row) => row.join(",")).join(eol);
        return (bom ? BOM : "") + body + (trailingNewline && rows.length > 0 ? eol : "");
      });

    it("既知の例外(a)以外では検査が成功し、パース結果が配列への適用と一致する", () => {
      let exceptions = 0;
      fc.assert(
        fc.property(csvArb, opSeedsArb(20), (text, seeds) => {
          const format = detectCsvFormat(text);
          const scan = scanRows(text);
          // parseCsv の列揃え前の各行（既知の例外の判定用）
          const rawRows = scan.rows.map((row) => parseRow(text.slice(row.start, row.end)));
          const ops = toOps(seeds, rawRows.length);
          const expected = applyRowOps(parseRows(text), ops);

          const result = applyRowOpsToText(text, ops, format);
          expectWellFormedEdits(text, result.edits);
          expect(result.rowCount).toBe(expected.length);
          const newText = applyTextEdits(text, result.edits);
          const ok = verifyAppliedRows(newText, result.rowCount, result.delimiter);

          const last = scan.rows.at(-1);
          const hasTrailingNewline = last ? last.end < last.next : format.trailingNewline;
          const expectedRaw = applyRowOps(rawRows, ops);
          const lastRaw = expectedRaw.at(-1);
          const isKnownException =
            !hasTrailingNewline && lastRaw !== undefined && stringifyRow(lastRaw) === "";
          if (isKnownException) {
            exceptions++;
            return;
          }
          expect(ok).toBe(true);
          expectSameRows(parseRows(newText), expected);
        }),
        { numRuns: NUM_RUNS }
      );
      // 例外の判定で大半を捨てて検証が空振りしていないこと
      expect(exceptions / NUM_RUNS).toBeLessThan(0.3);
    });

    it("op を1件ずつ中間テキストに当てた結果と、まとめて当てた結果が一致する", () => {
      fc.assert(
        fc.property(csvArb, opSeedsArb(20), (text, seeds) => {
          const format = detectCsvFormat(text);
          const { delimiter, rows } = scanRows(text);
          const ops = toOps(seeds, rows.length);
          const combined = applyTextEdits(text, applyRowOpsToText(text, ops, format).edits);
          let stepwise = text;
          for (const op of ops) {
            const result = applyRowOpsToText(stepwise, [op], format);
            stepwise = applyTextEdits(stepwise, result.edits);
            // 途中で行構造が崩れたら（既知の例外）以降の比較は意味を持たない
            fc.pre(verifyAppliedRows(stepwise, result.rowCount, result.delimiter));
            // 途中でクォート外の改行が無くなると（全行削除・末尾改行なしの1行）、テキストから行区切りと
            // 末尾改行の有無が失われて書式の値に戻るので比較しない
            fc.pre(delimiter === null || scanRows(stepwise).delimiter === delimiter);
          }
          expect(combined).toBe(stepwise);
        }),
        { numRuns: NUM_RUNS }
      );
    });
  });

  describe("改行コードが混在するCSV", () => {
    // rowScanner.property.spec.ts と同じ生成器（CR 単独や異種の改行、クォート外のセル内容の改行を含む）
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

    it("検査が成功するなら、パース結果が配列への適用と一致する（不一致が検査をすり抜けない）", () => {
      let verified = 0;
      let rejected = 0;
      fc.assert(
        fc.property(textArb, opSeedsArb(50), (text, seeds) => {
          fc.pre(parseCsv(text).ok);
          const ops = toOps(seeds, scanRows(text).rows.length);
          const expected = applyRowOps(parseRows(text), ops);

          const result = applyRowOpsToText(text, ops, detectCsvFormat(text));
          expectWellFormedEdits(text, result.edits);
          expect(result.rowCount).toBe(expected.length);
          const newText = applyTextEdits(text, result.edits);
          if (!verifyAppliedRows(newText, result.rowCount, result.delimiter)) {
            rejected++;
            return;
          }
          verified++;
          // 検査が成功したのにパースできない場合も反例とする
          expect(parseCsv(newText).ok).toBe(true);
          expectSameRows(parseRows(newText), expected);
        }),
        { numRuns: NUM_RUNS }
      );
      // 検査の成功・失敗の両方が十分に起きており、性質が空振りしていないこと
      expect(verified).toBeGreaterThan(NUM_RUNS * 0.2);
      expect(rejected).toBeGreaterThan(0);
    });
  });
});
