import fc from "fast-check";
import { shiftOnDelete, shiftOnInsert, remapOnMove } from "./indexKeyRemap";

const mapArb = fc
  .array(fc.tuple(fc.nat(30), fc.integer({ min: 1, max: 1000 })), { maxLength: 15 })
  .map((entries) => new Map(entries));
const indexArb = fc.nat(30);

describe("indexKeyRemap - Property-Based Tests", () => {
  it("挿入してから同じ位置を削除すると元に戻る", () => {
    fc.assert(
      fc.property(mapArb, indexArb, (map, index) => {
        const result = shiftOnDelete(shiftOnInsert(map, index), index);
        expect(result).toEqual(map);
      })
    );
  });

  it("挿入では設定の数が変わらない", () => {
    fc.assert(
      fc.property(mapArb, indexArb, (map, index) => {
        expect(shiftOnInsert(map, index).size).toBe(map.size);
      })
    );
  });

  it("削除後の設定の数は、削除位置に設定があれば1減り、なければ変わらない", () => {
    fc.assert(
      fc.property(mapArb, indexArb, (map, index) => {
        const expected = map.size - (map.has(index) ? 1 : 0);
        expect(shiftOnDelete(map, index).size).toBe(expected);
      })
    );
  });

  it("移動では設定の数も値の集合も変わらない", () => {
    fc.assert(
      fc.property(mapArb, indexArb, indexArb, (map, from, to) => {
        const result = remapOnMove(map, from, to);
        expect(result.size).toBe(map.size);
        expect([...result.values()].sort((a, b) => a - b)).toEqual(
          [...map.values()].sort((a, b) => a - b)
        );
      })
    );
  });

  it("移動してから逆移動すると元に戻る", () => {
    fc.assert(
      fc.property(mapArb, indexArb, indexArb, (map, from, to) => {
        expect(remapOnMove(remapOnMove(map, from, to), to, from)).toEqual(map);
      })
    );
  });

  it("移動元の設定は移動先へ付いていく", () => {
    fc.assert(
      fc.property(mapArb, indexArb, indexArb, (map, from, to) => {
        const result = remapOnMove(map, from, to);
        if (map.has(from)) {
          expect(result.get(to)).toBe(map.get(from));
        } else {
          expect(result.has(to)).toBe(false);
        }
      })
    );
  });
});
