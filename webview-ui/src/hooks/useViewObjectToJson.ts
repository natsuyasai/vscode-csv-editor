import { JsonObject, JsonRecords, JsonType, JsonValueType } from "./useJsonToViewObject";

export function useViewObjectToJson(
  srcJsonObject: Record<string, any>,
  tableItems: JsonRecords,
  targetKey: string
) {
  let jsonObject: Record<string, any> = {};
  function createJsonObject() {
    const newJsonObject = { ...srcJsonObject };
    if (tableItems.type === "array") {
      newJsonObject[targetKey] = tableItems.record.map((item) => {
        const newItem: Record<string, any> = {};
        Object.keys(item).forEach((itemKey) => {
          newItem[itemKey] = convertValue(item[itemKey].value, item[itemKey].type);
        });
        return newItem;
      });
    } else if (tableItems.type === "object") {
      newJsonObject[targetKey] = tableItems.record.map((item) => {
        const newItem: Record<string, any> = {};
        Object.keys(item).forEach((itemKey) => {
          newItem[itemKey] = convertValue(item[itemKey].value, item[itemKey].type);
        });
        return newItem;
      })[0];
    } else {
      newJsonObject[targetKey] = tableItems.record.map((item) => {
        let newItem = null;
        Object.keys(item).forEach((itemKey) => {
          newItem = convertValue(item[itemKey].value, item[itemKey].type);
        });
        return newItem;
      })[0];
    }
    jsonObject = newJsonObject;
  }

  function convertValue(value: JsonValueType, type: JsonType) {
    switch (type) {
      case "string":
        return value;
      case "number":
        return Number(value);
      case "boolean":
        return Boolean(value);
      case "bigint":
        return BigInt(value as string);
      default:
        return value?.toString() || null;
    }
  }

  createJsonObject();

  return jsonObject;
}
