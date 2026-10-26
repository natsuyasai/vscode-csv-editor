/* global setTimeout, clearTimeout */
import * as path from "path";
import * as vscode from "vscode";

import { logWarning } from "../util/logger";

import type { LargeCsvDocument } from "./largeCsvDocument";
import type { Picker } from "./picker";

/** 未保存の変更があるときに外部変更で選ぶもの */
export type ExternalChangeChoice = "reload" | "keep";

/** 監視に使う FileSystemWatcher の機能 */
export type FileWatcherLike = Pick<
  vscode.FileSystemWatcher,
  "onDidChange" | "onDidCreate" | "onDidDelete" | "dispose"
>;

export interface LargeFileWatcherDeps {
  picker: Picker;
  warn: (message: string) => void;
  error: (message: string) => void;
  /** 未保存の変更を破棄して読み直す（VSCode の revert を実行し、タブの未保存の状態も戻す） */
  revertInEditor: (document: LargeCsvDocument) => Promise<void>;
  /** 続けて届くイベントをまとめる待ち時間 */
  delayMs: number;
  /** 監視を作る（既定は vscode.workspace.createFileSystemWatcher） */
  createWatcher?: (file: vscode.Uri) => FileWatcherLike;
}

/** glob の特殊文字を、その文字だけに当たる文字クラスにする */
const escapeGlob = (name: string) => name.replace(/[[\]{}*?]/g, (c) => `[${c}]`);

const defaultCreateWatcher = (file: vscode.Uri): FileWatcherLike =>
  vscode.workspace.createFileSystemWatcher(
    // ワークスペースの外のファイルも監視できるよう、フォルダの URI を基点にする
    new vscode.RelativePattern(
      vscode.Uri.file(path.dirname(file.fsPath)),
      escapeGlob(path.basename(file.fsPath))
    )
  );

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 大容量モードで開いたファイルの外部変更を監視する（文書ごと）。
 *
 * - FileSystemWatcher のイベントはまとめて（delayMs）から、文書の checkFile でファイルの状態（mtime・size）を
 *   最後に読み込み・保存したときと比べる。自分の保存（一時ファイル → rename）は保存後の状態を記録しているので
 *   変わっていない扱いになり、反応しない。保存の途中に届いたイベントは保存が終わってから調べる（文書の serial）
 * - 変わっていて未保存の変更がなければ、選択を求めずに読み直す
 * - 未保存の変更があれば選ばせる。「再読み込み」は VSCode の revert で変更を破棄して読み直す（タブの未保存の
 *   状態も戻る）。「保持」（Esc も同じ）は、変わった後のファイルを読み直して自分の変更を当て直す
 *   （行の番号がずれると別の行に当たる。当て直せなければ変更を破棄する）
 * - 削除されたら一度だけ警告する（ファイルが戻ってくるまで繰り返さない）
 * - 選択を求めている間・読み直している間に届いたイベントは、終わってからもう一度調べる
 */
export class LargeFileWatcher implements vscode.Disposable {
  private watcher: FileWatcherLike | undefined;
  private subscriptions: vscode.Disposable[] = [];
  private watching: string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private again = false;
  private deletedWarned = false;
  private disposed = false;

  constructor(
    private readonly document: LargeCsvDocument,
    private readonly deps: LargeFileWatcherDeps
  ) {
    this.rewatch();
  }

  /** 監視するファイルを文書の fileUri に合わせる（別名で保存した後に呼ぶ） */
  rewatch(): void {
    const file = this.document.fileUri;
    if (this.disposed || this.watching === file.toString()) {
      return;
    }
    this.stopWatching();
    this.watching = file.toString();
    const watcher = (this.deps.createWatcher ?? defaultCreateWatcher)(file);
    this.watcher = watcher;
    const schedule = () => {
      this.schedule();
    };
    this.subscriptions = [
      watcher.onDidChange(schedule),
      watcher.onDidCreate(schedule),
      watcher.onDidDelete(schedule),
    ];
    this.deletedWarned = false;
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.stopWatching();
  }

  private stopWatching(): void {
    for (const subscription of this.subscriptions) {
      subscription.dispose();
    }
    this.subscriptions = [];
    this.watcher?.dispose();
    this.watcher = undefined;
  }

  private schedule(): void {
    if (this.disposed) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.run();
    }, this.deps.delayMs);
  }

  private async run(): Promise<void> {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    try {
      do {
        await this.handle();
      } while (this.takeAgain() && !this.stopped());
    } catch (error) {
      logWarning(`外部変更の処理に失敗しました: ${errorMessage(error)}`);
    } finally {
      this.running = false;
    }
  }

  /** もう一度調べる必要があるか（取り出したら消す） */
  private takeAgain(): boolean {
    const again = this.again;
    this.again = false;
    return again;
  }

  /** 監視をやめたか・文書が閉じられたか（await の後に毎回確かめる） */
  private stopped(): boolean {
    return this.disposed || this.document.isClosed;
  }

  private async handle(): Promise<void> {
    const document = this.document;
    if (this.stopped()) {
      return;
    }
    const name = path.basename(document.fileUri.fsPath);
    const state = await document.checkFile();
    if (state === "deleted") {
      if (!this.deletedWarned) {
        this.deletedWarned = true;
        this.deps.warn(
          `${name} が外部で削除されました。表示していない行は読めなくなることがあります（編集内容は残っています）`
        );
      }
      return;
    }
    this.deletedWarned = false;
    if (state === "unchanged") {
      return;
    }
    if (!document.isDirty) {
      await document.reload(false);
      return;
    }
    const choice = await this.deps.picker.pick<ExternalChangeChoice>(
      [
        {
          label: "ファイルを再読み込み（変更を破棄）",
          description: "未保存の変更を捨てて、変更後のファイルを表示します",
          value: "reload",
        },
        {
          label: "自分の変更を保持",
          description:
            "変更後のファイルを読み直し、未保存の変更を当て直します（次の保存で上書きします）",
          detail: "行の番号がずれていると、変更が別の行に当たることがあります",
          value: "keep",
        },
      ],
      {
        title: `${name} が外部で変更されました`,
        placeHolder: "未保存の変更があります。どうするか選んでください（Esc で変更を保持します）",
      }
    );
    if (this.stopped()) {
      return;
    }
    if (choice === "reload") {
      await this.deps.revertInEditor(document);
      // revert できなかった（タブが見つからないなど）ときも、ファイルは読み直す
      if (!this.stopped() && (await document.checkFile()) === "changed") {
        await document.reload(false);
      }
      return;
    }
    const result = await document.reload(true);
    if (result.error !== undefined && !this.stopped()) {
      this.deps.error(
        `${name}: 変更後のファイルに未保存の変更を当て直せなかったため、変更を破棄しました（${errorMessage(result.error)}）`
      );
      // 文書は変更の無い状態なので、タブの未保存の状態も戻す
      await this.deps.revertInEditor(document);
    }
  }
}
