export type JsonType =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";
export type JsonValueType = string | number | boolean | null | object | Function;
export interface JsonObject {
  type: JsonType;
  value: JsonValueType;
}
export interface JsonRecords {
  type:
    | "array"
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function";
  record: Record<string, JsonObject>[];
}
export function useJsonToViewObject(jsonObject: Record<string, any>) {
  const objects: Record<string, JsonRecords> = {};

  function createObjectFromJsonObject() {
    Object.keys(jsonObject).forEach((key) => {
      const value = jsonObject[key];
      if (value === null) {
        return;
      }
      if (Array.isArray(value)) {
        // 配列要素の場合、各要素ごとにRecordを生成
        objects[key] = { type: "array", record: [] };
        value.forEach((item: any) => {
          const arrayInnerObject: Record<string, JsonObject> = {};
          Object.keys(item).forEach((itemKey) => {
            arrayInnerObject[itemKey] = { type: "string", value: "" };
            arrayInnerObject[itemKey].type = typeof item[itemKey];
            arrayInnerObject[itemKey].value = item[itemKey];
          });
          objects[key].record.push(arrayInnerObject);
        });
      } else if (typeof value === "object") {
        // 単なるオブジェクトならそのままRecordを生成
        objects[key] = { type: "object", record: [] };
        const arrayInnerObject: Record<string, JsonObject> = {};
        Object.keys(value).forEach((itemKey) => {
          arrayInnerObject[itemKey] = { type: "string", value: "" };
          arrayInnerObject[itemKey].type = typeof value[itemKey];
          arrayInnerObject[itemKey].value = value[itemKey];
        });
        objects[key].record.push(arrayInnerObject);
        return;
      } else {
        // valueが文字列や数値の場合、それ単一のRecordを生成
        objects[key] = { type: typeof value, record: [] };
        const arrayInnerObject: Record<string, JsonObject> = {};
        arrayInnerObject[key] = { type: "string", value: "" };
        arrayInnerObject[key].type = typeof value;
        arrayInnerObject[key].value = value;
        objects[key].record.push(arrayInnerObject);
      }
    });
  }

  createObjectFromJsonObject();

  return objects;
}
