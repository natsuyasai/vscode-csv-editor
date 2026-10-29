/**
 * IME変換中(または変換確定直後)のキーイベントかどうかを判定する
 *
 * - Chrome/Firefox: 変換中は isComposing が true
 * - Safari: compositionend の後に keydown が発火するため isComposing は false だが keyCode は 229
 */
export const isImeComposing = (e: {
  nativeEvent: { isComposing?: boolean };
  keyCode?: number;
}): boolean => e.nativeEvent.isComposing === true || e.keyCode === 229;

/**
 * 選択中(非編集状態)にIMEで入力が始まった keydown かどうかを判定する
 * IME有効時の keydown は key が "Process"、keyCode が 229 になる
 */
export const isImeInputStart = (e: { key: string; keyCode?: number }): boolean =>
  e.key === "Process" || e.keyCode === 229;
