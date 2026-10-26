/* global AbortSignal */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import { isLargeMessageToExtension, type LargeOp } from "../message/largeMessages";

import { isLargeEncoding, type LargeEncoding } from "./largeEncoding";

/** ファイルの更新日時とサイズ（バックアップ・外部変更の判定に使う） */
export interface FileStamp {
  mtimeMs: number;
  size: number;
}

/**
 * 大容量モードのバックアップ（Hot Exit・ウィンドウの再読み込みで未保存の変更を残す）。
 * ops は source の状態のファイル（最後に保存・読み込みした状態）に1単位で当て直すと、未保存の状態になる op 列
 */
export interface LargeBackupData {
  version: 1;
  /** 読み書きしていたファイル（別名で保存した後は保存先。VSCode が開いた URI と違うことがある） */
  fileUri: string;
  encoding: LargeEncoding;
  /** ops の土台にしたファイルの状態（取得できなかったら null。復元時は「変わっていた」扱い） */
  source: FileStamp | null;
  ops: LargeOp[];
}

/** バックアップを読めなかった（壊れている・形式が違う） */
export class LargeBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LargeBackupError";
  }
}

/** ファイルの状態。無ければ "missing"、その他の失敗は undefined */
export async function statFile(filePath: string): Promise<FileStamp | "missing" | undefined> {
  try {
    const stat = await fs.promises.stat(filePath);
    return { mtimeMs: stat.mtimeMs, size: stat.size };
  } catch (error) {
    return (error as { code?: unknown }).code === "ENOENT" ? "missing" : undefined;
  }
}

export function sameStamp(
  a: FileStamp | "missing" | null | undefined,
  b: FileStamp | "missing" | null | undefined
): boolean {
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  return a.mtimeMs === b.mtimeMs && a.size === b.size;
}

const isStamp = (value: unknown): value is FileStamp =>
  typeof value === "object" &&
  value !== null &&
  Number.isFinite((value as FileStamp).mtimeMs) &&
  Number.isFinite((value as FileStamp).size);

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    const error = new Error("バックアップを取り消しました");
    error.name = "AbortError";
    throw error;
  }
};

/**
 * バックアップを書き出す。op を1つずつ書き（大きな貼り付けでも1つの巨大な文字列を作らない）、
 * 同じディレクトリの一時ファイルに書いてから置き換える。取り消し・失敗では一時ファイルを消して投げる
 */
export async function writeLargeBackup(
  destination: string,
  data: LargeBackupData,
  signal?: AbortSignal
): Promise<void> {
  throwIfAborted(signal);
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  const temp = `${destination}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  const stream = fs.createWriteStream(temp, { encoding: "utf8" });
  const failed = new Promise<never>((_, reject) => {
    stream.once("error", reject);
  });
  failed.catch(() => {});
  const write = async (chunk: string) => {
    throwIfAborted(signal);
    if (!stream.write(chunk)) {
      await Promise.race([
        new Promise<void>((resolve) => {
          stream.once("drain", () => {
            resolve();
          });
        }),
        failed,
      ]);
    }
  };
  try {
    const { ops, ...head } = data;
    const prefix = JSON.stringify(head);
    await write(`${prefix.slice(0, -1)},"ops":[`);
    for (let i = 0; i < ops.length; i++) {
      await write((i === 0 ? "" : ",") + JSON.stringify(ops[i]));
    }
    await write("]}");
    await Promise.race([
      new Promise<void>((resolve) => {
        stream.end(() => {
          resolve();
        });
      }),
      failed,
    ]);
    throwIfAborted(signal);
    await fs.promises.rename(temp, destination);
  } catch (error) {
    stream.destroy();
    await fs.promises.rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

/** バックアップを読む。壊れている・形式が違うときは LargeBackupError */
export async function readLargeBackup(file: string): Promise<LargeBackupData> {
  let value: unknown;
  try {
    value = JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch (error) {
    throw new LargeBackupError(
      `バックアップを読めませんでした（${error instanceof Error ? error.message : String(error)}）`
    );
  }
  if (typeof value !== "object" || value === null) {
    throw new LargeBackupError("バックアップの形式が正しくありません");
  }
  const data = value as Record<string, unknown>;
  const valid =
    data.version === 1 &&
    typeof data.fileUri === "string" &&
    isLargeEncoding(data.encoding) &&
    (data.source === null || isStamp(data.source)) &&
    // op の検査は webview から届く編集と同じ（型ガードを使い回す）
    isLargeMessageToExtension({ type: "large/applyOps", revision: 0, ops: data.ops });
  if (!valid) {
    throw new LargeBackupError("バックアップの形式が正しくありません");
  }
  return value as LargeBackupData;
}
