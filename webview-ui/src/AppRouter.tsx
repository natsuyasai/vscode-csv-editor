import { isLargeMessageToWebview } from "@message/largeMessages";
import { isMessageToWebview, type ThemeKind } from "@message/messageTypeToWebview";
import { useCallback, useRef, useState } from "react";
import App from "./App";
import { useEventListener } from "./hooks/useEventListener";
import { LargeApp, type LargeInitMessage } from "./large/LargeApp/LargeApp";
import { createLargeMessageHub } from "./large/LargeApp/largeMessageHub";

type Mode = { kind: "pending" } | { kind: "normal" } | { kind: "large"; init: LargeInitMessage };

/**
 * 最初に届いたメッセージで通常モード / 大容量モードを決めるルート。
 * - 起動直後は通常モードの App を描画する（App は従来どおり起動時に `init` を送る）
 * - 最初に `init` / `update` が届いたら通常モードに確定し、以後は切り替えない
 * - 最初に `large/init` が届いたら大容量モード（LargeApp）に切り替える。App はアンマウントされ、
 *   そのリスナーとショートカットも外れる
 * - `updateTheme` ではモードを決めない（先に届いたテーマは LargeApp へ引き継ぐ）
 * - 大容量モードのメッセージはここで検証して中継（hub）に渡す。LargeApp が描画されて受け手を
 *   付けるまでに届いたもの（`large/init` 直後の進捗・無効化）は中継がためておく
 *
 * 大容量モードの provider は、webview から `init` を受けたら `large/init`（と `updateTheme`）を返す。
 */
export default function AppRouter() {
  const [mode, setMode] = useState<Mode>({ kind: "pending" });
  const [theme, setTheme] = useState<ThemeKind>("light");
  const [hub] = useState(createLargeMessageHub);
  // 続けて届くメッセージを再描画を待たずに振り分けるため、確定したモードを同期的に持つ
  const modeRef = useRef<Mode["kind"]>("pending");

  const handleMessage = useCallback(
    (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (isMessageToWebview(data)) {
        if (data.type === "updateTheme") {
          setTheme(data.payload as ThemeKind);
        } else if (modeRef.current === "pending") {
          modeRef.current = "normal";
          setMode({ kind: "normal" });
        }
        return;
      }
      if (!isLargeMessageToWebview(data)) {
        return;
      }
      if (modeRef.current === "pending" && data.type === "large/init") {
        modeRef.current = "large";
        setMode({ kind: "large", init: data });
      } else if (modeRef.current === "large") {
        hub.dispatch(data);
      }
    },
    [hub]
  );

  useEventListener("message", handleMessage, window);

  if (mode.kind === "large") {
    return <LargeApp init={mode.init} theme={theme} messages={hub} />;
  }
  return <App />;
}
