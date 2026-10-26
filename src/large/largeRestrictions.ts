/**
 * 大容量モードで制限している機能の表示名（`large/init` の restrictions）。
 * 恒久的に使えない機能と、まだ対応していない機能（後続フェーズで対応したら外す）に分けて持つ。
 */

/** 大容量モードでは恒久的に使えない機能 */
export const PERMANENT_RESTRICTIONS: readonly string[] = [
  "列の挿入・削除",
  "行・列のドラッグ&ドロップによる並び替え",
  "オートフィル",
];

/**
 * まだ対応していない機能（後続フェーズで対応したら外す）。
 * 編集・保存は 2-2、検索・ソート・フィルタは 2-3、範囲コピー&ペーストは 2-4 で対応済み
 */
export const PENDING_RESTRICTIONS: readonly string[] = [];

/** webview に送る制限中の機能の一覧 */
export const LARGE_MODE_RESTRICTIONS: readonly string[] = [
  ...PERMANENT_RESTRICTIONS,
  ...PENDING_RESTRICTIONS,
];
