import * as assert from "assert";
import { Buffer } from "buffer";
import { suite, test } from "mocha";
import { TextDecoder } from "util";

import { encodeText } from "../large/largeTextEncoder";

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex").toUpperCase();
const bytes = (hexText: string) => Buffer.from(hexText, "hex");

/** Shift_JIS（CP932）の1文字分の符号位置をすべて列挙する（1バイト + 2バイトの全領域） */
function shiftJisCodes(): number[][] {
  const codes: number[][] = [];
  for (let b = 0; b <= 0xff; b++) {
    codes.push([b]);
  }
  for (let lead = 0x81; lead <= 0xfc; lead++) {
    if (lead >= 0xa0 && lead <= 0xdf) {
      continue;
    }
    for (let trail = 0x40; trail <= 0xfc; trail++) {
      codes.push([lead, trail]);
    }
  }
  return codes;
}

/** EUC-JP の1文字分の符号位置をすべて列挙する（ASCII・JIS X 0208 領域・半角カナ・JIS X 0212 領域） */
function eucJpCodes(): number[][] {
  const codes: number[][] = [];
  for (let b = 0; b < 0x80; b++) {
    codes.push([b]);
  }
  for (let lead = 0xa1; lead <= 0xfe; lead++) {
    for (let trail = 0xa1; trail <= 0xfe; trail++) {
      codes.push([lead, trail]);
      codes.push([0x8f, lead, trail]);
    }
  }
  for (let kana = 0xa1; kana <= 0xdf; kana++) {
    codes.push([0x8e, kana]);
  }
  return codes;
}

interface DecodedCode {
  code: Buffer;
  text: string;
}

/** FileRowReader と同じ TextDecoder（拡張ホストの ICU）で1文字としてデコードできる符号位置 */
function decodableCodes(label: "shift_jis" | "euc-jp", codes: number[][]): DecodedCode[] {
  const decoder = new TextDecoder(label, { fatal: true, ignoreBOM: true });
  const result: DecodedCode[] = [];
  for (const code of codes) {
    try {
      result.push({ code: Buffer.from(code), text: decoder.decode(Uint8Array.from(code)) });
    } catch {
      // 未定義の符号位置
    }
  }
  return result;
}

/**
 * 大容量モードで編集した行のエンコード。
 * 元の行は元ファイルのバイト列をそのままコピーするので、ここで問題になるのは「編集した行に含まれる、編集していないセルの文字」。
 * 表示に使う TextDecoder でデコードした文字列をエンコードし、同じ文字に戻ることを符号位置の全領域で確かめる。
 */
