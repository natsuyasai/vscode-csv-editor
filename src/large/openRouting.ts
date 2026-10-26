import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { logWarning } from "../util/logger";

import { LARGE_VIEW_TYPE } from "./largeCsvEditorProvider";
import type { LargeEncoding } from "./largeEncoding";
import { askLargeEncoding, askOpenMode } from "./largePrompts";
import type { PendingEncodings } from "./pendingEncodings";
import type { Picker } from "./picker";

const MiB = 1024 * 1024;
/** これ以上のファイルは開く前にモードを確認する（バイト数） */
export const LARGE_CONFIRM_BYTES = 10 * MiB;
/**
 * これ以上のファイルは通常モードで開けない（バイト数）。
 * VSCode が拡張機能へ文書を同期する上限（デコード後の文字数で 50MiB）に合わせる。
 * UTF-8 / Shift_JIS / EUC-JP では「バイト数 ≥ 文字数」なので、これ未満なら必ず同期できる。
 */
export const NORMAL_MODE_LIMIT_BYTES = 50 * MiB;

/** 通常モードの viewType（package.json の customEditors と一致させる） */
export const NORMAL_VIEW_TYPE = "csv-editor.openEditor";
/** VSCode の既定のテキストエディタ */
const TEXT_VIEW_TYPE = "default";

/** コマンドで通常モードを選んでから、resolve で確認を省く期限 */
const CONFIRMED_NORMAL_TTL_MS = 30_000;

const OVER_LIMIT_REASON =
  "50MB 以上のファイルは通常モードでは開けないため、大容量モードで開きます。文字コードを選んでください";

const fileNameOf = (uri: vscode.Uri) => path.posix.basename(uri.path);

export interface OpenRouterDeps {
  picker: Picker;
  pending: PendingEncodings;
  /** ファイルのバイト数。取れなければ undefined */
  statSize(uri: vscode.Uri): Promise<number | undefined>;
  /** 同期版（通常モードの resolve の中で、小さいファイルを同期的に通すため） */
  statSizeSync(uri: vscode.Uri): number | undefined;
  openWith(uri: vscode.Uri, viewType: string, column?: vscode.ViewColumn): Promise<void>;
  closeTab(tab: vscode.Tab): Promise<void>;
  showError(message: string): void;
  /** しきい値（テスト用に小さくできる） */
  confirmBytes?: number;
  normalLimitBytes?: number;
}

/** 通常モードの resolve を続けるか。続けないときはパネルを閉じてから after を実行する */
export type NormalResolveDecision =
  { proceed: true } | { proceed: false; after?: () => Promise<void> };

/**
 * ファイルの大きさで、通常モード / 大容量モード / テキストエディタに振り分ける。
 * 入口は3つ: コマンド `csv-editor.openEditor`、通常モードの provider の resolve、
 * 通常モードで開かれたが resolve されない（50MB 超）タブの検出。
 */
export class OpenRouter {
  /** コマンドで「通常モード」を選んだ URI（直後の resolve では確認しない）→ 期限 */
  private readonly confirmedNormal = new Map<string, number>();
  /** 大容量モードへ開き直している URI（resolve とタブの検出で二重に振り分けない） */
  private readonly rerouting = new Set<string>();

  constructor(readonly deps: OpenRouterDeps) {}

  /** コマンドの対象: 引数の URI → アクティブなタブの input の URI（`activeTextEditor` は 50MB 超では無い） */
  static targetUri(arg: unknown, activeTabInput: unknown): vscode.Uri | undefined {
    if (arg instanceof vscode.Uri) {
      return arg;
    }
    if (
      activeTabInput instanceof vscode.TabInputText ||
      activeTabInput instanceof vscode.TabInputCustom
    ) {
      return activeTabInput.uri;
    }
    return undefined;
  }

