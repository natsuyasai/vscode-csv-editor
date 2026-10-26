import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { LargeMessageToExtension, LargeOp } from "@message/largeMessages";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react/pure";
import { RemoteRowSource } from "@/large/rowSource/RemoteRowSource";
import { LargeTable, type LargeTableClipboard } from "./LargeTable";

const feature = await loadFeature("./LargeTableClipboard.feature");

/** jsdom にはレイアウトが無いため、表示領域の高さを固定する（仮想スクロールの範囲計算に使われる） */
const VIEWPORT_HEIGHT = 600;
const HEADER = ["id", "name", "memo"];
/** 表示用のキャッシュの単位を小さくして、表示していない行が未取得になるようにする */
const PAGE_SIZE = 10;

const rowsOf = (n: number) =>
  Array.from({ length: n }, (_, i) => [String(i + 1), `n${String(i + 1)}`, `m${String(i + 1)}`]);

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  /** 拡張機能が持つ行（表示順。ハンドルは位置 + 1） */
  let data: string[][];
  let sent: LargeMessageToExtension[];
  let source: RemoteRowSource;
  let clipboardText: string;
  let clipboard: LargeTableClipboard;
  /** クリップボードを読み書きした回数（シナリオの各ステップは別のテストのため、モック関数の記録には頼らない） */
  let clipboardCalls: { read: number; write: number };
  let notices: (string | null)[];

  BeforeEachScenario(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: VIEWPORT_HEIGHT,
    });
    sent = [];
    notices = [];
    clipboardText = "";
    clipboardCalls = { read: 0, write: 0 };
    clipboard = {
      readText: () => {
        clipboardCalls.read += 1;
        return Promise.resolve(clipboardText);
      },
      writeText: (text: string) => {
        clipboardCalls.write += 1;
        clipboardText = text;
        return Promise.resolve();
      },
    };
  });

  AfterEachScenario(() => {
    cleanup();
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  /** 拡張機能の代わりに、webview が送ったメッセージに（非同期に）応答する */
  const respond = (message: LargeMessageToExtension) => {
    switch (message.type) {
      case "large/getRows": {
        const rows = data.slice(message.start, message.start + message.count);
        source.handleMessage({
          type: "large/rows",
          reqId: message.reqId,
          start: message.start,
          rows,
          handles: rows.map((_, i) => message.start + i + 1),
        });
        return;
      }
      case "large/getRange": {
        const { startRow, endRow, startCol, endCol } = message.range;
        source.handleMessage({
          type: "large/range",
          reqId: message.reqId,
          rows: data
            .slice(startRow, endRow)
            .map((row) =>
              Array.from({ length: endCol - startCol }, (_, i) => row[startCol + i] ?? "")
            ),
        });
        return;
      }
      case "large/applyOps":
        for (const op of message.ops) {
          if (op.type === "setRow") {
            data[op.handle - 1] = op.row;
          }
        }
        return;
      default:
        return;
    }
  };

  /** 表示している行を取得し終えるまで進める */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  };

  const show = async (rows: string[][], readOnly = false) => {
    data = rows.map((row) => [...row]);
    source = new RemoteRowSource({
      postMessage: (message) => {
        sent.push(message);
        queueMicrotask(() => respond(message));
      },
      header: HEADER,
      rowCount: data.length,
      pageSize: PAGE_SIZE,
      prefetchPages: 0,
    });
    render(
      <LargeTable
        source={source}
        theme="light"
        readOnly={readOnly}
        clipboard={clipboard}
        onNotice={(message) => notices.push(message)}
      />
    );
    await settle();
  };

  const sentOf = <T extends LargeMessageToExtension["type"]>(type: T, from = 0) =>
    sent
      .slice(from)
      .filter((m): m is Extract<LargeMessageToExtension, { type: T }> => m.type === type);
  const applied = (from = 0) => sentOf("large/applyOps", from);
  const scroller = () => screen.getByRole("region", { name: "大容量CSVの表" });
  const rowOf = (n: number) => {
    const row = screen.getByRole("rowheader", { name: String(n) }).closest("tr");
    if (!row) throw new Error(`${String(n)}行目が無い`);
    return row;
  };
  const cellOf = (n: number, column: string) =>
    within(rowOf(n)).getAllByRole("gridcell")[HEADER.indexOf(column)];
  const focused = () => document.activeElement ?? document.body;
  const press = (target: Element, key: string, init: KeyboardEventInit = {}) => {
    let notPrevented = true;
    act(() => {
      notPrevented = fireEvent.keyDown(target, { key, ...init });
    });
    return notPrevented;
  };
  const pressCtrl = async (key: "c" | "v", target: Element = focused()) => {
    const notPrevented = press(target, key, { ctrlKey: true });
    await settle();
    return notPrevented;
  };
  const clickCell = (element: Element, init: MouseEventInit = {}) => {
    act(() => {
      fireEvent.mouseDown(element, init);
      fireEvent.mouseUp(element, init);
      fireEvent.click(element, init);
    });
  };
  /** 選択されているセルを「行番号:列名」で返す（描画されている行のみ） */
  const selectedCells = () =>
    within(screen.getAllByRole("rowgroup")[1])
      .getAllByRole("gridcell")
      .filter((cell) => cell.getAttribute("aria-selected") === "true")
      .map((cell) => {
        const row = cell.closest("tr")?.querySelector("th")?.textContent ?? "";
        const col = HEADER[Array.from(cell.parentElement?.children ?? []).indexOf(cell) - 1];
        return `${row}:${col}`;
      });
  const cellsOf = (rows: number[], cols: string[]) =>
    rows.flatMap((row) => cols.map((col) => `${String(row)}:${col}`));
  /** jsdom の scrollTop は保持されないため、値を保持する scrollTop を付けてスクロールする */
  const scrollTo = (top: number) => {
    const element = scroller();
    Object.defineProperty(element, "scrollTop", {
      configurable: true,
      get: () => top,
      set: () => {},
    });
    act(() => {
      fireEvent.scroll(element);
    });
  };

  Scenario("ドラッグで矩形の範囲を選択できる", ({ Given, When, Then }) => {
    Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
    When("2行目の「id」列のセルから3行目の「name」列のセルまでドラッグする", () => {
      act(() => {
        fireEvent.mouseDown(cellOf(2, "id"));
        fireEvent.mouseEnter(cellOf(2, "name"));
        fireEvent.mouseEnter(cellOf(3, "name"));
        fireEvent.mouseUp(cellOf(3, "name"));
      });
      // ドラッグを終えた後のマウスの移動では範囲は変わらない
      act(() => {
        fireEvent.mouseUp(document);
        fireEvent.mouseEnter(cellOf(4, "memo"));
      });
    });
    Then("2行目から3行目の「id」列から「name」列までのセルが選択される", () => {
      expect(selectedCells()).toEqual(cellsOf([2, 3], ["id", "name"]));
    });
  });

  Scenario("Shift+クリックで起点から矩形の範囲を選択できる", ({ Given, When, Then, And }) => {
    Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
    When("1行目の「name」列のセルをクリックする", () => {
      clickCell(cellOf(1, "name"));
    });
    And("3行目の「memo」列のセルを Shift を押しながらクリックする", () => {
      clickCell(cellOf(3, "memo"), { shiftKey: true });
    });
    Then("1行目から3行目の「name」列から「memo」列までのセルが選択される", () => {
      expect(selectedCells()).toEqual(cellsOf([1, 2, 3], ["name", "memo"]));
    });
  });

  Scenario(
    "Shift+矢印キーで範囲を広げ、矢印キーだけで動かすと1つのセルの選択に戻る",
    ({ Given, When, Then, And }) => {
      Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
      When("2行目の「id」列のセルをクリックする", () => {
        clickCell(cellOf(2, "id"));
      });
      And("Shift+下矢印キーと Shift+右矢印キーを押す", () => {
        expect(press(focused(), "ArrowDown", { shiftKey: true })).toBe(false);
        expect(press(focused(), "ArrowRight", { shiftKey: true })).toBe(false);
      });
      Then("2行目から3行目の「id」列から「name」列までのセルが選択される", () => {
        expect(selectedCells()).toEqual(cellsOf([2, 3], ["id", "name"]));
        expect(cellOf(3, "name")).toHaveFocus();
      });
      When("下矢印キーを押す", () => {
        press(focused(), "ArrowDown");
      });
      Then("4行目の「name」列のセルだけが選択される", () => {
        expect(selectedCells()).toEqual(["4:name"]);
      });
    }
  );

  Scenario("選択した範囲を Ctrl+C で TSV としてコピーする", ({ Given, When, Then, And }) => {
    Given("引用符・改行・タブを含むセルがある大容量ファイルを表示している", () =>
      show([
        ['a"b', "line1\nline2", "x\ty"],
        ["2", "plain", ""],
        ["3", "n3", "m3"],
      ])
    );
    When(
      "1行目の「id」列のセルから2行目の「memo」列のセルまでを選択して Ctrl+C を押す",
      async () => {
        clickCell(cellOf(1, "id"));
        clickCell(cellOf(2, "memo"), { shiftKey: true });
        expect(await pressCtrl("c")).toBe(false);
      }
    );
    Then("表示順の位置で1行目から2行目、「id」列から「memo」列までの範囲が要求される", () => {
      expect(sentOf("large/getRange").map((m) => m.range)).toEqual([
        { startRow: 0, endRow: 2, startCol: 0, endCol: 3 },
      ]);
    });
    And("クリップボードに通常モードと同じ形式の TSV が書き込まれる", () => {
      expect(notices).toEqual([null]);
      expect(clipboardCalls.write).toBe(1);
      expect(clipboardText).toBe('"a""b"\t"line1\nline2"\t"x\ty"\n2\tplain\t');
    });
  });

  Scenario("10万セルを超える範囲はコピーできず、メッセージが出る", ({ Given, When, Then, And }) => {
    Given("6万行の大容量ファイルを表示している", () => show(rowsOf(60_000)));
    When(
      "1行目の「id」列のセルから末尾の行の「name」列のセルまでを選択して Ctrl+C を押す",
      async () => {
        clickCell(cellOf(1, "id"));
        scrollTo(60_000 * 40);
        await settle();
        clickCell(cellOf(60_000, "name"), { shiftKey: true });
        await pressCtrl("c");
      }
    );
    Then("10万セルまでしかコピーできないことが知らされる", () => {
      expect(notices.at(-1)).toMatch(/10万セル/);
      expect(notices.at(-1)).toMatch(/120,000/);
    });
    And("範囲は要求されず、クリップボードも変わらない", () => {
      expect(sentOf("large/getRange")).toEqual([]);
      expect(clipboardCalls.write).toBe(0);
    });
  });

  Scenario(
    "Ctrl+V で選択の左上から貼り付け、1回の編集として送られる",
    ({ Given, When, Then, And }) => {
      Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
      And("クリップボードに2行2列の TSV がある", () => {
        clipboardText = 'A\tB\r\nC\t"D\nE"\r\n';
      });
      When(
        "3行目の「memo」列のセルから2行目の「name」列のセルまでを選択して Ctrl+V を押す",
        async () => {
          clickCell(cellOf(3, "memo"));
          clickCell(cellOf(2, "name"), { shiftKey: true });
          expect(await pressCtrl("v")).toBe(false);
        }
      );
      Then("2行目と3行目の「name」列と「memo」列を置き換える操作が1回の編集として送られる", () => {
        expect(applied()).toHaveLength(1);
        expect(applied()[0].ops).toEqual([
          { type: "setRow", handle: 2, row: ["2", "A", "B"] },
          { type: "setRow", handle: 3, row: ["3", "C", "D\nE"] },
        ] satisfies LargeOp[]);
      });
      And("貼り付けた内容が表示される", () => {
        expect(cellOf(2, "name")).toHaveTextContent("A");
        expect(cellOf(3, "memo")).toHaveTextContent("D E");
      });
      And("貼り付けた範囲が選択される", () => {
        expect(selectedCells()).toEqual(cellsOf([2, 3], ["name", "memo"]));
      });
    }
  );

  Scenario("未取得の行にも貼り付けられる", ({ Given, When, Then, And }) => {
    let before = 0;
    Given("100行の大容量ファイルを、表示している行だけ取得した状態で表示している", async () => {
      await show(rowsOf(100));
      expect(source.getRow(0)).toBeDefined();
      expect(source.getRow(39)).toBeUndefined();
    });
    And("クリップボードに40行1列の TSV がある", () => {
      clipboardText = Array.from({ length: 40 }, (_, i) => `p${String(i + 1)}`).join("\n");
    });
    When("1行目の「name」列のセルを選択して Ctrl+V を押す", async () => {
      clickCell(cellOf(1, "name"));
      before = sent.length;
      await pressCtrl("v");
    });
    Then("未取得の行が拡張機能から取り寄せられる", () => {
      expect(sentOf("large/getRows", before).map((m) => [m.start, m.count])).toContainEqual([
        0, 40,
      ]);
    });
    And("40行の「name」列を置き換える操作が1回の編集として送られ、ほかの列は元の内容のまま", () => {
      expect(applied(before)).toHaveLength(1);
      expect(applied(before)[0].ops).toEqual(
        Array.from({ length: 40 }, (_, i) => ({
          type: "setRow",
          handle: i + 1,
          row: [String(i + 1), `p${String(i + 1)}`, `m${String(i + 1)}`],
        }))
      );
    });
  });

  Scenario("末尾の行と右端の列を超える分は切り詰めて貼り付ける", ({ Given, When, Then, And }) => {
    Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
    And("クリップボードに3行3列の TSV がある", () => {
      clipboardText = "a\tb\tc\nd\te\tf\ng\th\ti";
    });
    When("4行目の「name」列のセルを選択して Ctrl+V を押す", async () => {
      clickCell(cellOf(4, "name"));
      await pressCtrl("v");
    });
    Then(
      "4行目と5行目の「name」列と「memo」列だけを置き換える操作が送られ、行は追加されない",
      () => {
        expect(applied()).toHaveLength(1);
        expect(applied()[0].ops).toEqual([
          { type: "setRow", handle: 4, row: ["4", "a", "b"] },
          { type: "setRow", handle: 5, row: ["5", "d", "e"] },
        ]);
        expect(source.rowCount).toBe(5);
      }
    );
  });

  Scenario(
    "10万セルを超える貼り付けはメッセージが出て何も送られない",
    ({ Given, When, Then, And }) => {
      let before = 0;
      Given("6万行の大容量ファイルを、表示している行だけ取得した状態で表示している", () =>
        show(rowsOf(60_000))
      );
      And("クリップボードに6万行2列の TSV がある", () => {
        clipboardText = Array.from({ length: 60_000 }, () => "x\ty").join("\n");
      });
      When("1行目の「id」列のセルを選択して Ctrl+V を押す", async () => {
        clickCell(cellOf(1, "id"));
        before = sent.length;
        await pressCtrl("v");
      });
      Then("10万セルまでしか貼り付けられないことが知らされる", () => {
        expect(notices.at(-1)).toMatch(/10万セル/);
        expect(notices.at(-1)).toMatch(/120,000/);
      });
      And("行の取り寄せも編集の操作も送られない", () => {
        expect(sent.slice(before)).toEqual([]);
      });
    }
  );

  Scenario("セルの編集中は Ctrl+C と Ctrl+V を表で処理しない", ({ Given, When, Then, And }) => {
    let results: boolean[] = [];
    Given("5行の大容量ファイルを編集できる状態で表示している", () => show(rowsOf(5)));
    When("2行目の「name」列のセルをダブルクリックして編集を始める", () => {
      fireEvent.doubleClick(cellOf(2, "name"));
    });
    And("編集欄で Ctrl+C と Ctrl+V を押す", async () => {
      const editor = screen.getByRole("textbox", { name: "セルの編集" });
      results = [await pressCtrl("c", editor), await pressCtrl("v", editor)];
    });
    Then("既定の動作は止められず、範囲の要求もクリップボードの読み書きもされない", () => {
      expect(results).toEqual([true, true]);
      expect(sentOf("large/getRange")).toEqual([]);
      expect(clipboardCalls).toEqual({ read: 0, write: 0 });
    });
  });

  Scenario("インデックス作成中はコピーできるが貼り付けはできない", ({ Given, When, Then, And }) => {
    Given("5行の大容量ファイルを読み取り専用で表示している", () => show(rowsOf(5), true));
    And("クリップボードに2行2列の TSV がある", () => {
      clipboardText = "A\tB\nC\tD";
    });
    When(
      "1行目の「id」列のセルから2行目の「name」列のセルまでを選択して Ctrl+C を押す",
      async () => {
        clickCell(cellOf(1, "id"));
        clickCell(cellOf(2, "name"), { shiftKey: true });
        await pressCtrl("c");
      }
    );
    Then("クリップボードにその範囲の TSV が書き込まれる", () => {
      expect(clipboardText).toBe("1\tn1\n2\tn2");
    });
    When("Ctrl+V を押す", async () => {
      await pressCtrl("v");
    });
    Then("編集の操作は送られない", () => {
      expect(applied()).toEqual([]);
      expect(clipboardCalls.read).toBe(0);
    });
  });
});
