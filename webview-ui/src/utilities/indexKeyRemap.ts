/**
 * インデックスをキーにした設定（列幅・文字寄せ・行の高さなど）を、
 * 行・列の挿入/削除/移動に追従させるための純粋関数群。
 * Map<number, T> と Record<number, T> のどちらにも使える（入力と同じ型を返す）。
 */

type IndexKeyed<T> = Map<number, T> | Record<number, T>;

/** キー変換。null を返したキーは破棄する */
type KeyMapper = (key: number) => number | null;

const remapKeys = <S extends IndexKeyed<unknown>>(source: S, mapKey: KeyMapper): S => {
  if (source instanceof Map) {
    const result = new Map<number, unknown>();
    source.forEach((value, key) => {
      const newKey = mapKey(key);
      if (newKey !== null) result.set(newKey, value);
    });
    return result as S;
  }
  const result: Record<number, unknown> = {};
  Object.entries(source).forEach(([key, value]) => {
    const newKey = mapKey(Number(key));
    if (newKey !== null) result[newKey] = value;
  });
  return result as S;
};

/** index の位置に count 個挿入された場合、index 以降のキーを後ろへずらす */
export const shiftOnInsert = <S extends IndexKeyed<unknown>>(
  source: S,
  index: number,
  count = 1
): S => remapKeys(source, (key) => (key >= index ? key + count : key));

/** index の位置が削除された場合、そのキーを破棄し、後ろのキーを前へずらす */
export const shiftOnDelete = <S extends IndexKeyed<unknown>>(source: S, index: number): S =>
  remapKeys(source, (key) => {
    if (key === index) return null;
    return key > index ? key - 1 : key;
  });

/** from の要素を to の位置へ移動した場合（取り除いてから to に挿入）のキー付け替え */
export const remapOnMove = <S extends IndexKeyed<unknown>>(
  source: S,
  from: number,
  to: number
): S =>
  remapKeys(source, (key) => {
    if (from === to) return key;
    if (key === from) return to;
    if (from < to && key > from && key <= to) return key - 1;
    if (from > to && key >= to && key < from) return key + 1;
    return key;
  });
