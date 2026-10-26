/**
 * 大容量モードで制限している機能の表示名（`large/init` の restrictions）。
 * 恒久的に使えない機能と、2-1 時点で未対応の機能（後続フェーズで対応したら外す）に分けて持つ。
 */

/** 大容量モードでは恒久的に使えない機能 */
export const PERMANENT_RESTRICTIONS: readonly string[] = [
  "列の挿入・削除",
  "行・列のドラッグ&ドロップによる並び替え",
  "オートフィル",
];

/** まだ対応していない機能（2-2: 編集・保存、2-3: 検索・ソート・フィルタ、2-4: 範囲コピー&ペースト） */
export const PENDING_RESTRICTIONS: readonly string[] = [
  "編集（セル・ヘッダーの編集、行の挿入・削除）",
  "保存",
  "検索",
  "ソート",
  "フィルタ",
  "範囲コピー&ペースト",
];

/** webview に送る制限中の機能の一覧 */
export const LARGE_MODE_RESTRICTIONS: readonly string[] = [
  ...PERMANENT_RESTRICTIONS,
  ...PENDING_RESTRICTIONS,
];
