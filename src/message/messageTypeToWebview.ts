export type MessageType = "init" | "update" | "updateTheme";

export type ThemeKind = "light" | "dark";

export interface Message {
  type: MessageType;
  payload?: string;
}

/** 全文送信（init / update）の世代番号を持つメッセージ */
export interface InitMessage extends Message {
  type: "init";
  epoch: number;
}

export interface UpdateMessage extends Message {
  type: "update";
  payload: string;
  epoch: number;
}

export interface UpdateThemeMessage extends Message {
  type: "updateTheme";
  payload: ThemeKind;
}

/**
 * 拡張機能から受信した値が webview 向けメッセージとして妥当かを検証する型ガード。
 * - init / update: payload は省略可（指定する場合は string）、epoch は 0 以上の整数必須
 * - updateTheme: payload は "light" | "dark"
 */
export function isMessageToWebview(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, payload } = value as { type?: unknown; payload?: unknown };
  switch (type) {
    case "init":
    case "update": {
      const { epoch } = value as { epoch?: unknown };
      return (
        (payload === undefined || typeof payload === "string") &&
        typeof epoch === "number" &&
        Number.isInteger(epoch) &&
        epoch >= 0
      );
    }
    case "updateTheme":
      return payload === "light" || payload === "dark";
    default:
      return false;
  }
}