  /** コマンド `csv-editor.openEditor` */
  async openEditorCommand(arg: unknown, activeTabInput: unknown): Promise<void> {
    const uri = OpenRouter.targetUri(arg, activeTabInput);
    if (!uri) {
      this.deps.showError("csv-editor: No active editor.");
      return;
    }
    const size = await this.deps.statSize(uri);
    if (size === undefined || size < this.confirmBytes) {
      await this.deps.openWith(uri, NORMAL_VIEW_TYPE);
      return;
    }
    const mode = await askOpenMode(this.deps.picker, {
      fileName: fileNameOf(uri),
      sizeBytes: size,
      normalAllowed: size < this.normalLimitBytes,
    });
    switch (mode) {
      case "normal":
        this.confirmedNormal.set(uri.toString(), Date.now() + CONFIRMED_NORMAL_TTL_MS);
        await this.deps.openWith(uri, NORMAL_VIEW_TYPE);
        return;
      case "large":
        await this.askEncodingAndOpenLarge(uri);
        return;
      case "text":
        await this.deps.openWith(uri, TEXT_VIEW_TYPE);
        return;
      case undefined:
        return;
    }
  }

  /**
   * 通常モードの provider の resolve の前に呼ぶ。
   * そのまま続けてよい（確認が要らない）ときは同期的に undefined を返す。
   */
  beforeNormalResolve(uri: vscode.Uri): Promise<NormalResolveDecision> | undefined {
    const size = this.deps.statSizeSync(uri);
    if (size === undefined || size < this.confirmBytes) {
      return undefined;
    }
    const key = uri.toString();
    if (size >= this.normalLimitBytes) {
      // 50MiB 以上でも多バイト文字が多いと resolve される。タブの検出と同じく大容量モードで開き直す
      if (this.rerouting.has(key)) {
        return Promise.resolve({ proceed: false });
      }
      this.rerouting.add(key);
      return askLargeEncoding(this.deps.picker, fileNameOf(uri), OVER_LIMIT_REASON).then(
        (encoding): NormalResolveDecision => ({
          proceed: false,
          after: async () => {
            try {
              if (encoding !== undefined) {
                await this.openLarge(uri, encoding);
              }
            } finally {
              this.rerouting.delete(key);
            }
          },
        }),
        (error: unknown) => {
          this.rerouting.delete(key);
          throw error;
        }
      );
    }
    if (this.takeConfirmedNormal(key)) {
      return undefined;
    }
    return this.decideForNormalResolve(uri, size);
  }

  /** 開いた・変わったタブのうち、通常モードで開けない大きさのものを大容量モードで開き直す */
  async handleTabs(tabs: readonly vscode.Tab[]): Promise<void> {
    await Promise.all(tabs.map((tab) => this.handleTab(tab)));
  }

  private get confirmBytes(): number {
    return this.deps.confirmBytes ?? LARGE_CONFIRM_BYTES;
  }

  private get normalLimitBytes(): number {
    return this.deps.normalLimitBytes ?? NORMAL_MODE_LIMIT_BYTES;
  }

  private takeConfirmedNormal(key: string): boolean {
    const expiresAt = this.confirmedNormal.get(key);
    this.confirmedNormal.delete(key);
    return expiresAt !== undefined && expiresAt >= Date.now();
  }

  private async decideForNormalResolve(
    uri: vscode.Uri,
    size: number
  ): Promise<NormalResolveDecision> {
    const mode = await askOpenMode(this.deps.picker, {
      fileName: fileNameOf(uri),
      sizeBytes: size,
      normalAllowed: true,
    });
    switch (mode) {
      case "normal":
        return { proceed: true };
      case "large": {
        const encoding = await askLargeEncoding(this.deps.picker, fileNameOf(uri));
        if (encoding === undefined) {
          return { proceed: false };
        }
        return { proceed: false, after: () => this.openLarge(uri, encoding) };
      }
      case "text":
        return { proceed: false, after: () => this.deps.openWith(uri, TEXT_VIEW_TYPE) };
      case undefined:
        return { proceed: false };
    }
  }

