import { parse as csvParseSync } from "csv-parse/browser/esm/sync";

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
  | { ok: true; rows: string[][] }
  | { ok: false; error: CsvParseError };

/**
 * CSVテキストをパースする。例外は投げず、結果を判別可能なユニオン型で返す。
 * 列数が不揃いな行は最大列数に合わせて空セルで補う。
 */
export function parseCsv(text: string): ParseCsvResult {
  try {
    const rows = csvParseSync(text, { relax_column_count: true }) as string[][];
    return { ok: true, rows: padRows(rows) };
  } catch (error) {
    return { ok: false, error: toCsvParseError(error) };
  }
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