suite("largeTextEncoder（保存時の文字列のエンコード）", () => {
  suite("UTF-8 系", () => {
    test("UTF-8 と UTF-8(BOM) はどちらも BOM を付けずに UTF-8 にする（BOM は書き出し側で付ける）", () => {
      assert.strictEqual(hex(encodeText("aあ😀", "utf-8")), "61E38182F09F9880");
      assert.strictEqual(hex(encodeText("aあ😀", "utf-8-bom")), "61E38182F09F9880");
    });
  });

  for (const [encoding, codes] of [
    ["shift_jis", shiftJisCodes()],
    ["euc-jp", eucJpCodes()],
  ] as const) {
    suite(`${encoding} の全符号位置`, () => {
      const decoded = decodableCodes(encoding, codes);
      const lenient = new TextDecoder(encoding, { ignoreBOM: true });

      test("TextDecoder でデコードした文字は、エンコードしてデコードし直すと同じ文字に戻る", () => {
        assert.ok(
          decoded.length > 7000,
          `デコードできた符号位置が少なすぎる: ${String(decoded.length)}`
        );
        const broken = decoded
          .map(({ code, text }) => ({ code, encoded: encodeText(text, encoding) }))
          .filter(({ code, encoded }) => lenient.decode(encoded) !== lenient.decode(code))
          .map(({ code, encoded }) => `${hex(code)}->${hex(encoded)}`);
        assert.deepStrictEqual(
          broken.slice(0, 20),
          [],
          `${String(broken.length)} 件が別の文字になる`
        );
      });

      test("元と違うバイト列になるのは、同じ文字を表す別の符号位置がある文字（重複定義）だけ", () => {
        const codesByText = new Map<string, string[]>();
        for (const { code, text } of decoded) {
          codesByText.set(text, [...(codesByText.get(text) ?? []), hex(code)]);
        }
        const notDuplicated = decoded
          .filter(({ code, text }) => hex(encodeText(text, encoding)) !== hex(code))
          .filter(({ text }) => (codesByText.get(text)?.length ?? 0) < 2)
          .map(({ code }) => hex(code));
        assert.deepStrictEqual(notDuplicated, []);
      });
    });
  }

  suite("Shift_JIS の代表的な文字", () => {
    const decoder = new TextDecoder("shift_jis", { ignoreBOM: true });
    const roundTrip = (hexText: string) =>
      hex(encodeText(decoder.decode(bytes(hexText)), "shift_jis"));

    test("JIS X 0208 の文字・半角カナ・円記号の位置の 5C は元のバイト列に戻る", () => {
      // あ 漢 表（2バイト目が 5C） ソ（2バイト目が 5C） ＼ ｱ ﾟ \ ~
      for (const code of ["82A0", "8ABF", "955C", "835C", "815F", "B1", "DF", "5C", "7E"]) {
        assert.strictEqual(roundTrip(code), code);
      }
    });

    test("～(8160)・NEC 特殊文字の ①(8740)・㈱(878D)・IBM 拡張文字の 髙(FBFC) は元のバイト列に戻る", () => {
      for (const code of ["8160", "8740", "878D", "FBFC"]) {
        assert.strictEqual(roundTrip(code), code);
      }
    });

    // 拡張ホストの ICU は F040〜F8FC を私用領域（U+E000〜）にデコードする（F940〜F9FC はデコードできず U+FFFD になる）
    test("ユーザー定義文字（F040〜F8FC）は ? にならず元のバイト列に戻る", () => {
      for (const code of ["F040", "F07E", "F080", "F5A0", "F8FC"]) {
        assert.strictEqual(roundTrip(code), code);
      }
    });

    test("制御文字 1A・1C・7F は元のバイト列に戻る", () => {
      for (const code of ["1A", "1C", "7F"]) {
        assert.strictEqual(roundTrip(code), code);
      }
    });

    test("NEC 選定 IBM 拡張文字の 﨑(ED95) は、同じ文字の IBM 拡張文字(FAB1)になる（iconv-lite の CP932 と同じ）", () => {
      assert.strictEqual(roundTrip("ED95"), "FAB1");
    });

    test("ユーザー定義文字と通常の文字が混ざった文字列も1文字ずつ正しくエンコードする", () => {
      const text = decoder.decode(bytes("82A02CF0405C1A2C8740"));
      assert.strictEqual(hex(encodeText(text, "shift_jis")), "82A02CF0405C1A2C8740");
    });

    test("表せない文字は ? になる", () => {
      assert.strictEqual(hex(encodeText("a😀", "shift_jis")), "613F");
    });
  });

  suite("EUC-JP の代表的な文字", () => {
    const decoder = new TextDecoder("euc-jp", { ignoreBOM: true });
    const roundTrip = (hexText: string) =>
      hex(encodeText(decoder.decode(bytes(hexText)), "euc-jp"));

    test("あ・漢・半角カナ・～(A1C1)・①(ADA1) は元のバイト列に戻る", () => {
      for (const code of ["A4A2", "B4C1", "8EB1", "A1C1", "ADA1"]) {
        assert.strictEqual(roundTrip(code), code);
      }
    });

    test("2バイトの符号位置がある文字は、3バイトの JIS X 0212（8F で始まる）にしない", () => {
      const decoded = decodableCodes("euc-jp", eucJpCodes()).filter(
        ({ code }) => code.length === 2
      );
      const threeBytes = decoded
        .filter(({ text }) => encodeText(text, "euc-jp")[0] === 0x8f)
        .map(({ code }) => hex(code));
      assert.deepStrictEqual(threeBytes, []);
    });
  });
});
