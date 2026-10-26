import * as fc from "fast-check";
import { parseRow } from "../csv/rowCodec";
import {
  compareCells,
  compareSortKeys,
  normalizeFilters,
  normalizeSearchQuery,
  parseRecord,
  rowMatchesFilters,
  searchRows,
  sortKey,
  sortOrder,
  type SortKind,
} from "./query";

/*
 * 性質:
 * (a) sortKey の大小（compareSortKeys）は、通常モードの比較（compareCells）と符号が一致する
 * (b) sortOrder は安定ソート: 昇順・降順とも、同じキーは元の順、違うキーは比較どおり（降順は比較だけを反転）
 * (c) フィルタは条件に合う行だけを元の順で残す（モデル: 列ごとに小文字の部分一致の AND）
 * (d) searchRows は、開始セルの次から方向に向かって一周したときに最初に一致するセル（モデル: 全セルを並べて回す）
 * (e) parseRecord は parseRow と同じ結果（parseRow が失敗する行は生テキスト1セル）
 */

const kindArb = fc.constantFrom<SortKind>("basic", "text", "alphanumeric");
const cellArb = fc.string({
  unit: fc.constantFrom("a", "B", "b", "0", "1", "9", "\u0000", "-", " ", "あ", "Ａ", "￿"),
  maxLength: 6,
});
const numericArb = fc.oneof(
  fc.bigInt({ min: 0n, max: 10n ** 30n }).map(String),
  fc.nat().map(String),
  cellArb
);
const valueArb = fc.oneof(cellArb, numericArb);

describe("query のプロパティ", () => {
  it("(a) sortKey の大小は compareCells と一致する", () => {
    fc.assert(
      fc.property(kindArb, valueArb, valueArb, (kind, a, b) => {
        expect(Math.sign(compareSortKeys(sortKey(a, kind), sortKey(b, kind)))).toBe(
          Math.sign(compareCells(a, b, kind))
        );
      }),
      { numRuns: 2000 }
    );
  });

  it("(b) sortOrder は安定ソート（降順は比較だけを反転）", () => {
    fc.assert(
      fc.property(
        kindArb,
        fc.constantFrom<"asc" | "desc">("asc", "desc"),
        fc.array(valueArb, { maxLength: 40 }),
        (kind, direction, values) => {
          const keys = values.map((v) => sortKey(v, kind));
          const sign = direction === "asc" ? 1 : -1;
          const expected = values
            .map((_, i) => i)
            .sort((i, j) => sign * compareCells(values[i], values[j], kind) || i - j);
          expect(Array.from(sortOrder(keys, direction))).toEqual(expected);
        }
      )
    );
  });

  it("(c) フィルタは条件に合う行だけを元の順で残す", () => {
    const rowArb = fc.array(cellArb, { maxLength: 4 });
    const filterArb = fc.array(
      fc.record({
        column: fc.nat({ max: 4 }),
        text: fc.string({ unit: fc.constantFrom("a", "B", "1", " "), maxLength: 2 }),
      }),
      { maxLength: 3 }
    );
    fc.assert(
      fc.property(fc.array(rowArb, { maxLength: 20 }), filterArb, (rows, filters) => {
        const normalized = normalizeFilters(filters);
        const actual = rows.filter((row) => rowMatchesFilters(row, normalized));
        const expected = rows.filter((row) =>
          filters.every(
            (f) =>
              f.text === "" || (row[f.column] ?? "").toLowerCase().includes(f.text.toLowerCase())
          )
        );
        expect(actual).toEqual(expected);
      })
    );
  });

  it("(d) searchRows は開始セルの次から一周して最初に一致するセル", () => {
    const rowsArb = fc.array(
      fc.array(fc.string({ unit: fc.constantFrom("a", "A", "b"), maxLength: 2 }), { maxLength: 3 }),
      { maxLength: 8 }
    );
    fc.assert(
      fc.property(
        rowsArb,
        fc.constantFrom(" a", "A", "ab", "b "),
        fc.nat({ max: 9 }),
        fc.option(fc.nat({ max: 3 }), { nil: undefined }),
        fc.constantFrom<"forward" | "backward">("forward", "backward"),
        (rows, query, fromSeed, fromCol, direction) => {
          const needle = normalizeSearchQuery(query) ?? "";
          const from = rows.length === 0 ? 0 : fromSeed % rows.length;
          // モデル: 全セルを行優先に並べ、開始セルの次（fromCol が無ければ行の端のセル自身）から一周する
          const cells: { row: number; col: number }[] = [];
          rows.forEach((row, r) => row.forEach((_, c) => cells.push({ row: r, col: c })));
          if (direction === "backward") {
            cells.reverse();
          }
          const before = (cell: { row: number; col: number }) => {
            if (fromCol === undefined) {
              return direction === "forward" ? cell.row < from : cell.row > from;
            }
            return direction === "forward"
              ? cell.row < from || (cell.row === from && cell.col <= fromCol)
              : cell.row > from || (cell.row === from && cell.col >= fromCol);
          };
          const rotated = [...cells.filter((c) => !before(c)), ...cells.filter(before)];
          const expected =
            rotated.find((c) => rows[c.row][c.col].toLowerCase().includes(needle)) ?? null;
          expect(searchRows(rows, needle, from, fromCol, direction)).toEqual(expected);
        }
      )
    );
  });

  it("(e) parseRecord は parseRow と同じ結果", () => {
    const textArb = fc.string({
      unit: fc.constantFrom("a", ",", '"', "\n", "\r", " "),
      maxLength: 12,
    });
    fc.assert(
      fc.property(textArb, (text) => {
        let expected: string[];
        try {
          expected = parseRow(text);
        } catch {
          expected = [text];
        }
        expect(parseRecord(text)).toEqual(expected);
      }),
      { numRuns: 2000 }
    );
  });
});
