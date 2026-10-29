import * as assert from "assert";
import { suite, teardown, test } from "mocha";
import * as vscode from "vscode";

import { LARGE_VIEW_TYPE } from "../large/largeCsvEditorProvider";
import {
  NORMAL_VIEW_TYPE,
  OpenRouter,
  registerOpenRouting,
  type NormalResolveDecision,
} from "../large/openRouting";
import { PendingEncodings } from "../large/pendingEncodings";
import { ScriptedPicker } from "./helpers/fakePicker";

/**
 * 入口の振り分け（OpenRouter）の分岐。VSCode の画面は使わず、ファイルサイズ・QuickPick・
 * openWith・タブを閉じる処理を差し替えて確かめる（しきい値は小さくしてある）。
 * 実際の VSCode 上の動きは largeOpen.test.ts で確かめる。
 */
const CONFIRM = 10;
const LIMIT = 50;

interface Opened {
  uri: string;
  viewType: string;
  column?: vscode.ViewColumn;
  /** 大容量モードで開いたときに provider が受け取る保留オプション */
  encoding?: string;
  /** 通常モードで開いたときに resolve の前の判定が返したもの */
  normalDecision?: "sync" | "async";
}

/** このテストで作った Picker（答えが選択肢に無くてキャンセル扱いになっていないかを teardown で確かめる） */
const createdPickers: ScriptedPicker[] = [];

function createRouter(sizes: Record<string, number>, ...answers: unknown[]) {
  const picker = new ScriptedPicker(...answers);
  createdPickers.push(picker);
  const pending = new PendingEncodings();
  const opened: Opened[] = [];
  const closed: vscode.Tab[] = [];
  const errors: string[] = [];
  const sizeOf = (uri: vscode.Uri) => sizes[uri.path.split("/").pop() ?? ""];
  const router: OpenRouter = new OpenRouter({
    picker,
    pending,
    statSize: (uri) => Promise.resolve(sizeOf(uri)),
    statSizeSync: sizeOf,
    openWith: (uri, viewType, column) => {
      const record: Opened = { uri: uri.toString(), viewType, column };
      if (viewType === LARGE_VIEW_TYPE) {
        record.encoding = pending.take(uri);
      }
      if (viewType === NORMAL_VIEW_TYPE) {
        record.normalDecision = router.beforeNormalResolve(uri) === undefined ? "sync" : "async";
      }
      opened.push(record);
      return Promise.resolve();
    },
    closeTab: (tab) => {
      closed.push(tab);
      return Promise.resolve();
    },
    showError: (message) => errors.push(message),
    confirmBytes: CONFIRM,
    normalLimitBytes: LIMIT,
  });
  return { router, picker, pending, opened, closed, errors };
}

/** 続けないと判定されたら、パネルを閉じた後の処理を実行する（provider の振る舞いの代わり） */
async function runAfter(decision: NormalResolveDecision): Promise<void> {
  if (!decision.proceed) {
    await decision.after?.();
  }
}

const fileUri = (name: string) => vscode.Uri.file(`/tmp/${name}`);

const customTab = (uri: vscode.Uri, viewType: string, viewColumn = vscode.ViewColumn.One) =>
  ({
    input: new vscode.TabInputCustom(uri, viewType),
    group: { viewColumn },
  }) as unknown as vscode.Tab;

