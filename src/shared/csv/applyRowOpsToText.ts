import type { CsvFormat } from "./csvFormat";
import type { RowOp } from "./ops";
import { stringifyRow } from "./rowCodec";
import { scanRows } from "./rowScanner";
import type { RecordDelimiter, RowRange } from "./rowScanner";

/** テキスト上の置換（UTF-16 オフセット。元テキストの `[start, end)` を text に置き換える） */
export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** applyRowOpsToText の結果 */
export interface RowOpsTextEdits {
  /** 元テキスト基準の置換。start の昇順に並び、互いに重ならない（隣接はありうる） */
  edits: TextEdit[];
  /** 置換を適用した後の行数（検証用。verifyAppliedRows に渡す） */
  rowCount: number;
  /** 書き出しに使った行区切り（検証用。verifyAppliedRows に渡す） */
  delimiter: RecordDelimiter;
}

/** applyRowOpsToText が使う書式 */
export type RowOpsTextFormat = Pick<CsvFormat, "delimiter" | "eol" | "trailingNewline">;

/** 適用後の文書の並び。元テキストの行の範囲 [from, to) か、op で入った新しい行 */
type Segment = { kind: "original"; from: number; to: number } | { kind: "new"; rows: string[][] };

/**
 * 行単位の差分操作をテキスト上の置換に変換する（拡張機能が1つの WorkspaceEdit を作るための純粋関数）。
 *
 * - ops は順に適用される（後の op の行番号は前の op を適用した後の行番号）。範囲外の op は RangeError を投げる。
 * - 複数の op は元テキスト基準の置換に合成する。残った元の行の間ごとに置換を1つ作り、
 *   元の行は書き直さない（編集していない行の不揃いな列数やクォートの書き方はそのまま残る）。
 * - 行区切りは `scanRows(text).delimiter` を使い、テキストに改行が無い（null）ときだけ `format.eol` を使う。
 * - 末尾改行の有無は保つ。行があればテキスト上の実際の有無（最終行の後ろに区切りがあるか）、
 *   行が無い（空テキスト・BOM のみ）ときは `format.trailingNewline` に従う。
 *   末尾改行なしで末尾に挿入するときは直前に区切りを補い、末尾の行を消すときは直前の区切りも消す。
 * - 先頭の BOM には触れない。全行を消す場合と、行が無いテキストへの挿入は BOM の後ろ全体の置換になる。
 *
 * 安全策: 次の場合、置換を適用したテキストを再パースした行構造が、行配列に op を splice した結果と一致しない。
 * - 末尾改行なしで、適用後の最終行が空文字列に書き出される行（`[""]`）になる（再パースで行が消える）
 * - 改行コードが混在し、編集でクォート外の最初の改行が変わる（csv-parse が検出する行区切りが変わる）
 * 呼び出し側（拡張機能）は、適用後のテキストを `verifyAppliedRows(newText, rowCount, delimiter)` で検査し、
 * 失敗したとき、またはこの関数が例外を投げたときは webview に全文を送り直す（resync）こと。
 * なおセル0個の行 `[]` は `[""]` として書き出される（行数は変わらない）。
 */
export function applyRowOpsToText(
  text: string,
  ops: readonly RowOp[],
  format: RowOpsTextFormat
): RowOpsTextEdits {
  const { delimiter: scannedDelimiter, rows } = scanRows(text);
  const delimiter = scannedDelimiter ?? format.eol;
  const segments = spliceSegments(rows.length, ops);
  const rowCount = segments.reduce(
    (count, segment) =>
      count + (segment.kind === "original" ? segment.to - segment.from : segment.rows.length),
    0
  );
  const writer = new RowTextWriter(text, rows, delimiter, format);
  return { edits: writer.toEdits(segments, rowCount), rowCount, delimiter };
}

/** 元テキスト基準の置換をまとめて適用したテキストを返す（重なる置換は Error） */
export function applyTextEdits(text: string, edits: readonly TextEdit[]): string {
  const sorted = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  let result = "";
  let position = 0;
  for (const edit of sorted) {
    if (edit.start < position || edit.end < edit.start || edit.end > text.length) {
      throw new Error(`置換の範囲が不正です: [${String(edit.start)}, ${String(edit.end)})`);
    }
    result += text.slice(position, edit.start) + edit.text;
    position = edit.end;
  }
  return result + text.slice(position);
}

/**
 * 置換を適用した後のテキストを走査し直し、行数と行区切りが期待どおりかを検査する。
 * クォート外に改行が無い（区切りが null）テキストは、行数が1以下なら区切りを問わない。
 * false のときは行構造が op の結果とずれているので、呼び出し側は全文を送り直す（applyRowOpsToText 参照）。
 */
export function verifyAppliedRows(
  newText: string,
  expectedRowCount: number,
  expectedDelimiter: RecordDelimiter
): boolean {
  const { delimiter, rows } = scanRows(newText);
  if (rows.length !== expectedRowCount) {
    return false;
  }
  return delimiter === null ? rows.length <= 1 : delimiter === expectedDelimiter;
}

