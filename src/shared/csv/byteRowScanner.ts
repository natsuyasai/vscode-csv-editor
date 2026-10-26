/**
 * CSVのバイト列の行（レコード）境界を、チャンクを順に受け取りながら検出する（`rowScanner` のバイト版）。
 *
 * 規則は文字列版 `scanRows` と同じ:
 * - 行区切りは、クォート外で最初に現れた改行で決まる（CRLF → LF → CR の順に判定）。
 *   それ以降に現れる別種の改行はセルの内容として扱う。
 * - 空行も1行と数え、最後の行区切りの後に何も無ければそこに行は無い。
 * - 先頭の UTF-8 BOM（EF BB BF）は行に含めない（オフセットは元のバイト列上の位置のまま）。
 *
 * 前提: LF(0x0A)・CR(0x0D)・`"`(0x22) が多バイト文字の一部に現れない文字コード
 * （UTF-8 / Shift_JIS / EUC-JP）。UTF-16 などには使えない。
 * 区切り文字（`,`）は行の境界に関係しないので受け取らない。
 */
import type { RecordDelimiter, RowBoundaries, RowRange } from "./rowScanner";

const CR = 0x0d;
const LF = 0x0a;
const QUOTE = 0x22;
const BOM_BYTES = [0xef, 0xbb, 0xbf];

/**
 * 確定した1行の範囲（バイトオフセット）を受け取るコールバック。
 * 行は `[start, end)`、行区切りを含めると `[start, next)`。最終行では `end` と `next` はバイト列の末尾。
 */
export type ByteRowCallback = (start: number, end: number, next: number) => void;

/** 走査の最終結果 */
export interface ByteScanSummary {
  /** 検出した行区切り。クォート外に改行が無ければ null */
  delimiter: RecordDelimiter | null;
  /** 先頭の BOM を除いた内容の開始位置（BOM があれば 3、無ければ 0） */
  contentStart: number;
  /** 走査したバイト数の合計 */
  byteLength: number;
}

/**
 * チャンクを順に受け取って行境界を走査する。
 * 行は確定した時点で（次の行区切りを読んだ時点で）コールバックに渡す。
 * チャンク末尾の CR は次のチャンクの先頭を見るまで判定を保留し、最終行は `finish` で確定する。
 */
export interface ByteRowScanner {
  /** 続きのチャンクを与える。チャンクの中身は呼び出し後に書き換えてもよい（参照を保持しない） */
  push(chunk: Uint8Array): void;
  /** 走査を終え、最終行を確定する。以後 `push` は例外を投げる */
  finish(): ByteScanSummary;
}

