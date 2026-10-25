import { parse as csvParseSync } from "csv-parse/browser/esm/sync";
import { stringify as csvStringifySync } from "csv-stringify/browser/esm/sync";

const BOM = "﻿";

/** CSVの書式（読み込み時に検出し、保存時に同じ形式で出力するために保持する） */
export interface CsvFormat {
  /** 区切り文字（現状は "," のみ。TSV等を追加する際の拡張点） */
  delimiter: string;
  /** 改行コード */
  eol: "\r\n" | "\n";
  /** 先頭にBOM(U+FEFF)があるか */
  bom: boolean;
  /** 末尾が改行で終わるか */
  trailingNewline: boolean;
}

/** 新規・空ファイル用の既定書式 */
export const DEFAULT_CSV_FORMAT: CsvFormat = {
  delimiter: ",",
  eol: "\n",
  bom: false,
  trailingNewline: true,
};

/** CSVのパースエラー情報 */
export interface CsvParseError {
  /** csv-parseのエラーコード（不明な場合は "UNKNOWN"） */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** エラーが発生した行番号(1始まり)。不明な場合はundefined */
  line?: number;
}

/** CSVパース結果（成功/失敗の判別可能なユニオン） */
export type ParseCsvResult =
  | { ok: true; rows: string[][]; format: CsvFormat }
  | { ok: false; error: CsvParseError };

/**
 * CSVテキストをパースする。例外は投げず、結果を判別可能なユニオン型で返す。
 * 列数が不揃いな行は最大列数に合わせて空セルで補う。
 * BOMは書式情報(format.bom)として分離し、セル値には含めない。
 */
export function parseCsv(text: string): ParseCsvResult {
  try {
    const format = detectCsvFormat(text);
    const body = format.bom ? text.slice(BOM.length) : text;
    const rows: string[][] = csvParseSync(body, {
      relax_column_count: true,
      delimiter: format.delimiter,
    });
    return { ok: true, rows: padRows(rows), format };
  } catch (error) {
    return { ok: false, error: toCsvParseError(error) };
  }
}

/**
 * CSVテキストから書式を検出する。
 * 改行コードが混在する場合は、クォート外で最初に現れた改行に合わせる。
 * 改行が無い場合は既定(LF)、末尾改行は無いものとして扱う（空テキストは既定書式）。
 */
export function detectCsvFormat(text: string): CsvFormat {
  if (text === "") {
    return { ...DEFAULT_CSV_FORMAT };
  }
  const bom = text.startsWith(BOM);
  const body = bom ? text.slice(BOM.length) : text;
  return {
    delimiter: DEFAULT_CSV_FORMAT.delimiter,
    eol: detectEol(body),
    bom,
    trailingNewline: body.endsWith("\n"),
  };
}

function detectEol(body: string): CsvFormat["eol"] {
  let inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "\n" && !inQuotes) {
      return body[i - 1] === "\r" ? "\r\n" : "\n";
    }
  }
  return DEFAULT_CSV_FORMAT.eol;
}

/**
 * 指定した書式でCSVテキストを生成する。クォートは必要なセルのみ（最小クォート）。
 */
export function stringifyCsv(rows: string[][], format: CsvFormat): string {
  let text: string = csvStringifySync(rows, {
    delimiter: format.delimiter,
    record_delimiter: format.eol,
    // record_delimiterがCRLFでも、セル内のLF/CRは必ずクォートして行区切りと区別する
    quoted_match: /[\r\n]/,
  });
  if (!format.trailingNewline && text.endsWith(format.eol)) {
    text = text.slice(0, -format.eol.length);
  }
  return (format.bom ? BOM : "") + text;
}

function padRows(rows: string[][]): string[][] {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return rows.map((row) =>
    row.length < maxColumns ? [...row, ...Array<string>(maxColumns - row.length).fill("")] : row
  );
}

function toCsvParseError(error: unknown): CsvParseError {
  if (error instanceof Error) {
    const { code, lines } = error as Error & { code?: unknown; lines?: unknown };
    return {
      code: typeof code === "string" ? code : "UNKNOWN",
      message: error.message,
      line: typeof lines === "number" ? lines : undefined,
    };
  }
  return { code: "UNKNOWN", message: String(error) };
}
