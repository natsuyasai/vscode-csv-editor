import type { LargeMessageToWebview } from "@message/largeMessages";
import { createLargeMessageHub } from "./largeMessageHub";

const progress = (ratio: number): LargeMessageToWebview => ({
  type: "large/progress",
  kind: "index",
  ratio,
});

describe("createLargeMessageHub", () => {
  test("受け手がいない間に届いたメッセージは、受け手が付いたときに順に渡す", () => {
    const hub = createLargeMessageHub();
    hub.dispatch(progress(0.1));
    hub.dispatch(progress(0.2));
    const received: LargeMessageToWebview[] = [];
    hub.attach((message) => received.push(message));
    expect(received).toEqual([progress(0.1), progress(0.2)]);
  });

  test("受け手が付いた後のメッセージはすぐに渡す", () => {
    const hub = createLargeMessageHub();
    const listener = vi.fn();
    hub.attach(listener);
    hub.dispatch(progress(0.5));
    expect(listener).toHaveBeenCalledWith(progress(0.5));
  });

  test("一度渡したメッセージは付け直しても再送しない（StrictMode の付け直し）", () => {
    const hub = createLargeMessageHub();
    hub.dispatch(progress(0.1));
    const first = vi.fn();
    const detach = hub.attach(first);
    detach();
    const second = vi.fn();
    hub.attach(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  test("外した後に届いたメッセージは次の受け手に渡す", () => {
    const hub = createLargeMessageHub();
    const first = vi.fn();
    const detach = hub.attach(first);
    detach();
    hub.dispatch(progress(0.3));
    const second = vi.fn();
    hub.attach(second);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(progress(0.3));
  });
});
