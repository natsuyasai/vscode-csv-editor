import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { RowOp } from "@shared/csv/ops";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react/pure";
import App from "./App";

// シナリオの各ステップは別のテストとして実行され、テストの間で vi.fn の呼び出し記録が消えるため、
// 送信したメッセージとマウント回数はただの配列とカウンタで記録する
const recorder = vi.hoisted(() => ({ sent: [] as unknown[], mountCount: 0 }));

vi.mock("./utilities/vscode", () => ({
  vscode: { postMessage: (message: unknown) => recorder.sent.push(message) },
}));

// EditableTableはApp連携の検証に必要な最小限のスタブに置き換える。
// 実際の hook と同じく、編集しない行は同じ参照のまま新しい配列を作る
vi.mock("./components/editable-table/EditableTable", async () => {
  const React = await import("react");
  return {
    EditableTable: ({
      csvArray,
      setCSVArray,
      onApply,
    }: {
      csvArray: string[][];
      setCSVArray: (csv: string[][]) => void;
      onApply: () => void;
    }) => {
      React.useEffect(() => {
        recorder.mountCount += 1;
      }, []);
      return (
        <div>
          <div data-testid="cells">{JSON.stringify(csvArray)}</div>
          <button onClick={() => setCSVArray([csvArray[0], ["1", "9"], ...csvArray.slice(2)])}>
            editRow1
          </button>
          <button onClick={() => setCSVArray([...csvArray, ["3", "3"]])}>appendRow</button>
          <button onClick={onApply}>apply</button>
        </div>
      );
    },
  };
});

const feature = await loadFeature("./App.incrementalSync.feature");

/** 送信済みメッセージ */
interface SentMessage {
  type: string;
  payload?: string;
  epoch?: number;
  ops?: RowOp[];
}

function sent(): SentMessage[] {
  return recorder.sent as SentMessage[];
}

function receiveUpdate(epoch: number, payload: string) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: "update", payload, epoch } }));
  });
}

function elapseDebounce() {
  act(() => {
    vi.advanceTimersByTime(1000);
  });
}

describeFeature(feature, ({ Background, Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let mountCount = 0;

  BeforeEachScenario(() => {
    vi.useFakeTimers();
    recorder.sent = [];
    recorder.mountCount = 0;
  });

  AfterEachScenario(() => {
    cleanup();
    vi.useRealTimers();
  });

  Background(({ Given }) => {
    Given('拡張機能からエポック 5 で "a,b\\n1,1\\n2,2\\n" の全文を受け取っている', () => {
      render(<App />);
      receiveUpdate(5, "a,b\n1,1\n2,2\n");
      recorder.sent = [];
    });
  });

  Scenario("編集すると差分の操作が送られる", ({ When, And, Then }) => {
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
    });
    And("デバウンスの時間が経過する", () => {
      expect(sent()).toHaveLength(0);
      elapseDebounce();
    });
    Then("拡張機能へ1回だけ操作が送られる", () => {
      expect(sent()).toHaveLength(1);
      expect(sent()[0].type).toBe("applyOps");
    });
    And('送られた操作は 1 行目から 1 行を [["1","9"]] に置き換える', () => {
      expect(sent()[0].ops).toEqual([
        { type: "replaceRows", start: 1, deleteCount: 1, rows: [["1", "9"]] },
      ]);
    });
  });

  Scenario("デバウンス中の複数編集は順序を保って1回で送られる", ({ When, And, Then }) => {
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
    });
    And('末尾に "3,3" の行を追加する', () => {
      fireEvent.click(screen.getByText("appendRow"));
    });
    And("デバウンスの時間が経過する", () => {
      elapseDebounce();
    });
    Then("拡張機能へ1回だけ操作が送られる", () => {
      expect(sent()).toHaveLength(1);
      expect(sent()[0].type).toBe("applyOps");
    });
    And("送られた操作は編集した順に 2 件である", () => {
      expect(sent()[0].ops).toEqual([
        { type: "replaceRows", start: 1, deleteCount: 1, rows: [["1", "9"]] },
        { type: "replaceRows", start: 3, deleteCount: 0, rows: [["3", "3"]] },
      ]);
    });
  });

  Scenario("送る操作には最後に受け取ったエポックが付く", ({ Given, When, And, Then }) => {
    Given('拡張機能からエポック 6 で "x,y\\n0,0\\n" の全文を受け取っている', () => {
      receiveUpdate(6, "x,y\n0,0\n");
    });
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
    });
    And("デバウンスの時間が経過する", () => {
      elapseDebounce();
    });
    Then("送られた操作のエポックは 6 である", () => {
      expect(sent()).toHaveLength(1);
      expect(sent()[0]).toMatchObject({ type: "applyOps", epoch: 6 });
    });
  });

  Scenario("保存時は保留中の操作を送ってから保存する", ({ When, And, Then }) => {
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
    });
    And("保存する", () => {
      fireEvent.click(screen.getByText("apply"));
    });
    Then("拡張機能へ操作、内容を持たない保存の順に送られる", () => {
      expect(sent()).toEqual([
        {
          type: "applyOps",
          epoch: 5,
          ops: [{ type: "replaceRows", start: 1, deleteCount: 1, rows: [["1", "9"]] }],
        },
        { type: "save" },
      ]);
    });
    When("デバウンスの時間が経過する", () => {
      elapseDebounce();
    });
    Then("拡張機能へそれ以上何も送られない", () => {
      expect(sent()).toHaveLength(2);
    });
  });

  Scenario("編集がなければ保存だけが送られる", ({ When, Then }) => {
    When("保存する", () => {
      fireEvent.click(screen.getByText("apply"));
    });
    Then("拡張機能へ内容を持たない保存だけが送られる", () => {
      expect(sent()).toEqual([{ type: "save" }]);
    });
  });

  Scenario("拡張機能から全文が届くと保留中の操作は捨てられる", ({ When, And, Then }) => {
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
    });
    And('拡張機能からエポック 6 で "x,y\\n0,0\\n" の全文を受け取る', () => {
      receiveUpdate(6, "x,y\n0,0\n");
    });
    And("デバウンスの時間が経過する", () => {
      elapseDebounce();
    });
    Then("拡張機能へ何も送られない", () => {
      expect(sent()).toHaveLength(0);
    });
    And('表は "x,y\\n0,0\\n" の内容になる', () => {
      expect(screen.getByTestId("cells").textContent).toBe(
        JSON.stringify([
          ["x", "y"],
          ["0", "0"],
        ])
      );
    });
  });

  Scenario("自分の編集と同じ内容の全文が届いても表を作り直す", ({ When, And, Then }) => {
    When('2行目を "1,9" に編集する', () => {
      fireEvent.click(screen.getByText("editRow1"));
      mountCount = recorder.mountCount;
    });
    And('拡張機能からエポック 6 で "a,b\\n1,9\\n2,2\\n" の全文を受け取る', () => {
      receiveUpdate(6, "a,b\n1,9\n2,2\n");
    });
    Then("表は作り直される", () => {
      expect(recorder.mountCount).toBe(mountCount + 1);
    });
  });
});
