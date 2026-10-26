/** 1行のパース/書き出しに必要な書式（CsvFormat のうち行内に影響する部分だけ） */
export interface RowFormat {
  /** 区切り文字（1文字）。省略時は "," */
  delimiter?: string;
}

const QUOTE = '"';
const DEFAULT_DELIMITER = ",";

/**
 * 1行（1レコード）分のセルをCSVテキストに書き出す。末尾に改行は付けない。
 * csv-stringify と同じ規則で、区切り文字・`"`・CR・LF を含むセルだけをクォートし、`"` は `""` にする。
 * 空配列と `[""]` はどちらも空文字列になる（csv-stringify と同じ。往復は `[""]` になる）。
 */
export function stringifyRow(row: readonly string[], format: RowFormat = {}): string {
  const delimiter = format.delimiter ?? DEFAULT_DELIMITER;
  return row.map((cell) => quoteIfNeeded(cell, delimiter)).join(delimiter);
}

function quoteIfNeeded(cell: string, delimiter: string): string {
  const needsQuote =
    cell.includes(delimiter) || cell.includes(QUOTE) || cell.includes("\r") || cell.includes("\n");
  return needsQuote ? QUOTE + cell.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE : cell;
}

/**
 * 1行（1レコード）分のCSVテキストをセルの配列にパースする。
 * クォート内の改行は含んでよい。末尾の改行（LF/CRLF）は1つだけ許容して無視する。
 * 空文字列は空セル1個（`[""]`）になる。
 * クォートの不整合や、クォート外の改行（複数レコード）は Error を投げる。
 */
export function parseRow(text: string, format: RowFormat = {}): string[] {
  const delimiter = format.delimiter ?? DEFAULT_DELIMITER;
  const body = stripTrailingEol(text);
  const cells: string[] = [];
  let i = 0;
  for (;;) {
    let cell = "";
    if (body[i] === QUOTE) {
      i++;
      for (;;) {
        if (i >= body.length) {
          throw new Error("クォートが閉じられていません");
        }
        if (body[i] === QUOTE) {
          if (body[i + 1] === QUOTE) {
            cell += QUOTE;
            i += 2;
            continue;
          }
          i++;
          break;
        }
        cell += body[i++];
      }
      if (i < body.length && !body.startsWith(delimiter, i)) {
        throw new Error("閉じクォートの後に不正な文字があります");
      }
    } else {
      while (i < body.length && !body.startsWith(delimiter, i)) {
        const char = body[i];
        if (char === QUOTE || char === "\r" || char === "\n") {
          throw new Error("クォートされていないセルに不正な文字があります");
        }
        cell += char;
        i++;
      }
    }
    cells.push(cell);
    if (i >= body.length) {
      return cells;
    }
    i += delimiter.length;
  }
}

function stripTrailingEol(text: string): string {
  if (text.endsWith("\r\n")) return text.slice(0, -2);
  if (text.endsWith("\n")) return text.slice(0, -1);
  return text;
}
