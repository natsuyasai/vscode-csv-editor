/**
 * 大容量モードで制限している機能の表示名（`large/init` の restrictions）。
 * 編集・保存（2-2）、検索・ソート・フィルタ（2-3）、範囲コピー&ペースト（2-4）は対応済みのため含めない。
 */

/** 大容量モードの設計上使えない機能（列の構造の変更・並び替え・オートフィル） */
export const PERMANENT_RESTRICTIONS: readonly string[] = [
  "列の挿入・削除",
  "行・列のドラッグ&ドロップによる並び替え",
  "オートフィル",
];

/**
 * 通常モードにあるが大容量モードでは提供しない機能。
 * 表示は固定の行の高さ・列幅で、選択は矩形の範囲だけ。検索は拡張機能側で次の一致を探すだけで、全件は数えない
 */
export const NOT_PROVIDED_RESTRICTIONS: readonly string[] = [
  "列の配置（左・中央・右揃え）",
  "行の高さ・列幅の変更",
  "ヘッダー行を無視する設定（Ignore Header Row）",
  "行・列の全体選択",
  "一括編集",
  "検索の一致件数の表示・すべての一致の強調",
];

/** webview に送る制限中の機能の一覧 */
export const LARGE_MODE_RESTRICTIONS: readonly string[] = [
  ...PERMANENT_RESTRICTIONS,
  ...NOT_PROVIDED_RESTRICTIONS,
];
