import type { LargeMessageToExtension, LargeMessageToWebview } from "@message/largeMessages";
import type { ThemeKind } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Search } from "../../components/header/Search";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { vscode } from "../../utilities/vscode";
import { LargeModeBanner } from "../LargeModeBanner/LargeModeBanner";
import { LargeQueryActions, LargeSnapshotNotice } from "../LargeQueryControls";
import type { CellPosition } from "../LargeTable/cellNavigation";
import { LargeTable } from "../LargeTable/LargeTable";
import { createHandleAllocator, createVscodeHandleStorage } from "../rowSource/handleAllocator";
import { RemoteRowSource } from "../rowSource/RemoteRowSource";
import styles from "./LargeApp.module.scss";
import type { LargeMessageHub } from "./largeMessageHub";
import {
  LargeQueryController,
  type QuerySnapshot,
  type SearchContext,
} from "./LargeQueryController";

export type LargeInitMessage = Extract<LargeMessageToWebview, { type: "large/init" }>;

export interface LargeAppProps {
  /** 大容量モードに切り替えるきっかけになった最初の `large/init` */
  init: LargeInitMessage;
  theme: ThemeKind;
  /** AppRouter が検証済みのメッセージを渡す中継（切り替え直後に届いたものもためてある） */
  messages: LargeMessageHub;
  /** 拡張機能へメッセージを送る（省略時は VSCode の postMessage。Story・テストで差し替える） */
  postMessage?: (message: LargeMessageToExtension) => void;
}

/** `large/progress`（kind: index）の進捗を、バナーに渡す値（完了なら null）にする */
const toIndexingRatio = (ratio: number): number | null => (ratio >= 1 ? null : ratio);

/**
 * 大容量モード（`csv-editor.largeEditor`）の webview のルート。
 * - 行は RemoteRowSource で拡張機能から表示範囲の分だけ取得する
 * - 編集は RemoteRowSource が `large/applyOps` で送り、同時に表示へ反映する。
 *   拡張機能はインデックス作成が終わってから編集を受け付けるため、作成中は表を編集できなくする
 * - 追加行の負のハンドルは webview の状態に保存した続きから採番する（webview を作り直しても重ならない）。
 *   `large/init` の nextHandle の方が小さければそこから採番する（webview の状態が失われても文書の追加行と重ならない）
 * - 検索・ソート・フィルタは拡張機能側で走査し、webview は LargeQueryController でジョブ（jobId・進捗・
 *   キャンセル・古い結果の無視）を管理する。ソート・フィルタの結果は適用した時点のスナップショットで、
 *   編集しても並べ直されない（注記と再適用ボタンを出す）。インデックス作成中は使えない
 * - キーボードショートカットは検索の Ctrl+F だけを登録する。特に Ctrl+Z / Ctrl+Y は処理も preventDefault /
 *   stopPropagation もせず、VSCode の Undo/Redo に委ねる（スパイク S1 の決定）。Ctrl+S も VSCode の保存に任せる
 */
