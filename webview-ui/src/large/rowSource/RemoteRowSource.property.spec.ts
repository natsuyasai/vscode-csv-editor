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
