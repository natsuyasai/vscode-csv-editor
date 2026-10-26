import { BOM, detectCsvFormat, type CsvFormat } from "@shared/csv/csvFormat";
import { parse as csvParseSync } from "csv-parse/browser/esm/sync";
import { stringify as csvStringifySync } from "csv-stringify/browser/esm/sync";

export { DEFAULT_CSV_FORMAT, detectCsvFormat } from "@shared/csv/csvFormat";
export type { CsvFormat } from "@shared/csv/csvFormat";

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
