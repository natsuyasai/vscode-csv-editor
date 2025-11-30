import { RefObject, useEffect, useRef } from "react";

type EventTarget = HTMLElement | Document | Window | null;
type EventTargetRef = RefObject<HTMLElement | null>;

interface UseEventListenerOptions {
  enabled?: boolean;
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  element: EventTarget | EventTargetRef,
  options?: UseEventListenerOptions
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  element: EventTarget | EventTargetRef,
  options?: UseEventListenerOptions
): void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: EventTarget | EventTargetRef,
  options?: UseEventListenerOptions
): void;

export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element: EventTarget | EventTargetRef,
  options: UseEventListenerOptions = {}
): void {
  const { enabled = true, capture, passive, once } = options;

  // handlerの参照を保持して、依存配列の変更を避ける
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 要素を取得（RefObjectまたは直接の要素）
    const targetElement = element && "current" in element ? element.current : element;

    if (!targetElement) {
      return;
    }

    // イベントハンドラーをラップして、savedHandlerから実行
    const eventListener = (event: Event) => {
      savedHandler.current(event);
    };

    // AddEventListenerOptions を構築
    const listenerOptions: AddEventListenerOptions | boolean | undefined =
      capture !== undefined || passive !== undefined || once !== undefined
        ? { capture, passive, once }
        : undefined;

    targetElement.addEventListener(eventName, eventListener, listenerOptions);

    return () => {
      targetElement.removeEventListener(eventName, eventListener, listenerOptions);
    };
  }, [eventName, element, enabled, capture, passive, once, handler]);
}
