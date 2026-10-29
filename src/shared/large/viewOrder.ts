import type { RowStoreOp } from "./rowStore";

/**
 * ソート・フィルタを当てたときの表示順（行のハンドルの配列。vscode API・npm パッケージに依存しない純粋なロジック）。
 *
 * スナップショット方式: ソート・フィルタを当てた時点の並びを持ち、セルの編集では並べ直さず、フィルタからも外さない。
 * RowStore の並びに入った行・無くなった行（挿入・削除とその Undo/Redo）だけを `applyStoreOpToView` で追従させる。
 * 並べ直しは、利用者がソート・フィルタを当て直したときに行う（通常モードとの挙動差）。
 *
 * 表現: Float64Array（500万行で 40MB）。位置 → ハンドルは O(1)、ハンドル → 位置・挿入・削除は O(行数)。
 */

/** 表示順から除いた行の、除く前の場所（削除を元に戻すときに同じ場所へ戻す） */
export interface RemovedPlace {
  /** 除いたときに直後にあった、除かれなかった行（末尾なら null） */
  next: number | null;
  /** 除く前の位置 */
  index: number;
}

const MIN_CAPACITY = 16;

export class ViewOrder {
  private buffer: Float64Array;
  private size: number;

  /** handles はコピーせずに持つ（Float64Array を渡したら以後は書き換えないこと） */
  constructor(handles: Float64Array | readonly number[]) {
    this.buffer = handles instanceof Float64Array ? handles : Float64Array.from(handles);
    this.size = this.buffer.length;
  }

  get length(): number {
    return this.size;
  }

  handleAt(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new RangeError(`view index out of range: ${String(index)}`);
    }
    return this.buffer[index];
  }

  /** 表示位置 [start, start + count) のハンドル（末尾で切り詰める） */
  handlesInRange(start: number, count: number): number[] {
    const end = Math.min(this.size, start + count);
    const result: number[] = [];
    for (let i = start; i < end; i++) {
      result.push(this.buffer[i]);
    }
    return result;
  }

  /** ハンドル → 表示位置（無ければ -1）。O(行数) */
  indexOf(handle: number): number {
    const index = this.buffer.subarray(0, this.size).indexOf(handle);
    return index;
  }

  has(handle: number): boolean {
    return this.indexOf(handle) >= 0;
  }

  /** 表示順のコピー（ワーカーへ渡す） */
  toFloat64Array(): Float64Array {
    return this.buffer.slice(0, this.size);
  }

  /** handles を beforeHandle の直前に入れる。beforeHandle が null か表示順に無ければ末尾に入れる */
  insert(beforeHandle: number | null, handles: readonly number[]): void {
    if (handles.length === 0) {
      return;
    }
    const found = beforeHandle === null ? -1 : this.indexOf(beforeHandle);
    const at = found < 0 ? this.size : found;
    this.ensureCapacity(this.size + handles.length);
    this.buffer.copyWithin(at + handles.length, at, this.size);
    this.buffer.set(handles, at);
    this.size += handles.length;
  }

  /**
   * 複数の挿入を1回の走査でまとめて行う（O(行数 + 挿入数)）。各要素は insert と同じ規則で、
   * 同じ行の直前に入れるものは渡した順に並ぶ。beforeHandle が null か表示順に無ければ、渡した順で末尾に入れる
   */
  insertBatch(items: readonly { beforeHandle: number | null; handles: readonly number[] }[]): void {
    const byBefore = new Map<number, number[]>();
    const tail: number[] = [];
    let total = 0;
    const present = this.presentAmong(
      new Set(items.flatMap((item) => (item.beforeHandle === null ? [] : [item.beforeHandle])))
    );
    for (const item of items) {
      total += item.handles.length;
      if (item.beforeHandle !== null && present.has(item.beforeHandle)) {
        const list = byBefore.get(item.beforeHandle) ?? [];
        list.push(...item.handles);
        byBefore.set(item.beforeHandle, list);
      } else {
        tail.push(...item.handles);
      }
    }
    if (total === 0) {
      return;
    }
    const result = new Float64Array(Math.max(this.size + total, MIN_CAPACITY));
    let write = 0;
    for (let read = 0; read < this.size; read++) {
      const handle = this.buffer[read];
      const inserted = byBefore.get(handle);
      if (inserted) {
        result.set(inserted, write);
        write += inserted.length;
      }
      result[write++] = handle;
    }
    result.set(tail, write);
    this.buffer = result;
    this.size = write + tail.length;
  }

  /** candidates のうち表示順にあるもの（1回の走査） */
  presentAmong(candidates: ReadonlySet<number>): Set<number> {
    const present = new Set<number>();
    if (candidates.size === 0) {
      return present;
    }
    for (let i = 0; i < this.size; i++) {
      if (candidates.has(this.buffer[i])) {
        present.add(this.buffer[i]);
      }
    }
    return present;
  }

  /** handles を除く（表示順に無いものは無視）。除いた行ごとに除く前の場所を返す */
  remove(handles: Iterable<number>): Map<number, RemovedPlace> {
    const targets = new Set(handles);
    const places = new Map<number, RemovedPlace>();
    if (targets.size === 0) {
      return places;
    }
    // 後ろから見て、直後に残る行を覚えながら場所を記録する
    let next: number | null = null;
    for (let i = this.size - 1; i >= 0; i--) {
      const handle = this.buffer[i];
      if (targets.has(handle)) {
        places.set(handle, { next, index: i });
      } else {
        next = handle;
      }
    }
    if (places.size === 0) {
      return places;
    }
    let write = 0;
    for (let read = 0; read < this.size; read++) {
      const handle = this.buffer[read];
      if (!targets.has(handle)) {
        this.buffer[write++] = handle;
      }
    }
    this.size = write;
    return places;
  }

  /** 各ハンドルを付け替える（保存で行番号が変わったとき）。undefined を返した行は除く */
  remap(map: (handle: number) => number | undefined): void {
    let write = 0;
    for (let read = 0; read < this.size; read++) {
      const mapped = map(this.buffer[read]);
      if (mapped !== undefined) {
        this.buffer[write++] = mapped;
      }
    }
    this.size = write;
  }

  private ensureCapacity(required: number): void {
    if (required <= this.buffer.length) {
      return;
    }
    const grown = new Float64Array(Math.max(required, this.buffer.length * 2, MIN_CAPACITY));
    grown.set(this.buffer.subarray(0, this.size));
    this.buffer = grown;
  }
}

