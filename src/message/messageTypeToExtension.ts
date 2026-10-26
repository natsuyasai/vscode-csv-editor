import type { RowOp } from "../shared/csv/ops";

export type MessageType = "init" | "update" | "reload" | "save" | "openAsText" | "applyOps";

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
  /** 差分同期への移行中のみ全文を持つ。差分同期では省略する */
  payload?: string;
}

/** 編集差分（行単位の操作）の適用要求。epoch は拡張機能から受け取った全文送信の世代 */
export interface ApplyOpsMessage extends Message {
  type: "applyOps";
  epoch: number;
  ops: RowOp[];
}

export interface InitMessage extends Message {
  type: "init";
}

/** 既定のテキストエディタで開き直す要求（CSVとして解析できない場合の退避導線） */
export interface OpenAsTextMessage extends Message {
  type: "openAsText";
}

const PAYLOAD_REQUIRED_TYPES: readonly MessageType[] = ["update"];
const KNOWN_TYPES: readonly MessageType[] = ["init", "update", "reload", "save", "openAsText", "applyOps"];

/**
 * webview から受信した値が拡張機能向けメッセージとして妥当かを検証する型ガード。
 * webview は信頼境界の外側のため、type・payload の型を実行時に確認する。
 * - update: payload は string 必須
 * - applyOps: epoch は 0 以上の整数、ops は RowOp[]
 * - その他（save を含む）: payload は省略可（指定する場合は string）
 */
export function isMessageToExtension(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, payload } = value as { type?: unknown; payload?: unknown };
  if (typeof type !== "string" || !KNOWN_TYPES.includes(type as MessageType)) {
    return false;
  }
  if (type === "applyOps") {
    const { epoch, ops } = value as { epoch?: unknown; ops?: unknown };
    return isEpoch(epoch) && Array.isArray(ops) && ops.every(isRowOp);
  }
  if (PAYLOAD_REQUIRED_TYPES.includes(type as MessageType)) {
    return typeof payload === "string";
  }
  return payload === undefined || typeof payload === "string";
}

function isEpoch(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRowOp(value: unknown): value is RowOp {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, start, deleteCount, rows } = value as Record<string, unknown>;
  return (
    type === "replaceRows" &&
    isEpoch(start) &&
    isEpoch(deleteCount) &&
    Array.isArray(rows) &&
    rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"))
  );
}
