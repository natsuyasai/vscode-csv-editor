export type MessageType = "init" | "update" | "updateTheme";

export type ThemeKind = "light" | "dark";

export interface Message {
  type: MessageType;
  payload?: string;
}

export interface InitMessage extends Message {
  type: "init";
}

export interface UpdateMessage extends Message {
  type: "update";
  payload: string;
}

export interface UpdateThemeMessage extends Message {
  type: "updateTheme";
  payload: ThemeKind;
}

/**
 * 拡張機能から受信した値が webview 向けメッセージとして妥当かを検証する型ガード。
 * - init / update: payload は省略可（指定する場合は string）
 * - updateTheme: payload は "light" | "dark"
 */
export function isMessageToWebview(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { type, payload } = value as { type?: unknown; payload?: unknown };
  switch (type) {
    case "init":
    case "update":
      return payload === undefined || typeof payload === "string";
    case "updateTheme":
      return payload === "light" || payload === "dark";
    default:
      return false;
  }
}