/** 元の行全体を1つの範囲とする並びに ops を順に splice する */
function spliceSegments(originalRowCount: number, ops: readonly RowOp[]): Segment[] {
  let segments: Segment[] =
    originalRowCount > 0 ? [{ kind: "original", from: 0, to: originalRowCount }] : [];
  let length = originalRowCount;
  for (const op of ops) {
    const { start, deleteCount } = op;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(deleteCount) ||
      start < 0 ||
      deleteCount < 0 ||
      start + deleteCount > length
    ) {
      throw new RangeError(
        `op の範囲が行数(${String(length)})を超えています: start=${String(start)}, deleteCount=${String(deleteCount)}`
      );
    }
    const head = sliceSegments(segments, 0, start);
    const tail = sliceSegments(segments, start + deleteCount, length);
    const inserted: Segment[] = op.rows.length > 0 ? [{ kind: "new", rows: [...op.rows] }] : [];
    segments = [...head, ...inserted, ...tail];
    length += op.rows.length - deleteCount;
  }
  return segments;
}

/** 並びのうち、適用後の行番号 [from, to) の部分を切り出す */
function sliceSegments(segments: readonly Segment[], from: number, to: number): Segment[] {
  const result: Segment[] = [];
  let offset = 0;
  for (const segment of segments) {
    const size = segment.kind === "original" ? segment.to - segment.from : segment.rows.length;
    const begin = Math.max(from - offset, 0);
    const end = Math.min(to - offset, size);
    if (begin < end) {
      result.push(
        segment.kind === "original"
          ? { kind: "original", from: segment.from + begin, to: segment.from + end }
          : { kind: "new", rows: segment.rows.slice(begin, end) }
      );
    }
    offset += size;
  }
  return result;
}

/** 合成した並びを、残った元の行の間ごとの置換に書き出す */
class RowTextWriter {
  private readonly contentStart: number;
  private readonly trailingNewline: boolean;

  constructor(
    private readonly text: string,
    private readonly rows: readonly RowRange[],
    private readonly delimiter: RecordDelimiter,
    private readonly format: RowOpsTextFormat
  ) {
    // scanRows は BOM を行に含めないので、最初の行の開始位置が本文の開始位置になる
    this.contentStart = rows.length > 0 ? rows[0].start : text.length;
    const last = rows.at(-1);
    this.trailingNewline = last ? last.end < last.next : format.trailingNewline;
  }

  toEdits(segments: readonly Segment[], rowCount: number): TextEdit[] {
    if (rowCount === 0) {
      return this.text.length > this.contentStart
        ? [{ start: this.contentStart, end: this.text.length, text: "" }]
        : [];
    }
    const edits: TextEdit[] = [];
    // 残った元の行の範囲の間（先頭・末尾を含む）を、消える元の行 [from, to) と入る新しい行の組として集める
    let from = 0;
    let inserted: string[][] = [];
    for (const segment of segments) {
      if (segment.kind === "new") {
        inserted = [...inserted, ...segment.rows];
        continue;
      }
      this.pushEdit(edits, from, segment.from, inserted);
      from = segment.to;
      inserted = [];
    }
    this.pushEdit(edits, from, this.rows.length, inserted);
    return edits;
  }

  /** 元の行 [from, to) を新しい行で置き換える置換を追加する（変化が無ければ何もしない） */
  private pushEdit(edits: TextEdit[], from: number, to: number, inserted: string[][]) {
    if (from === to && inserted.length === 0) {
      return;
    }
    const lines = inserted.map((row) => stringifyRow(row, { delimiter: this.format.delimiter }));
    if (to < this.rows.length) {
      // 後ろに元の行が残る: 各行に区切りを付けて、次に残る行の直前までを置き換える
      edits.push({
        start: this.rowStart(from),
        end: this.rows[to].start,
        text: lines.map((line) => line + this.delimiter).join(""),
      });
      return;
    }
    if (this.trailingNewline) {
      edits.push({
        start: this.rowStart(from),
        end: this.text.length,
        text: lines.map((line) => line + this.delimiter).join(""),
      });
      return;
    }
    // 末尾改行なしで末尾に触れる: 区切りは行の「前」に置く
    if (from === this.rows.length) {
      edits.push({
        start: this.text.length,
        end: this.text.length,
        text: (from > 0 ? this.delimiter : "") + lines.join(this.delimiter),
      });
    } else if (lines.length > 0) {
      edits.push({
        start: this.rows[from].start,
        end: this.text.length,
        text: lines.join(this.delimiter),
      });
    } else {
      // 末尾の行を消す: 直前の行の区切りから消す（全行を消す場合は toEdits で扱うので from > 0）
      edits.push({ start: this.rows[from - 1].end, end: this.text.length, text: "" });
    }
  }

  private rowStart(index: number): number {
    return index < this.rows.length ? this.rows[index].start : this.text.length;
  }
}
