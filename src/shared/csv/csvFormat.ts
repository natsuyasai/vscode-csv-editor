/** UTF-8 BOM (U+FEFF) */
export const BOM = "﻿";

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
