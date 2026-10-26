import * as fc from "fast-check";
import { createByteRowScanner, scanRowsBytes } from "./byteRowScanner";
import { scanRows } from "./rowScanner";

const BOM = "﻿";
const NUM_RUNS = 1000;

type Encoding = "utf-8" | "shift_jis" | "euc-jp";
const ENCODINGS: Encoding[] = ["utf-8", "shift_jis", "euc-jp"];

/**
 * Shift_JIS / EUC-JP のエンコード表（npm の iconv-lite は shared の spec で使えないため小さな表で持つ）。
 * 各バイト列は TextDecoder で逆引きして確かめたもの（下の「エンコード表」のテストで検証する）。
 * - Shift_JIS: 2バイト目が 0x5C の文字（ソ・表・能）、半角カナ（1バイト）、NEC 特殊文字（①）、
 *   NEC 選定 IBM 拡張（﨑 ED95）、IBM 拡張（髙 FBFC）、全角チルダ ～(U+FF5E, 8160)
 * - EUC-JP: 半角カナ（8E xx の2バイト）、JIS X 0212 の3バイト（丂 8F B0 A1）、IBM 拡張（髙・﨑）、
 *   ～(U+FF5E) は実ファイルでよく使われる A1C1 の形
 */
const MULTIBYTE_TABLE: Record<Exclude<Encoding, "utf-8">, Record<string, number[]>> = {
  "shift_jis": {
    "あ": [0x82, 0xa0],
    "を": [0x82, 0xf0],
    "ア": [0x83, 0x41],
    "ン": [0x83, 0x93],
    "ソ": [0x83, 0x5c],
    "表": [0x95, 0x5c],
    "能": [0x94, 0x5c],
    "漢": [0x8a, 0xbf],
    "字": [0x8e, 0x9a],
    "ー": [0x81, 0x5b],
    "、": [0x81, 0x41],
    "。": [0x81, 0x42],
    "＂": [0xee, 0xfc],
    "，": [0x81, 0x43],
    "ｱ": [0xb1],
    "ﾝ": [0xdd],
    "ﾞ": [0xde],
    "①": [0x87, 0x40],
    "～": [0x81, 0x60],
    "髙": [0xfb, 0xfc],
    "﨑": [0xed, 0x95],
  },
  "euc-jp": {
    "あ": [0xa4, 0xa2],
    "を": [0xa4, 0xf2],
    "ア": [0xa5, 0xa2],
    "ン": [0xa5, 0xf3],
    "ソ": [0xa5, 0xbd],
    "表": [0xc9, 0xbd],
    "能": [0xc7, 0xbd],
    "漢": [0xb4, 0xc1],
    "字": [0xbb, 0xfa],
    "ー": [0xa1, 0xbc],
    "、": [0xa1, 0xa2],
    "。": [0xa1, 0xa3],
    "＂": [0xfc, 0xfe],
    "，": [0xa1, 0xa4],
    "ｱ": [0x8e, 0xb1],
    "ﾝ": [0x8e, 0xdd],
    "ﾞ": [0x8e, 0xde],
    "①": [0xad, 0xa1],
    "～": [0xa1, 0xc1],
    "髙": [0xfc, 0xe2],
    "﨑": [0xf9, 0xf5],
    "丂": [0x8f, 0xb0, 0xa1],
  },
};

/** 行境界の判定に使うバイト（LF・CR・`"`・`,`） */
const STRUCTURAL_BYTES = [0x0a, 0x0d, 0x22, 0x2c];

/** その文字コードで生成に使う多バイト文字 */
function multibyteChars(encoding: Encoding): string[] {
  if (encoding === "utf-8") {
    return Object.keys(MULTIBYTE_TABLE["euc-jp"]);
  }
  return Object.keys(MULTIBYTE_TABLE[encoding]);
}

function encode(text: string, encoding: Encoding): Uint8Array {
  if (encoding === "utf-8") {
    return new TextEncoder().encode(text);
  }
  const table = MULTIBYTE_TABLE[encoding];
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      out.push(code);
      continue;
    }
    const encoded = table[char];
    if (!encoded) {
      throw new Error(`${encoding} の表に無い文字です: ${char}`);
    }
    out.push(...encoded);
  }
  return new Uint8Array(out);
}

/** BOM を残し、不正なバイト列で例外を投げるデコーダ */
const decoderOf = (encoding: Encoding) =>
  new TextDecoder(encoding, { fatal: true, ignoreBOM: true });

