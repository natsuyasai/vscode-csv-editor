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

export interface UpdateTheameMessage extends Message {
  type: "updateTheme";
  payload: ThemeKind;
}
