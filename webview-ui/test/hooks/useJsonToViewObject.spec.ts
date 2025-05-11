import { describe, expect } from "vitest";
import { useJsonToViewObject } from "@/hooks/useJsonToViewObject";

describe("Jsonオブジェクトから配列要素のkeyとvalueを抽出する", () => {
  it("配列が1つのみのJSONの場合、対象の配列の要素のRecodeが生成されること", () => {
    const objects = useJsonToViewObject({
      array1: [
        { key1_1: "value1_1", key1_2: "value1_2" },
        { key1_1: "value2_1", key1_2: "value2_2" },
        { key1_1: 1, key1_2: false },
      ],
    });
    expect(objects).toEqual({
      array1: {
        type: "array",
        record: [
          {
            key1_1: { type: "string", value: "value1_1" },
            key1_2: { type: "string", value: "value1_2" },
          },
          {
            key1_1: { type: "string", value: "value2_1" },
            key1_2: { type: "string", value: "value2_2" },
          },
          {
            key1_1: { type: "number", value: 1 },
            key1_2: { type: "boolean", value: false },
          },
        ],
      },
    });
  });

  it("配列が2つ存在するJSONの場合、対象の配列の要素のRecodeが2つ分生成されること", () => {
    const objects = useJsonToViewObject({
      array1: [
        { key1_1: "value1_1", key1_2: "value1_2" },
        { key1_1: "value2_1", key1_2: "value2_2" },
        { key1_1: 1, key1_2: false },
      ],
      array2: [{ key2_1: "value1_1", key2_2: "value1_2" }],
    });
    expect(objects).toEqual({
      array1: {
        type: "array",
        record: [
          {
            key1_1: { type: "string", value: "value1_1" },
            key1_2: { type: "string", value: "value1_2" },
          },
          {
            key1_1: { type: "string", value: "value2_1" },
            key1_2: { type: "string", value: "value2_2" },
          },
          {
            key1_1: { type: "number", value: 1 },
            key1_2: { type: "boolean", value: false },
          },
        ],
      },
      array2: {
        type: "array",
        record: [
          {
            key2_1: { type: "string", value: "value1_1" },
            key2_2: { type: "string", value: "value1_2" },
          },
        ],
      },
    });
  });

  it("配列が2つ存在するかつ配列以外の要素も存在するJSONの場合、配列の要素のみ出力されること", () => {
    const objects = useJsonToViewObject({
      key1: "value1",
      key2: { key2_1: "value2_1", key2_2: "value2_2" },
      array1: [
        { key1_1: "value1_1", key1_2: "value1_2" },
        { key1_1: "value2_1", key1_2: "value2_2" },
        { key1_1: 1, key1_2: false },
      ],
      key3: 3,
      array2: [{ key2_1: "value1_1", key2_2: "value1_2" }],
      key4: true,
    });
    expect(objects).toEqual({
      array1: {
        type: "array",
        record: [
          {
            key1_1: { type: "string", value: "value1_1" },
            key1_2: { type: "string", value: "value1_2" },
          },
          {
            key1_1: { type: "string", value: "value2_1" },
            key1_2: { type: "string", value: "value2_2" },
          },
          {
            key1_1: { type: "number", value: 1 },
            key1_2: { type: "boolean", value: false },
          },
        ],
      },
      array2: {
        type: "array",
        record: [
          {
            key2_1: { type: "string", value: "value1_1" },
            key2_2: { type: "string", value: "value1_2" },
          },
        ],
      },
      key1: {
        type: "string",
        record: [{ key1: { type: "string", value: "value1" } }],
      },
      key2: {
        type: "object",
        record: [
          {
            key2_1: { type: "string", value: "value2_1" },
            key2_2: { type: "string", value: "value2_2" },
          },
        ],
      },
      key3: {
        type: "number",
        record: [{ key3: { type: "number", value: 3 } }],
      },
      key4: {
        type: "boolean",
        record: [{ key4: { type: "boolean", value: true } }],
      },
    });
  });
});

describe("TODO:ネストしたオブジェクト配列はどうするか？", () => {});