suite("入口の振り分け（OpenRouter）", () => {
  teardown(() => {
    for (const picker of createdPickers.splice(0)) {
      assert.deepStrictEqual(picker.mismatches, [], "答えはすべて選択肢にある");
    }
  });

  suite("コマンドの対象のURI", () => {
    test("引数のURIを優先する", () => {
      const arg = fileUri("arg.csv");
      const active = new vscode.TabInputText(fileUri("active.csv"));
      assert.strictEqual(OpenRouter.targetUri(arg, active)?.toString(), arg.toString());
    });

    test("引数が無ければアクティブなタブのテキストエディタ・カスタムエディタのURIを使う", () => {
      const uri = fileUri("active.csv");
      assert.strictEqual(
        OpenRouter.targetUri(undefined, new vscode.TabInputText(uri))?.toString(),
        uri.toString()
      );
      assert.strictEqual(
        OpenRouter.targetUri(
          undefined,
          new vscode.TabInputCustom(uri, LARGE_VIEW_TYPE)
        )?.toString(),
        uri.toString()
      );
    });

    test("どちらも無ければエラーを表示して何も開かない", async () => {
      const { router, opened, errors } = createRouter({});
      await router.openEditorCommand(undefined, undefined);
      assert.strictEqual(opened.length, 0);
      assert.strictEqual(errors.length, 1);
    });
  });

  suite("コマンド", () => {
    test("しきい値未満は確認せずに通常モードで開く", async () => {
      const { router, picker, opened } = createRouter({ "a.csv": CONFIRM - 1 });
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.strictEqual(picker.calls.length, 0);
      assert.deepStrictEqual(
        opened.map((o) => [o.viewType, o.normalDecision]),
        [[NORMAL_VIEW_TYPE, "sync"]]
      );
    });

    test("サイズが取れないファイルは確認せずに通常モードで開く", async () => {
      const { router, picker, opened } = createRouter({});
      await router.openEditorCommand(fileUri("unknown.csv"), undefined);
      assert.strictEqual(picker.calls.length, 0);
      assert.strictEqual(opened[0].viewType, NORMAL_VIEW_TYPE);
    });

    test("しきい値以上は通常モード・大容量モード・テキスト・キャンセルを選ばせる", async () => {
      const { router, picker } = createRouter({ "a.csv": CONFIRM });
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.deepStrictEqual(picker.valuesOf(0), ["normal", "large", "text", "cancel"]);
    });

    test("通常モードの上限以上では通常モードを選択肢から除き、理由を示す", async () => {
      const { router, picker } = createRouter({ "a.csv": LIMIT });
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.deepStrictEqual(picker.valuesOf(0), ["large", "text", "cancel"]);
      assert.match(picker.calls[0].options.placeHolder ?? "", /通常モード/);
    });

    test("通常モードを選ぶと通常モードで開き、resolve では再び確認しない", async () => {
      const { router, picker, opened } = createRouter({ "a.csv": CONFIRM }, "normal");
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.strictEqual(picker.calls.length, 1);
      assert.deepStrictEqual(
        opened.map((o) => [o.viewType, o.normalDecision]),
        [[NORMAL_VIEW_TYPE, "sync"]]
      );
      assert.notStrictEqual(
        router.beforeNormalResolve(fileUri("a.csv")),
        undefined,
        "確認済みの印は1回で消える"
      );
    });

    test("大容量モードを選ぶと文字コードを選ばせ、保留オプションに入れて大容量モードで開く", async () => {
      const { router, picker, pending, opened } = createRouter(
        { "a.csv": CONFIRM },
        "large",
        "shift_jis"
      );
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.deepStrictEqual(picker.valuesOf(1), ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"]);
      assert.deepStrictEqual(
        opened.map((o) => [o.viewType, o.encoding]),
        [[LARGE_VIEW_TYPE, "shift_jis"]]
      );
      assert.strictEqual(pending.take(fileUri("a.csv")), undefined);
    });

    test("文字コードの選択をキャンセルすると開かない", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "large");
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.strictEqual(opened.length, 0);
    });

    test("テキストとして開くを選ぶと既定のテキストエディタで開く", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "text");
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.deepStrictEqual(
        opened.map((o) => o.viewType),
        ["default"]
      );
    });

    test("キャンセルを選ぶと開かない", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "cancel");
      await router.openEditorCommand(fileUri("a.csv"), undefined);
      assert.strictEqual(opened.length, 0);
    });
  });

  suite("通常モードのresolveの前の判定", () => {
    const decide = async (router: OpenRouter, name: string): Promise<NormalResolveDecision> => {
      const decision = router.beforeNormalResolve(fileUri(name));
      assert.ok(decision, "確認が必要");
      return decision;
    };

    test("しきい値未満は同期的にそのまま続ける", () => {
      const { router } = createRouter({ "a.csv": CONFIRM - 1 });
      assert.strictEqual(router.beforeNormalResolve(fileUri("a.csv")), undefined);
    });

    test("しきい値以上で通常モードを選ぶとそのまま続ける", async () => {
      const { router, picker } = createRouter({ "a.csv": CONFIRM }, "normal");
      const decision = await decide(router, "a.csv");
      assert.deepStrictEqual(decision, { proceed: true });
      assert.strictEqual(picker.calls.length, 1);
    });

    test("大容量モードを選ぶと、パネルを閉じた後に大容量モードで開く", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "large", "euc-jp");
      const decision = await decide(router, "a.csv");
      assert.strictEqual(decision.proceed, false);
      assert.strictEqual(opened.length, 0, "パネルを閉じる前には開かない");
      await runAfter(decision);
      assert.deepStrictEqual(
        opened.map((o) => [o.viewType, o.encoding]),
        [[LARGE_VIEW_TYPE, "euc-jp"]]
      );
    });

    test("テキストとして開くを選ぶと、パネルを閉じた後にテキストエディタで開く", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "text");
      const decision = await decide(router, "a.csv");
      assert.strictEqual(decision.proceed, false);
      await runAfter(decision);
      assert.deepStrictEqual(
        opened.map((o) => o.viewType),
        ["default"]
      );
    });

    test("キャンセルするとパネルを閉じて何も開かない", async () => {
      const { router, opened } = createRouter({ "a.csv": CONFIRM }, "cancel");
      const decision = await decide(router, "a.csv");
      assert.strictEqual(decision.proceed, false);
      await runAfter(decision);
      assert.strictEqual(opened.length, 0);
    });

    test("通常モードの上限以上はモードを尋ねずに文字コードを尋ね、大容量モードで開く", async () => {
      const { router, picker, opened } = createRouter({ "a.csv": LIMIT }, "utf-8");
      const decision = await decide(router, "a.csv");
      assert.strictEqual(decision.proceed, false);
      await runAfter(decision);
      assert.strictEqual(picker.calls.length, 1);
      assert.deepStrictEqual(picker.valuesOf(0), ["utf-8", "utf-8-bom", "shift_jis", "euc-jp"]);
      assert.deepStrictEqual(
        opened.map((o) => [o.viewType, o.encoding]),
        [[LARGE_VIEW_TYPE, "utf-8"]]
      );
    });
  });

  suite("通常モードで開かれた大きなファイルのタブ", () => {
    test("通常モードの上限以上のタブは閉じて、文字コードを尋ねて同じ列に大容量モードで開き直す", async () => {
      const uri = fileUri("big.csv");
      const { router, closed, opened } = createRouter({ "big.csv": LIMIT }, "utf-8-bom");
      const tab = customTab(uri, NORMAL_VIEW_TYPE, vscode.ViewColumn.Two);
      await router.handleTabs([tab]);
      assert.deepStrictEqual(closed, [tab]);
      assert.deepStrictEqual(opened, [
        {
          uri: uri.toString(),
          viewType: LARGE_VIEW_TYPE,
          column: vscode.ViewColumn.Two,
          encoding: "utf-8-bom",
        },
      ]);
    });

    test("上限未満のタブ・他のエディタのタブはそのままにする", async () => {
      const { router, closed, picker } = createRouter({ "small.csv": LIMIT - 1, "big.csv": LIMIT });
      await router.handleTabs([
        customTab(fileUri("small.csv"), NORMAL_VIEW_TYPE),
        customTab(fileUri("big.csv"), LARGE_VIEW_TYPE),
        { input: new vscode.TabInputText(fileUri("big.csv")) } as unknown as vscode.Tab,
      ]);
      assert.strictEqual(closed.length, 0);
      assert.strictEqual(picker.calls.length, 0);
    });

    test("文字コードの選択をキャンセルするとタブは閉じたまま開き直さない", async () => {
      const { router, closed, opened } = createRouter({ "big.csv": LIMIT });
      await router.handleTabs([customTab(fileUri("big.csv"), NORMAL_VIEW_TYPE)]);
      assert.strictEqual(closed.length, 1);
      assert.strictEqual(opened.length, 0);
    });

    test("同じファイルの振り分けが重なっても1回だけ行う", async () => {
      const uri = fileUri("big.csv");
      const { router, picker, opened } = createRouter({ "big.csv": LIMIT }, "utf-8", "utf-8");
      await Promise.all([
        router.handleTabs([customTab(uri, NORMAL_VIEW_TYPE)]),
        router.handleTabs([customTab(uri, NORMAL_VIEW_TYPE)]),
        (async () => {
          const decision = router.beforeNormalResolve(uri);
          if (decision) {
            await runAfter(await decision);
          }
        })(),
      ]);
      assert.strictEqual(picker.calls.length, 1);
      assert.strictEqual(opened.length, 1);
    });
  });

  suite("登録", () => {
    test("registerOpenRoutingが返すDisposableでコマンドの登録を解除できる", async () => {
      // 拡張機能が有効化済みでも衝突しないよう、コマンドの登録APIをスタブに差し替える
      const commandsApi = vscode.commands as {
        registerCommand: (
          command: string,
          callback: (...args: unknown[]) => unknown
        ) => vscode.Disposable;
      };
      const original = commandsApi.registerCommand;
      const registered: string[] = [];
      const disposed: string[] = [];
      let callback: ((...args: unknown[]) => unknown) | undefined;
      commandsApi.registerCommand = (command, handler) => {
        registered.push(command);
        callback = handler;
        return { dispose: () => disposed.push(command) };
      };
      try {
        const { router, opened } = createRouter({ "a.csv": 1 });
        const disposable = registerOpenRouting(router);
        assert.deepStrictEqual(registered, ["csv-editor.openEditor"]);

        await callback?.(fileUri("a.csv"));
        assert.deepStrictEqual(
          opened.map((o) => o.viewType),
          [NORMAL_VIEW_TYPE],
          "コマンドの引数のファイルを開く"
        );

        disposable.dispose();
        assert.deepStrictEqual(disposed, ["csv-editor.openEditor"]);
      } finally {
        commandsApi.registerCommand = original;
      }
    });
  });
});
