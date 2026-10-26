import type { LargeMessageToWebview } from "@message/largeMessages";
import type { ThemeKind } from "@message/messageTypeToWebview";
import { useCallback, useEffect, useState } from "react";
import { LargeModeBanner } from "../LargeModeBanner/LargeModeBanner";
import { LargeTable } from "../LargeTable/LargeTable";
import { RemoteRowSource } from "../rowSource/RemoteRowSource";
import styles from "./LargeApp.module.scss";
import type { LargeMessageHub } from "./largeMessageHub";

export type LargeInitMessage = Extract<LargeMessageToWebview, { type: "large/init" }>;

export interface LargeAppProps {
  /** 大容量モードに切り替えるきっかけになった最初の `large/init` */
  init: LargeInitMessage;
  theme: ThemeKind;
  /** AppRouter が検証済みのメッセージを渡す中継（切り替え直後に届いたものもためてある） */
  messages: LargeMessageHub;
}

/** `large/progress`（kind: index）の進捗を、バナーに渡す値（完了なら null）にする */
const toIndexingRatio = (ratio: number): number | null => (ratio >= 1 ? null : ratio);

/**
 * 大容量モード（`csv-editor.largeEditor`）の webview のルート（2-1 では閲覧のみ）。
 * - 行は RemoteRowSource で拡張機能から表示範囲の分だけ取得する
 * - キーボードショートカットは登録しない。特に Ctrl+Z / Ctrl+Y は処理も preventDefault /
 *   stopPropagation もせず、VSCode の Undo/Redo に委ねる（スパイク S1 の決定）
 */
export function LargeApp({ init, theme, messages }: LargeAppProps) {
  const [error, setError] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState(init.restrictions);
  const [encoding, setEncoding] = useState(init.encoding);
  const [indexingRatio, setIndexingRatio] = useState<number | null>(init.indexing ? 0 : null);
  // StrictMode の二重実行でも1つだけ作られるよう、初期化関数で作る
  const [source] = useState(
    () =>
      new RemoteRowSource({
        header: init.header,
        rowCount: init.rowCount,
        onError: (message) => setError(message),
      })
  );

  const handleMessage = useCallback(
    (message: LargeMessageToWebview) => {
      switch (message.type) {
        case "large/init":
          // 開き直し（revert 等）。表のキャッシュは RemoteRowSource が破棄する
          setRestrictions(message.restrictions);
          setEncoding(message.encoding);
          setIndexingRatio(message.indexing ? 0 : null);
          setError(null);
          source.handleMessage(message);
          break;
        case "large/progress":
          if (message.kind === "index") {
            setIndexingRatio(toIndexingRatio(message.ratio));
          }
          break;
        default:
          source.handleMessage(message);
          break;
      }
    },
    [source]
  );

  // 受け手を付けた時点で、描画前に届いていたメッセージも順に処理される
  useEffect(() => messages.attach(handleMessage), [messages, handleMessage]);

  return (
    <div className={styles.root}>
      <LargeModeBanner
        restrictions={restrictions}
        encoding={encoding}
        indexingRatio={indexingRatio}
      />
      {error !== null && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <main className={styles.main}>
        <LargeTable source={source} theme={theme} />
      </main>
    </div>
  );
}