export function createByteRowScanner(onRow: ByteRowCallback): ByteRowScanner {
  let finished = false;
  /** BOM の判定のために貯めている先頭のバイト（判定後は null） */
  let head: Uint8Array | null = new Uint8Array(0);
  let contentStart = 0;
  /** 次に走査するチャンクの先頭の位置（それまでに走査したバイト数） */
  let offset = 0;
  let delimiter: RecordDelimiter | null = null;
  let inQuotes = false;
  let rowStart = 0;
  /** チャンク末尾にあり、次のバイトを見るまで判定できないクォート外の CR の位置（無ければ -1） */
  let pendingCr = -1;

  const emitRow = (end: number, next: number) => {
    onRow(rowStart, end, next);
    rowStart = next;
  };

  /**
   * cr の位置の CR を、次のバイト（`following`、データ末尾なら undefined）で判定する。
   * 戻り値は CR の後ろで行区切りとして消費したバイト数（CRLF の LF なら 1）
   */
  const resolveCr = (cr: number, following: number | undefined): number => {
    delimiter ??= following === LF ? "\r\n" : "\r";
    if (delimiter === "\r") {
      // CR の直後の LF は次の行の内容
      emitRow(cr, cr + 1);
      return 0;
    }
    if (following !== LF) {
      // 行区切りが CRLF のとき、LF の続かない CR はセルの内容
      return 0;
    }
    emitRow(cr, cr + 2);
    return 1;
  };

  const resolvePendingCr = (following: number | undefined): number => {
    const cr = pendingCr;
    pendingCr = -1;
    return resolveCr(cr, following);
  };

  /** chunk の from 以降を走査する（chunk の先頭はバイト列上の offset） */
  const scan = (chunk: Uint8Array, from: number) => {
    const length = chunk.length;
    let pos = from;
    if (pendingCr >= 0 && pos < length) {
      pos += resolvePendingCr(chunk[pos]);
    }
    // 次の `"` と改行候補の位置（見つからなければ length）。毎回末尾まで探し直さないようにキャッシュする
    let nextQuote = -1;
    let nextNewline = -1;
    while (pos < length) {
      if (nextQuote < pos) {
        nextQuote = indexOrLength(chunk, QUOTE, pos);
      }
      if (inQuotes) {
        if (nextQuote >= length) {
          break;
        }
        // `""`（クォート内のエスケープ）は2回反転するため、単純な反転で正しく追跡できる
        inQuotes = false;
        pos = nextQuote + 1;
        continue;
      }
      if (nextNewline < pos) {
        nextNewline = findNewline(chunk, pos, delimiter);
      }
      if (nextQuote < nextNewline) {
        inQuotes = true;
        pos = nextQuote + 1;
        continue;
      }
      if (nextNewline >= length) {
        break;
      }
      const newline = nextNewline;
      if (chunk[newline] === LF) {
        delimiter ??= "\n";
        emitRow(offset + newline, offset + newline + 1);
        pos = newline + 1;
        continue;
      }
      // CR: CRLF かどうかを決める次のバイトがこのチャンクに無ければ、次のチャンクまで保留する
      if (newline + 1 >= length && delimiter !== "\r") {
        pendingCr = offset + newline;
        break;
      }
      pos = newline + 1 + resolveCr(offset + newline, chunk[newline + 1]);
    }
    offset += length;
  };

  /** 先頭の3バイトが揃った（またはデータが尽きた）時点で BOM を判定し、貯めたバイトを走査する */
  const flushHead = (bytes: Uint8Array) => {
    head = null;
    if (BOM_BYTES.every((value, index) => bytes[index] === value)) {
      contentStart = BOM_BYTES.length;
      rowStart = contentStart;
    }
    scan(bytes, contentStart);
  };

  return {
    push(chunk) {
      if (finished) {
        throw new Error("finish の後に push はできません");
      }
      if (head === null) {
        scan(chunk, 0);
        return;
      }
      const joined = concat(head, chunk);
      if (joined.length < BOM_BYTES.length) {
        head = joined;
        return;
      }
      flushHead(joined);
    },
    finish() {
      if (finished) {
        throw new Error("finish は一度だけ呼べます");
      }
      finished = true;
      if (head !== null) {
        flushHead(head);
      }
      if (pendingCr >= 0) {
        resolvePendingCr(undefined);
      }
      if (rowStart < offset) {
        emitRow(offset, offset);
      }
      return { delimiter, contentStart, byteLength: offset };
    },
  };
}

/** バイト列全体を一度に走査する（テストや小さなデータ用） */
export function scanRowsBytes(bytes: Uint8Array): RowBoundaries {
  const rows: RowRange[] = [];
  const scanner = createByteRowScanner((start, end, next) => rows.push({ start, end, next }));
  scanner.push(bytes);
  const { delimiter } = scanner.finish();
  return { delimiter, rows };
}

/** value の位置を返す。見つからなければ chunk の長さ */
function indexOrLength(chunk: Uint8Array, value: number, from: number): number {
  const index = chunk.indexOf(value, from);
  return index < 0 ? chunk.length : index;
}

/**
 * from 以降で行区切りの候補になる改行の位置を返す（見つからなければ chunk の長さ）。
 * 行区切りが未定なら CR と LF の早い方、LF なら LF、CR / CRLF なら CR。
 */
function findNewline(chunk: Uint8Array, from: number, delimiter: RecordDelimiter | null): number {
  if (delimiter === "\n") {
    return indexOrLength(chunk, LF, from);
  }
  if (delimiter !== null) {
    return indexOrLength(chunk, CR, from);
  }
  return Math.min(indexOrLength(chunk, CR, from), indexOrLength(chunk, LF, from));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const joined = new Uint8Array(a.length + b.length);
  joined.set(a, 0);
  joined.set(b, a.length);
  return joined;
}
