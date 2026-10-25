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
