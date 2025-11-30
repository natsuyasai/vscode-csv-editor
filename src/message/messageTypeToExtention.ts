export type MessageType = "init" | "update" | "reload" | "save";

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