  private async handleTab(tab: vscode.Tab): Promise<void> {
    const input = tab.input;
    if (!(input instanceof vscode.TabInputCustom) || input.viewType !== NORMAL_VIEW_TYPE) {
      return;
    }
    const key = input.uri.toString();
    if (this.rerouting.has(key)) {
      return;
    }
    const size = await this.deps.statSize(input.uri);
    // サイズを調べている間に resolve 側が振り分けを始めていたら任せる
    if (size === undefined || size < this.normalLimitBytes || this.rerouting.has(key)) {
      return;
    }
    this.rerouting.add(key);
    try {
      // 通常モードの provider は 50MB 超では resolve されず、壊れたタブが残るので閉じる（S1）
      await this.deps.closeTab(tab);
      const encoding = await askLargeEncoding(
        this.deps.picker,
        fileNameOf(input.uri),
        OVER_LIMIT_REASON
      );
      if (encoding !== undefined) {
        await this.openLarge(input.uri, encoding, tab.group.viewColumn);
      }
    } finally {
      this.rerouting.delete(key);
    }
  }

  private async askEncodingAndOpenLarge(uri: vscode.Uri): Promise<void> {
    const encoding = await askLargeEncoding(this.deps.picker, fileNameOf(uri));
    if (encoding !== undefined) {
      await this.openLarge(uri, encoding);
    }
  }

  /** 文字コードを保留オプションに入れて大容量モードで開く */
  private async openLarge(
    uri: vscode.Uri,
    encoding: LargeEncoding,
    column?: vscode.ViewColumn
  ): Promise<void> {
    this.deps.pending.set(uri, encoding);
    try {
      await this.deps.openWith(uri, LARGE_VIEW_TYPE, column);
    } finally {
      // すでに大容量モードで開いていて openCustomDocument が呼ばれなかったときに残さない
      this.deps.pending.delete(uri);
    }
  }
}

/** コマンド `csv-editor.openEditor`（viewType と同じ名前） */
export const OPEN_EDITOR_COMMAND = "csv-editor.openEditor";

/** VSCode の API で動く OpenRouter の依存 */
export function createOpenRouterDeps(picker: Picker, pending: PendingEncodings): OpenRouterDeps {
  return {
    picker,
    pending,
    statSize: async (uri) => {
      try {
        return (await vscode.workspace.fs.stat(uri)).size;
      } catch {
        return undefined;
      }
    },
    statSizeSync: (uri) => {
      if (uri.scheme !== "file") {
        return undefined;
      }
      try {
        return fs.statSync(uri.fsPath).size;
      } catch {
        return undefined;
      }
    },
    openWith: async (uri, viewType, column) => {
      await vscode.commands.executeCommand("vscode.openWith", uri, viewType, column);
    },
    closeTab: async (tab) => {
      try {
        await vscode.window.tabGroups.close(tab);
      } catch {
        // すでに閉じられている
      }
    },
    showError: (message) => {
      void vscode.window.showErrorMessage(message);
    },
  };
}

/**
 * コマンドと、通常モードで開かれた大きなファイルのタブの検出を登録する。
 * 起動より前にできたタブ（起動のきっかけになったタブ、ウィンドウの復元）に備えて、登録時に全タブも調べる。
 */
export function registerOpenRouting(router: OpenRouter): vscode.Disposable {
  const handleTabs = (tabs: readonly vscode.Tab[]) => {
    router.handleTabs(tabs).catch((error: unknown) => {
      logWarning(`大きなファイルの開き直しに失敗しました: ${String(error)}`);
    });
  };
  const command = vscode.commands.registerCommand(OPEN_EDITOR_COMMAND, (arg: unknown) =>
    router.openEditorCommand(arg, vscode.window.tabGroups.activeTabGroup.activeTab?.input)
  );
  const tabListener = vscode.window.tabGroups.onDidChangeTabs((event) => {
    handleTabs([...event.opened, ...event.changed]);
  });
  handleTabs(vscode.window.tabGroups.all.flatMap((group) => group.tabs));
  return vscode.Disposable.from(command, tabListener);
}
