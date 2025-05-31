export type MessageType = "init" | "update";

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
