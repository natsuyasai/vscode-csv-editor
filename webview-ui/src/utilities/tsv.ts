/**
 * クリップボードとやり取りする TSV（Excel と互換。RFC 4180 のクォート規則をタブ区切りに当てたもの）。
 * 通常モード（useCellSelection）と大容量モード（LargeTable）のコピー/ペーストで共通に使う。
 */

/** 改行・タブ・ダブルクォートを含む値はダブルクォートで囲み、ダブルクォートは2つ重ねる */
export const escapeTsvCell = (value: string): string => {
  // 値が空の場合はそのまま返す
  if (!value) return value;

  // 改行、タブ、ダブルクォートが含まれている場合はダブルクォートで囲む
  if (value.includes("\n") || value.includes("\t") || value.includes('"')) {
    // ダブルクォートを2つ重ねてエスケープ
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** 行をセルはタブ、行は LF でつないだ TSV にする（末尾に改行を付けない） */
export const toTsv = (rows: readonly (readonly string[])[]): string =>
  rows.map((row) => row.map(escapeTsvCell).join("\t")).join("\n");

/** TSV 形式の文字列を解析する（LF と CRLF の改行に対応。末尾の改行で空の行を作らない） */
export const parseTsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // エスケープされたダブルクォート
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // クォートの終了
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // クォート内の文字
        currentCell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        // クォートの開始
        inQuotes = true;
        i++;
        continue;
      } else if (char === "\t") {
        // セルの区切り
        currentRow.push(currentCell);
        currentCell = "";
        i++;
        continue;
      } else if (char === "\n") {
        // 行の区切り
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++;
        continue;
      } else if (char === "\r" && nextChar === "\n") {
        // Windows形式の改行
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        i += 2;
        continue;
      } else {
        // 通常の文字
        currentCell += char;
        i++;
        continue;
      }
    }
  }

  // 最後のセルと行を追加
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};
