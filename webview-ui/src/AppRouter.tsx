import { isLargeMessageToWebview } from "@message/largeMessages";
import { isMessageToWebview, type ThemeKind } from "@message/messageTypeToWebview";
import { useCallback, useState } from "react";
import App from "./App";
import { useEventListener } from "./hooks/useEventListener";
import { LargeApp, type LargeInitMessage } from "./large/LargeApp/LargeApp";

type Mode = { kind: "pending" } | { kind: "normal" } | { kind: "large"; init: LargeInitMessage };

/**
 * 最初に届いたメッセージで通常モード / 大容量モードを決めるルート。
 * - 起動直後は通常モードの App を描画する（App は従来どおり起動時に `init` を送る）
 * - 最初に `init` / `update` が届いたら通常モードに確定し、以後は切り替えない
 * - 最初に `large/init` が届いたら大容量モード（LargeApp）に切り替える。App はアンマウントされ、
 *   そのリスナーとショートカットも外れる
 * - `updateTheme` ではモードを決めない（先に届いたテーマは LargeApp へ引き継ぐ）
 *
 * 大容量モードの provider は、webview から `init` を受けたら `large/init`（と `updateTheme`）を返す。
 */
export default function AppRouter() {
  const [mode, setMode] = useState<Mode>({ kind: "pending" });
  const [theme, setTheme] = useState<ThemeKind>("light");

  const handleMessage = useCallback((event: MessageEvent<unknown>) => {
    const data = event.data;
    if (isMessageToWebview(data)) {
      if (data.type === "updateTheme") {
        setTheme(data.payload as ThemeKind);
      } else {
        setMode((current) => (current.kind === "pending" ? { kind: "normal" } : current));
      }
      return;
    }
    if (isLargeMessageToWebview(data) && data.type === "large/init") {
      setMode((current) => (current.kind === "pending" ? { kind: "large", init: data } : current));
    }
  }, []);

  useEventListener("message", handleMessage, window);

  if (mode.kind === "large") {
    return <LargeApp init={mode.init} theme={theme} />;
  }
  return <App />;
}
