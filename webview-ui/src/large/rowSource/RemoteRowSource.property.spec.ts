import type { LargeMessageToExtension } from "@message/largeMessages";
import * as fc from "fast-check";
import { RemoteRowSource } from "./RemoteRowSource";

type GetRows = Extract<LargeMessageToExtension, { type: "large/getRows" }>;

const PAGE = 4;

type Command =
  | { kind: "ensure"; start: number; length: number }
  | { kind: "respond"; pick: number }
  | { kind: "invalidate"; rowCount: number }
  | { kind: "read"; index: number };

const commandArb: fc.Arbitrary<Command> = fc.oneof(
  fc.record({
    kind: fc.constant("ensure" as const),
    start: fc.nat(60),
    length: fc.nat(25),
  }),
  fc.record({ kind: fc.constant("respond" as const), pick: fc.nat() }),
  fc.record({ kind: fc.constant("invalidate" as const), rowCount: fc.nat(60) }),
  fc.record({ kind: fc.constant("read" as const), index: fc.nat(70) })
);

describe("RemoteRowSource - Property-Based Tests", () => {
  it("getRow は常に最新 revision の正しい行か undefined を返す（古い応答・順不同の応答・無効化を含む）", () => {
    fc.assert(
      fc.property(
        fc.array(commandArb, { maxLength: 60 }),
        fc.integer({ min: 1, max: 6 }),
        (commands, maxCachedPages) => {
          let serverRevision = 0;
          let serverRowCount = 50;
          const rowFor = (revision: number, index: number) => [`r${revision}`, `${index}`];
          // サーバー側で「要求を受けた時点の revision / rowCount」を記録する
          const pending: { request: GetRows; revision: number; rowCount: number }[] = [];
          const source = new RemoteRowSource({
            postMessage: (m) => {
              if (m.type === "large/getRows") {
                pending.push({ request: m, revision: serverRevision, rowCount: serverRowCount });
              }
            },
            header: [],
            rowCount: serverRowCount,
            pageSize: PAGE,
            maxCachedPages,
            prefetchPages: 1,
          });

          const check = (index: number) => {
            const row = source.getRow(index);
            if (row !== undefined) {
              expect(index).toBeLessThan(source.rowCount);
              expect(row).toEqual(rowFor(serverRevision, index));
              expect(source.getHandle(index)).toBe(index);
            }
          };

          for (const command of commands) {
            switch (command.kind) {
              case "ensure":
                source.ensureRange(command.start, command.start + command.length);
                break;
              case "respond": {
                if (pending.length === 0) break;
                const [{ request, revision, rowCount }] = pending.splice(
                  command.pick % pending.length,
                  1
                );
                const end = Math.min(request.start + request.count, rowCount);
                const indices = Array.from(
                  { length: Math.max(0, end - request.start) },
                  (_, i) => request.start + i
                );
                source.handleMessage({
                  type: "large/rows",
                  reqId: request.reqId,
                  start: request.start,
                  rows: indices.map((i) => rowFor(revision, i)),
                  handles: indices,
                });
                break;
              }
              case "invalidate":
                serverRevision += 1;
                serverRowCount = command.rowCount;
                source.handleMessage({
                  type: "large/invalidate",
                  revision: serverRevision,
                  rowCount: serverRowCount,
                });
                break;
              case "read":
                check(command.index);
                break;
            }
            for (let i = 0; i < 70; i += 7) check(i);
          }
        }
      )
    );
  });

  it("取得済みの行を対象にした編集を楽観的に反映しても、取得済みの行と行数は常に拡張機能と一致する", () => {
    type EditCommand =
      | { kind: "ensure"; start: number; length: number }
      | { kind: "respond"; pick: number }
      | { kind: "setRow"; pick: number }
      | { kind: "insert"; pick: number; count: number; append: boolean }
      | { kind: "delete"; pick: number }
      | { kind: "invalidate" };
    const editCommandArb: fc.Arbitrary<EditCommand> = fc.oneof(
      fc.record({ kind: fc.constant("ensure" as const), start: fc.nat(40), length: fc.nat(20) }),
      fc.record({ kind: fc.constant("respond" as const), pick: fc.nat() }),
      fc.record({ kind: fc.constant("setRow" as const), pick: fc.nat() }),
      fc.record({
        kind: fc.constant("insert" as const),
        pick: fc.nat(),
        count: fc.integer({ min: 1, max: 6 }),
        append: fc.boolean(),
      }),
      fc.record({ kind: fc.constant("delete" as const), pick: fc.nat() }),
      fc.record({ kind: fc.constant("invalidate" as const) })
    );

    fc.assert(
      fc.property(
        fc.array(editCommandArb, { maxLength: 60 }),
        fc.integer({ min: 5, max: 8 }),
        fc.nat(40),
        (commands, maxCachedPages, finalStart) => {
          // 拡張機能側の表示順の行（applyOps を受けた時点で適用する）
          let server = Array.from({ length: 30 }, (_, i) => ({ handle: i, row: [`h${i}`] }));
          let revision = 0;
          let nextHandle = -1;
          let edits = 0;
          const pending: { request: GetRows; snapshot: typeof server }[] = [];
          const source = new RemoteRowSource({
            postMessage: (m) => {
              if (m.type === "large/getRows") {
                pending.push({ request: m, snapshot: server });
              } else if (m.type === "large/applyOps") {
                for (const op of m.ops) {
                  if (op.type === "setRow") {
                    server = server.map((e) =>
                      e.handle === op.handle ? { ...e, row: op.row } : e
                    );
                  } else if (op.type === "deleteRows") {
                    server = server.filter((e) => !op.handles.includes(e.handle));
                  } else if (op.type === "insertRows") {
                    const at =
                      op.beforeHandle === null
                        ? server.length
                        : server.findIndex((e) => e.handle === op.beforeHandle);
                    const added = op.rows.map((row, i) => ({ handle: op.handles[i], row }));
                    server = [...server.slice(0, at), ...added, ...server.slice(at)];
                  }
                }
              }
            },
            header: [],
            rowCount: server.length,
            pageSize: PAGE,
            maxCachedPages,
            prefetchPages: 1,
          });

          /** 取得済みの行の位置（編集の対象に使う） */
          const cachedIndices = () =>
            Array.from({ length: source.rowCount }, (_, i) => i).filter(
              (i) => source.getHandle(i) !== undefined
            );

          for (const command of commands) {
            switch (command.kind) {
              case "ensure":
                source.ensureRange(command.start, command.start + command.length);
                break;
              case "respond": {
                if (pending.length === 0) break;
                const [{ request, snapshot }] = pending.splice(command.pick % pending.length, 1);
                const slice = snapshot.slice(request.start, request.start + request.count);
                source.handleMessage({
                  type: "large/rows",
                  reqId: request.reqId,
                  start: request.start,
                  rows: slice.map((e) => e.row),
                  handles: slice.map((e) => e.handle),
                });
                break;
              }
              case "setRow": {
                const indices = cachedIndices();
                if (indices.length === 0) break;
                const index = indices[command.pick % indices.length];
                edits += 1;
                source.applyOps([
                  { type: "setRow", handle: source.getHandle(index)!, row: [`e${edits}`] },
                ]);
                break;
              }
              case "insert": {
                const indices = cachedIndices();
                if (!command.append && indices.length === 0) break;
                const before = command.append
                  ? null
                  : source.getHandle(indices[command.pick % indices.length])!;
                const handles = Array.from({ length: command.count }, () => nextHandle--);
                source.applyOps([
                  {
                    type: "insertRows",
                    beforeHandle: before,
                    handles,
                    rows: handles.map((h) => [`n${h}`]),
                  },
                ]);
                break;
              }
              case "delete": {
                const indices = cachedIndices();
                if (indices.length === 0) break;
                const index = indices[command.pick % indices.length];
                source.applyOps([{ type: "deleteRows", handles: [source.getHandle(index)!] }]);
                break;
              }
              case "invalidate":
                revision += 1;
                source.handleMessage({
                  type: "large/invalidate",
                  revision,
                  rowCount: server.length,
                });
                break;
            }
            expect(source.rowCount).toBe(server.length);
            for (let i = 0; i < source.rowCount; i++) {
              const row = source.getRow(i);
              if (row !== undefined) {
                expect(row).toEqual(server[i].row);
                expect(source.getHandle(i)).toBe(server[i].handle);
              }
            }
          }

          // 編集の後も、表示範囲を要求して応答が届けばその範囲の行はすべて揃う（欠けたページを残さない）
          const start = Math.min(finalStart, Math.max(0, source.rowCount - 1));
          const end = Math.min(start + 8, source.rowCount);
          source.ensureRange(start, end);
          while (pending.length > 0) {
            const { request, snapshot } = pending.shift()!;
            const slice = snapshot.slice(request.start, request.start + request.count);
            source.handleMessage({
              type: "large/rows",
              reqId: request.reqId,
              start: request.start,
              rows: slice.map((e) => e.row),
              handles: slice.map((e) => e.handle),
            });
            source.ensureRange(start, end);
          }
          for (let i = start; i < end; i++) {
            expect(source.getRow(i)).toEqual(server[i].row);
          }
        }
      ),
      // 古い応答と編集が重なる組み合わせを十分に試すため、既定（100回）より多く回す
      { numRuns: 1000 }
    );
  });

  it("in-flight 中のページを同時に二重要求しない", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.nat(60), fc.nat(25)), { maxLength: 30 }), (ranges) => {
        const inflightPages = new Set<number>();
        let duplicated = false;
        const source = new RemoteRowSource({
          postMessage: (m) => {
            if (m.type !== "large/getRows") return;
            for (let p = m.start / PAGE; p < (m.start + m.count) / PAGE; p++) {
              if (inflightPages.has(p)) duplicated = true;
              inflightPages.add(p);
            }
          },
          header: [],
          rowCount: 100,
          pageSize: PAGE,
          prefetchPages: 1,
        });
        for (const [start, length] of ranges) source.ensureRange(start, start + length);
        expect(duplicated).toBe(false);
      })
    );
  });
});
