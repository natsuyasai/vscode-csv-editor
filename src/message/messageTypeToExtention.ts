export type MessageType = "update" | "reload" | "save";

export interface Message {
  type: MessageType;
  payload?: any;
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
