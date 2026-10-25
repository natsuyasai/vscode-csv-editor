export type MessageType = "init" | "update" | "reload" | "save" | "openAsText";

export interface Message {
  type: MessageType;
  payload?: string;
}

export interface UpdateMessage extends Message {
  type: "update";
  payload: string;
}

export interface ReloadMessage extends Message {
  type: "reload";
  payload: string;
}

export interface SaveMessage extends Message {
  type: "save";
  payload: string;
}

export interface InitMessage extends Message {
  type: "init";
}

/** 既定のテキストエディタで開き直す要求（CSVとして解析できない場合の退避導線） */
export interface OpenAsTextMessage extends Message {
  type: "openAsText";
}

const PAYLOAD_REQUIRED_TYPES: readonly MessageType[] = ["update", "save"];
const KNOWN_TYPES: readonly MessageType[] = ["init", "update", "reload", "save", "openAsText"];

/**
 * webview から受信した値が拡張機能向けメッセージとして妥当かを検証する型ガード。
 * webview は信頼境界の外側のため、type・payload の型を実行時に確認する。
 * - update / save: payload は string 必須
 * - その他: payload は省略可（指定する場合は string）
 */
export function isMessageToExtension(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, payload } = value as { type?: unknown; payload?: unknown };
  if (typeof type !== "string" || !KNOWN_TYPES.includes(type as MessageType)) {
    return false;
  }
  if (PAYLOAD_REQUIRED_TYPES.includes(type as MessageType)) {
    return typeof payload === "string";
  }
  return payload === undefined || typeof payload === "string";
}