export function LargeApp({ init, theme, messages, postMessage }: LargeAppProps) {
  const [error, setError] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState(init.restrictions);
  const [encoding, setEncoding] = useState(init.encoding);
  const [indexingRatio, setIndexingRatio] = useState<number | null>(init.indexing ? 0 : null);
  const [filterRowVisible, setFilterRowVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // StrictMode の二重実行でも1つだけ作られるよう、初期化関数で作る
  const [post] = useState(
    () => postMessage ?? ((message: LargeMessageToExtension) => vscode.postMessage(message))
  );
  const [controller] = useState(() => {
    const created = new LargeQueryController(post);
    if (init.query) {
      created.reset(init.query);
    }
    return created;
  });
  const query = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const selectedRef = useRef<CellPosition | null>(null);
  const [source] = useState(
    () =>
      new RemoteRowSource({
        postMessage: post,
        header: init.header,
        rowCount: init.rowCount,
        revision: init.revision,
        onError: (message) => setError(message),
      })
  );
  const [allocator] = useState(() => {
    const created = createHandleAllocator(createVscodeHandleStorage(vscode));
    if (init.nextHandle !== undefined) {
      created.advanceTo(init.nextHandle);
    }
    return created;
  });
  const [allocateHandle] = useState(() => () => allocator.next());

  const handleMessage = useCallback(
    (message: LargeMessageToWebview) => {
      switch (message.type) {
        case "large/init":
          // 開き直し（revert 等）。表のキャッシュは RemoteRowSource が破棄し、ソート・フィルタ・検索の状態は捨てる
          controller.reset(message.query);
          setRestrictions(message.restrictions);
          setEncoding(message.encoding);
          setIndexingRatio(message.indexing ? 0 : null);
          setError(null);
          if (message.nextHandle !== undefined) {
            allocator.advanceTo(message.nextHandle);
          }
          source.handleMessage(message);
          break;
        case "large/progress":
          if (message.kind === "index") {
            setIndexingRatio(toIndexingRatio(message.ratio));
          } else {
            controller.handleMessage(message);
          }
          break;
        case "large/searchResult":
          controller.handleMessage(message);
          break;
        case "large/invalidate":
          // 拡張機能が持つソート・フィルタの状態（query）が変わったときは、表示と注記を合わせる
          controller.handleMessage(message);
          source.handleMessage(message);
          break;
        case "large/error":
          // 実行中のジョブが取り消された・失敗したとき（保存の前など）の表示を戻し、メッセージも表示する
          controller.handleMessage(message);
          source.handleMessage(message);
          break;
        default:
          source.handleMessage(message);
          break;
      }
    },
    [source, allocator, controller]
  );

  const enabled = indexingRatio === null;
  useEffect(() => {
    controller.setEnabled(enabled);
    if (!enabled) {
      setSearchOpen(false);
    }
  }, [controller, enabled]);
  useEffect(() => () => controller.dispose(), [controller]);

  // 受け手を付けた時点で、描画前に届いていたメッセージも順に処理される
  useEffect(() => messages.attach(handleMessage), [messages, handleMessage]);

  // Ctrl+F で検索を開く（インデックス作成中は開かず、VSCode の標準の動作に任せる）
  const shortcuts = useMemo(
    () => [
      {
        key: "f",
        mod: true,
        preventDefault: true,
        condition: () => enabled,
        handler: () => setSearchOpen(true),
      },
    ],
    [enabled]
  );
  useKeyboardShortcuts({ shortcuts });

  const searchContext = (): SearchContext => ({
    rowCount: source.rowCount,
    selectedRow: selectedRef.current?.row ?? null,
  });
  const handleSelectionChange = useCallback((cell: CellPosition | null) => {
    selectedRef.current = cell;
  }, []);
  const tableQuery = {
    enabled,
    sort: query.sort,
    onSortToggle: (column: number) => controller.toggleSort(column),
    filterRowVisible,
    filterTexts: query.filterTexts,
    onFilterChange: (column: number, text: string) => controller.setFilterText(column, text),
  };
  // 実行中のジョブがソート・フィルタのときは、取り消さないよう検索を送れない
  const canSearch = enabled && (query.job === null || query.job.kind === "search");

  return (
    <div className={styles.root}>
      <LargeModeBanner
        restrictions={restrictions}
        encoding={encoding}
        indexingRatio={indexingRatio}
        actions={
          <LargeQueryActions
            enabled={enabled}
            filterRowVisible={filterRowVisible}
            onToggleFilterRow={() => setFilterRowVisible((visible) => !visible)}
            onOpenSearch={() => setSearchOpen(true)}
            job={query.job}
            onCancel={() => controller.cancel()}
          />
        }
        notice={
          query.snapshotNotice ? (
            <LargeSnapshotNotice
              disabled={!enabled || query.job !== null}
              onReapply={() => controller.reapply()}
            />
          ) : undefined
        }
      />
      {error !== null && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <main className={styles.main}>
        <LargeTable
          source={source}
          theme={theme}
          readOnly={indexingRatio !== null}
          allocateHandle={allocateHandle}
          query={tableQuery}
          jump={query.jump}
          onSelectionChange={handleSelectionChange}
        />
      </main>
      {searchOpen &&
        createPortal(
          <Search
            canNavigate={canSearch}
            statusText={searchStatusText(query, source.header)}
            machedCount={0}
            searchedSelectedItemIdx={0}
            onSearch={(text) => controller.submitSearch(text, searchContext())}
            onNext={() => controller.continueSearch("forward", searchContext())}
            onPrevious={() => controller.continueSearch("backward", searchContext())}
            onClose={() => setSearchOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}

/** 検索欄に出す状態（検索前は出さない） */
function searchStatusText(query: QuerySnapshot, header: string[]): string | undefined {
  switch (query.searchStatus) {
    case "searching":
      return "検索中...";
    case "notFound":
      return "見つかりません";
    case "found":
      return query.match
        ? `行 ${String(query.match.row + 1)}・列「${header[query.match.col] ?? ""}」`
        : undefined;
    case "idle":
      return undefined;
  }
}
