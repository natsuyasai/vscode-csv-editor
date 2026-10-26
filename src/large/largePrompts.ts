import type { LargeEncoding } from "./largeEncoding";
import type { PickItem, Picker } from "./picker";

/** 10MB 以上のファイルを開くときに選ぶモード */
export type OpenMode = "normal" | "large" | "text";

export interface AskOpenModeParams {
  fileName: string;
  sizeBytes: number;
  /** 通常モードを選べるか（50MB 以上では false） */
  normalAllowed: boolean;
}

const formatMiB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

/**
 * モードを尋ねる。キャンセルなら undefined。
 * QuickPick は項目を無効にできないので、通常モードを選べないときは項目から除き、理由を placeHolder に示す。
 */
export async function askOpenMode(
  picker: Picker,
  { fileName, sizeBytes, normalAllowed }: AskOpenModeParams
): Promise<OpenMode | undefined> {
  const items: PickItem<OpenMode | "cancel">[] = [
    ...(normalAllowed
      ? [
          {
            label: "通常モード",
            description: "すべての機能が使えます（読み込みに時間とメモリを使います）",
            value: "normal" as const,
          },
        ]
      : []),
    {
      label: "大容量モード",
      description: "表示範囲だけを読み込みます（一部の機能を制限します）",
      value: "large",
    },
    {
      label: "テキストとして開く",
      description: "VSCode のテキストエディタで開きます",
      value: "text",
    },
    { label: "キャンセル", value: "cancel" },
  ];
  const size = formatMiB(sizeBytes);
  const answer = await picker.pick(items, {
    title: `${fileName}（${size}）を開く方法`,
    placeHolder: normalAllowed
      ? `${size} の大きなファイルです。開き方を選んでください`
      : `${size} のため通常モードでは開けません（50MB 以上は通常モードを使えません）。開き方を選んでください`,
  });
  return answer === "cancel" ? undefined : answer;
}

const ENCODING_ITEMS: readonly PickItem<LargeEncoding>[] = [
  { label: "UTF-8", value: "utf-8" },
  { label: "UTF-8 (BOM付き)", value: "utf-8-bom" },
  { label: "Shift_JIS", description: "CP932（Windows-31J）相当", value: "shift_jis" },
  { label: "EUC-JP", value: "euc-jp" },
];

/** 大容量モードで開く文字コードを尋ねる。キャンセルなら undefined */
export function askLargeEncoding(
  picker: Picker,
  fileName: string,
  reason?: string
): Promise<LargeEncoding | undefined> {
  return picker.pick(ENCODING_ITEMS, {
    title: `${fileName} を大容量モードで開く文字コード`,
    placeHolder: reason ?? "ファイルの文字コードを選んでください",
  });
}