/**
 * RowStore に当てた op（逆操作を含む）を表示順にも当てる。
 * - insertRows: 表示順で beforeHandle の直前（表示に無ければ末尾）に入れる（フィルタ中でも表示に加わる）
 * - deleteRows: 表示順から除き、除く前の場所を places に記録する
 * - restoreRows（削除の Undo）: places に記録した場所（直後にあった行の直前）に戻す。その行が表示に無ければ
 *   ファイル上の並びで次にある行（run の beforeHandle）の直前、それも無ければ末尾に戻す
 * - セル・ヘッダーの編集は並べ直さない（スナップショット方式）
 */
export function applyStoreOpToView(
  view: ViewOrder,
  op: RowStoreOp,
  places: Map<number, RemovedPlace>
): void {
  switch (op.type) {
    case "insertRows":
      view.insert(op.beforeHandle, op.handles);
      return;
    case "deleteRows":
      for (const [handle, place] of view.remove(op.handles)) {
        places.set(handle, place);
      }
      return;
    case "restoreRows": {
      const items: { handle: number; place?: RemovedPlace; fallback: number | null }[] = [];
      const candidates = new Set<number>();
      for (const run of op.runs) {
        for (const handle of run.handles) {
          const place = places.get(handle);
          places.delete(handle);
          items.push({ handle, place, fallback: run.beforeHandle });
          if (place?.next !== undefined && place.next !== null) {
            candidates.add(place.next);
          }
          if (run.beforeHandle !== null) {
            candidates.add(run.beforeHandle);
          }
        }
      }
      // 除く前の位置の順に戻す（同じ行の直前に戻すものは、この順で並ぶ）。記録の無い行はその後
      items.sort(
        (a, b) =>
          (a.place?.index ?? Number.POSITIVE_INFINITY) -
          (b.place?.index ?? Number.POSITIVE_INFINITY)
      );
      const present = view.presentAmong(candidates);
      view.insertBatch(
        items.map((item) => ({
          beforeHandle: resolveBefore(present, item.place, item.fallback),
          handles: [item.handle],
        }))
      );
      return;
    }
    case "setRow":
    case "clearRow":
    case "setHeader":
    case "clearHeader":
      return;
  }
}

function resolveBefore(
  present: ReadonlySet<number>,
  place: RemovedPlace | undefined,
  fallback: number | null
): number | null {
  if (place && (place.next === null || present.has(place.next))) {
    return place.next;
  }
  return fallback !== null && present.has(fallback) ? fallback : null;
}
