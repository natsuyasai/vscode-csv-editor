import { Buffer } from "buffer";
import * as iconv from "iconv-lite";
import { TextDecoder } from "util";

import type { DecoderLabel, LargeEncoding } from "./largeEncoding";

type MultiByteLabel = Exclude<DecoderLabel, "utf-8">;

/**
 * 表示に使う TextDecoder と iconv-lite のエンコードの食い違いを補う表。
 * 文字 → その文字にデコードされる元の符号位置のバイト列。
 */
interface Overrides {
  bytes: Map<string, Buffer>;
  /** 表にある文字のどれかを含むか（含まなければ iconv-lite にそのまま任せる） */
  pattern: RegExp | null;
}

const overridesCache = new Map<MultiByteLabel, Overrides>();

/**
 * 編集した行・追加した行の文字列を保存用のバイト列にエンコードする（BOM は付けない）。
 *
 * - UTF-8 / UTF-8(BOM): `Buffer.from(text, "utf8")`
 * - Shift_JIS / EUC-JP: iconv-lite（`shift_jis` は iconv-lite では CP932 と同じ表）に任せ、
 *   表示に使う TextDecoder（`FileRowReader`）と食い違う文字だけ元の符号位置に戻す。
 *   - Shift_JIS: iconv-lite が `?` にするユーザー定義文字（F040〜、私用領域 U+E000〜）など、
 *     エンコードしてデコードし直すと別の文字になるもの
 *   - EUC-JP: iconv-lite が3バイトの JIS X 0212（8F で始まる）にする文字のうち、
 *     2バイトの符号位置（～ A1C1、№ ADE2、NEC 選定 IBM 拡張の F9A1〜 など）があるもの。
 *     3バイトの JIS X 0212 は読めないソフトが多いため2バイトを優先する
 *   - それ以外の重複定義（NEC 選定 IBM 拡張 ED/EE → IBM 拡張 FA/FB、NEC 特殊文字の ≒ 8790 → 81E0 など）は
 *     iconv-lite に任せる（同じ文字には戻るが、元とは別のバイト列になりうる。Windows の CP932 と同じ選び方）
 * - 表せない文字（Shift_JIS の絵文字など）は `?` になる
 *
 * 補正表は、その文字コードで初めてエンコードするときに TextDecoder で符号位置の全領域を走査して作る（数十ms）。
 * 拡張ホストの ICU に合わせて作るので、ICU の版によって表の中身が変わっても追従する。
 */
export function encodeText(text: string, encoding: LargeEncoding): Buffer {
  if (encoding === "utf-8" || encoding === "utf-8-bom") {
    return Buffer.from(text, "utf8");
  }
  const overrides = getOverrides(encoding);
  if (overrides.pattern === null || !overrides.pattern.test(text)) {
    return iconv.encode(text, encoding);
  }
  const parts: Buffer[] = [];
  let plain = "";
  for (const char of text) {
    const original = overrides.bytes.get(char);
    if (original === undefined) {
      plain += char;
      continue;
    }
    if (plain !== "") {
      parts.push(iconv.encode(plain, encoding));
      plain = "";
    }
    parts.push(original);
  }
  if (plain !== "") {
    parts.push(iconv.encode(plain, encoding));
  }
  return Buffer.concat(parts);
}

function getOverrides(label: MultiByteLabel): Overrides {
  let overrides = overridesCache.get(label);
  if (overrides === undefined) {
    overrides = buildOverrides(label);
    overridesCache.set(label, overrides);
  }
  return overrides;
}

function buildOverrides(label: MultiByteLabel): Overrides {
  const strict = new TextDecoder(label, { fatal: true, ignoreBOM: true });
  const lenient = new TextDecoder(label, { ignoreBOM: true });
  const bytes = new Map<string, Buffer>();
  for (const code of enumerateCodes(label)) {
    let char: string;
    try {
      char = strict.decode(code);
    } catch {
      continue;
    }
    if (bytes.has(char)) {
      continue;
    }
    const encoded = iconv.encode(char, label);
    if (encoded.equals(code)) {
      continue;
    }
    const changesChar = lenient.decode(encoded) !== char;
    const prefersTwoBytes = label === "euc-jp" && encoded[0] === 0x8f && code.length === 2;
    if (changesChar || prefersTwoBytes) {
      bytes.set(char, Buffer.from(code));
    }
  }
  return { bytes, pattern: toPattern([...bytes.keys()]) };
}

/** 1文字分の符号位置をすべて列挙する */
function* enumerateCodes(label: MultiByteLabel): Generator<Uint8Array> {
  for (let b = 0; b < 0x80; b++) {
    yield Uint8Array.of(b);
  }
  if (label === "shift_jis") {
    for (let b = 0xa1; b <= 0xdf; b++) {
      yield Uint8Array.of(b);
    }
    for (let lead = 0x81; lead <= 0xfc; lead++) {
      if (lead >= 0xa0 && lead <= 0xdf) {
        continue;
      }
      for (let trail = 0x40; trail <= 0xfc; trail++) {
        yield Uint8Array.of(lead, trail);
      }
    }
    return;
  }
  // EUC-JP: 2バイトを3バイト（JIS X 0212）より先に見る（同じ文字なら2バイトを採る）
  for (let lead = 0xa1; lead <= 0xfe; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      yield Uint8Array.of(lead, trail);
    }
  }
  for (let kana = 0xa1; kana <= 0xdf; kana++) {
    yield Uint8Array.of(0x8e, kana);
  }
  for (let lead = 0xa1; lead <= 0xfe; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      yield Uint8Array.of(0x8f, lead, trail);
    }
  }
}

function toPattern(chars: string[]): RegExp | null {
  if (chars.length === 0) {
    return null;
  }
  const escaped = chars.map((char) =>
    Array.from(char, (c) => `\\u{${(c.codePointAt(0) ?? 0).toString(16)}}`).join("")
  );
  return new RegExp(`[${escaped.join("")}]`, "u");
}