/** csv-stringify と同じ規則（区切り文字・`"`・CR・LF を含むセルだけクォート）でセルを書き出す。force で常にクォートする */
function quoteCell(cell: string, force: boolean): string {
  return force || /[,"\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** 正しくクォートされたCSV（rowScanner.property.spec.ts の生成器に多バイト文字を足したもの） */
function quotedCsvArb(chars: string[], bom: boolean) {
  const cellArb = fc.string({
    unit: fc.constantFrom("a", " ", ",", '"', "\n", "\r", "\r\n", ...chars),
    maxLength: 6,
  });
  const encodedCellArb = fc
    .tuple(cellArb, fc.boolean())
    .map(([cell, force]) => quoteCell(cell, force));
  const rowArb = fc.array(encodedCellArb, { minLength: 1, maxLength: 4 });
  return fc
    .record({
      rows: fc.array(rowArb, { minLength: 0, maxLength: 8 }),
      eol: fc.constantFrom("\n", "\r\n"),
      bom: bom ? fc.boolean() : fc.constant(false),
      trailingNewline: fc.boolean(),
    })
    .map(({ rows, eol, bom: withBom, trailingNewline }) => {
      const body = rows.map((row) => row.join(",")).join(eol);
      return (withBom ? BOM : "") + body + (trailingNewline && rows.length > 0 ? eol : "");
    });
}

/** 改行コードが混在し、CR 単独やクォート外の「行区切りでない改行」を含むテキスト */
function mixedNewlineArb(chars: string[], bom: boolean) {
  const unquotedArb = fc.string({ unit: fc.constantFrom("a", " ", ...chars), maxLength: 3 });
  const quotedArb = fc
    .string({ unit: fc.constantFrom("a", ",", "\n", "\r", '""', ...chars), maxLength: 4 })
    .map((inner) => `"${inner}"`);
  const fieldArb = fc.oneof(unquotedArb, quotedArb);
  const separatorArb = fc.constantFrom(",", "\n", "\r", "\r\n");
  return fc
    .record({
      first: fieldArb,
      rest: fc.array(fc.tuple(separatorArb, fieldArb), { maxLength: 12 }),
      trailing: fc.option(separatorArb, { nil: undefined }),
      bom: bom ? fc.boolean() : fc.constant(false),
    })
    .map(
      ({ first, rest, trailing, bom: withBom }) =>
        (withBom ? BOM : "") +
        first +
        rest.map(([separator, field]) => separator + field).join("") +
        (trailing ?? "")
    );
}

/** 閉じていないクォートなども含む任意のテキスト（文字列版と結果が一致するのは任意のテキストで成り立つ） */
function arbitraryTextArb(chars: string[], bom: boolean) {
  return fc
    .tuple(
      bom ? fc.boolean() : fc.constant(false),
      fc.string({ unit: fc.constantFrom(",", '"', "\r", "\n", "a", ...chars), maxLength: 30 })
    )
    .map(([withBom, body]) => (withBom ? BOM : "") + body);
}

/** 文字コードごとに、その文字コードで表せるテキストを生成する */
function textArbFor(encoding: Encoding) {
  const chars = multibyteChars(encoding);
  // BOM は UTF-8 だけに付く
  const bom = encoding === "utf-8";
  return fc.oneof(
    quotedCsvArb(chars, bom),
    mixedNewlineArb(chars, bom),
    arbitraryTextArb(chars, bom)
  );
}

const encodedTextArb = fc
  .constantFrom(...ENCODINGS)
  .chain((encoding) => textArbFor(encoding).map((text) => ({ encoding, text })));

/**
 * バイト版の各行範囲をデコードしたテキストが、文字列版 scanRows の各行範囲のテキストと一致することを確かめる。
 */
function expectMatchesStringScan(text: string, encoding: Encoding) {
  const data = encode(text, encoding);
  const decoder = decoderOf(encoding);
  // エンコード表の取り違えを検出する（往復で元のテキストに戻る）
  expect(decoder.decode(data)).toBe(text);

  const expected = scanRows(text);
  const actual = scanRowsBytes(data);
  expect(actual.delimiter).toBe(expected.delimiter);
  expect(actual.rows).toHaveLength(expected.rows.length);

  const contentStart = text.startsWith(BOM) ? 3 : 0;
  actual.rows.forEach((row, index) => {
    const stringRow = expected.rows[index];
    expect(row.start).toBe(index === 0 ? contentStart : actual.rows[index - 1].next);
    expect(decoder.decode(data.subarray(row.start, row.end))).toBe(
      text.slice(stringRow.start, stringRow.end)
    );
    expect(decoder.decode(data.subarray(row.end, row.next))).toBe(
      text.slice(stringRow.end, stringRow.next)
    );
  });
  expect(actual.rows.at(-1)?.next ?? contentStart).toBe(data.length);
}

/** チャンクに分けて与えた結果 */
function scanChunks(chunks: Uint8Array[]) {
  const rows: { start: number; end: number; next: number }[] = [];
  const scanner = createByteRowScanner((start, end, next) => rows.push({ start, end, next }));
  for (const chunk of chunks) {
    scanner.push(chunk);
  }
  return { rows, summary: scanner.finish() };
}

/** 切れ目の位置（昇順・重複なし・0 と末尾を除く）でチャンクに分ける */
function splitAt(data: Uint8Array, cuts: number[]): Uint8Array[] {
  const positions = [...new Set(cuts.filter((cut) => cut > 0 && cut < data.length))].sort(
    (a, b) => a - b
  );
  const chunks: Uint8Array[] = [];
  let from = 0;
  for (const position of [...positions, data.length]) {
    chunks.push(data.subarray(from, position));
    from = position;
  }
  return chunks;
}

/** 位置の条件に合う切れ目をすべて返す */
const cutsWhere = (data: Uint8Array, predicate: (index: number) => boolean) =>
  Array.from(data.keys()).filter(predicate);

type CutStrategy = "random" | "everyByte" | "afterCR" | "insideMultibyte";

function cutsFor(data: Uint8Array, strategy: CutStrategy, randomCuts: number[]): number[] {
  switch (strategy) {
    case "random":
      return randomCuts.map((cut) => cut % (data.length + 1));
    case "everyByte":
      return cutsWhere(data, () => true);
    case "afterCR":
      // CR と次のバイトの間で切る（CR|LF がチャンクをまたぐ）
      return cutsWhere(data, (index) => index > 0 && data[index - 1] === 0x0d);
    case "insideMultibyte":
      // 非 ASCII のバイトの直後で切る（多バイト文字の途中で切れる）
      return cutsWhere(data, (index) => index > 0 && data[index - 1] >= 0x80);
  }
}

describe("byteRowScanner - Property-Based Tests", () => {
  describe("エンコード表", () => {
    it.each(["shift_jis", "euc-jp"] as const)(
      "%s の表のバイト列は TextDecoder でその文字にデコードされる",
      (encoding) => {
        const decoder = decoderOf(encoding);
        for (const [char, encoded] of Object.entries(MULTIBYTE_TABLE[encoding])) {
          expect(decoder.decode(new Uint8Array(encoded))).toBe(char);
        }
      }
    );

    it.each(["shift_jis", "euc-jp"] as const)(
      '%s の多バイト文字の後続バイトに LF・CR・`"`・`,` は現れない',
      (encoding) => {
        for (const encoded of Object.values(MULTIBYTE_TABLE[encoding])) {
          for (const value of encoded) {
            expect(STRUCTURAL_BYTES).not.toContain(value);
          }
        }
      }
    );

    it.each(ENCODINGS)('%s で ASCII の LF・CR・`"`・`,` はそのままのバイトになる', (encoding) => {
      expect(Array.from(encode('\n\r",', encoding))).toEqual(STRUCTURAL_BYTES);
    });
  });

  it("各文字コードのバイト列で、行範囲のデコード結果が文字列版の行範囲のテキストと一致する", () => {
    fc.assert(
      fc.property(encodedTextArb, ({ encoding, text }) => {
        expectMatchesStringScan(text, encoding);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("どこでチャンクに分けても一括の走査と同じ結果になる", () => {
    const strategyArb = fc.constantFrom<CutStrategy>(
      "random",
      "everyByte",
      "afterCR",
      "insideMultibyte"
    );
    fc.assert(
      fc.property(
        encodedTextArb,
        strategyArb,
        fc.array(fc.nat(), { maxLength: 20 }),
        ({ encoding, text }, strategy, randomCuts) => {
          const data = encode(text, encoding);
          const whole = scanRowsBytes(data);
          const { rows, summary } = scanChunks(splitAt(data, cutsFor(data, strategy, randomCuts)));
          expect(rows).toEqual(whole.rows);
          expect(summary.delimiter).toBe(whole.delimiter);
          expect(summary.byteLength).toBe(data.length);
          expect(summary.contentStart).toBe(text.startsWith(BOM) ? 3 : 0);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
