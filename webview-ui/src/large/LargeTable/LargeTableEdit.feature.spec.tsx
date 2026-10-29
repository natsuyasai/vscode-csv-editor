import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import type { LargeOp } from "@message/largeMessages";
// シナリオの各ステップは別のテストとして実行されるため、自動 cleanup のない pure を使い、
// シナリオの終わりに自分で cleanup する
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react/pure";
import { InMemoryRowSource } from "@/large/rowSource/InMemoryRowSource";
import type { RowSource } from "@/large/rowSource/RowSource";
import { GeneratedRowSource } from "@/test-utils/largeRowSources";
import { LargeTable } from "./LargeTable";

// VscodeContextMenu（Web Components）は jsdom で操作できないため、項目をボタンとして描く代わりのものにする。
// 実際のメニューの操作は Story（実ブラウザ）で確かめる
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeContextMenu: ({
    data,
    onVscContextMenuSelect,
  }: {
    data: { label: string; value: string }[];
    onVscContextMenuSelect: (event: { detail: { value: string } }) => void;
  }) => (
    <div role="menu">
      {data.map((item) => (
        <button
          key={item.value}
          type="button"
          role="menuitem"
          onClick={() => onVscContextMenuSelect({ detail: { value: item.value } })}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

const feature = await loadFeature("./LargeTableEdit.feature");

/** jsdom にはレイアウトが無いため、表示領域の高さを固定する（仮想スクロールの範囲計算に使われる） */
const VIEWPORT_HEIGHT = 600;
const HEADER = ["id", "name"];

describeFeature(feature, ({ Scenario, BeforeEachScenario, AfterEachScenario }) => {
  let source: RowSource;
  let applied: LargeOp[][];

  BeforeEachScenario(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: VIEWPORT_HEIGHT,
    });
    applied = [];
  });

  AfterEachScenario(() => {
    cleanup();
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  });

  /** 編集できる InMemoryRowSource（ハンドルはファイルの行番号と同じ 1 始まり）を表示する */
  const showEditable = (rows: string[][], readOnly = false) => {
    const memory = new InMemoryRowSource(
      HEADER,
      rows,
      rows.map((_, i) => i + 1)
    );
    const original = memory.applyOps.bind(memory);
    memory.applyOps = (ops) => {
      applied.push(ops);
      original(ops);
    };
    source = memory;
    render(<LargeTable source={source} theme="light" readOnly={readOnly} />);
  };

  const threeRows = (readOnly = false) =>
    showEditable(
      [
        ["1", "Alice"],
        ["2", "Bob"],
        ["3", "Carol"],
      ],
      readOnly
    );

  const sentOps = () => applied.flat();
  const scroller = () => screen.getByRole("region", { name: "大容量CSVの表" });
  const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]).queryAllByRole("row");
  const rowOf = (n: number) => {
    const row = screen.getByRole("rowheader", { name: String(n) }).closest("tr");
    if (!row) throw new Error(`${String(n)}行目が無い`);
    return row;
  };
  const cellOf = (n: number, column: string) =>
    within(rowOf(n)).getAllByRole("gridcell")[HEADER.indexOf(column)];
  const cellEditor = () => screen.getByRole("textbox", { name: "セルの編集" });
  const headerEditor = () => screen.getByRole("textbox", { name: "列名の編集" });
  const press = (target: Element, key: string, init: KeyboardEventInit = {}) => {
    let notPrevented = true;
    act(() => {
      notPrevented = fireEvent.keyDown(target, { key, ...init });
    });
    return notPrevented;
  };
  const focused = () => document.activeElement ?? document.body;
  /** 実際のクリックと同じ順にイベントを送る（選択は mousedown で行う） */
  const clickCell = (element: Element) => {
    act(() => {
      fireEvent.mouseDown(element);
      fireEvent.mouseUp(element);
      fireEvent.click(element);
    });
  };
  const selectFromMenu = (rowNumber: number, label: string) => {
    act(() => {
      fireEvent.contextMenu(screen.getByRole("rowheader", { name: String(rowNumber) }));
    });
    act(() => {
      fireEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: label }));
    });
  };

  /** jsdom の scrollTop は保持されないため、値を保持する scrollTop を付ける */
  const trackScroll = () => {
    const element = scroller();
    let top = 0;
    Object.defineProperty(element, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = value;
      },
    });
    return {
      get: () => top,
      scrollTo: (value: number) => {
        top = value;
        act(() => {
          fireEvent.scroll(element);
        });
      },
    };
  };

  Scenario(
    "セルをダブルクリックして編集し Enter で確定すると、行の置き換えが送られ即座に表示される",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("2行目の「name」列のセルをダブルクリックする", () => {
        fireEvent.doubleClick(cellOf(2, "name"));
      });
      And("編集欄の内容を「Bobby」にして Enter を押す", () => {
        expect(cellEditor()).toHaveValue("Bob");
        expect(cellEditor()).toHaveFocus();
        fireEvent.change(cellEditor(), { target: { value: "Bobby" } });
        press(cellEditor(), "Enter");
      });
      Then("2行目のハンドルの行を「2」「Bobby」に置き換える操作が送られる", () => {
        expect(sentOps()).toEqual([{ type: "setRow", handle: 2, row: ["2", "Bobby"] }]);
      });
      And("2行目の「name」列に「Bobby」と表示される", () => {
        expect(screen.queryByRole("textbox", { name: "セルの編集" })).not.toBeInTheDocument();
        expect(cellOf(2, "name")).toHaveTextContent("Bobby");
      });
      And("3行目の「name」列のセルが選択される", () => {
        expect(cellOf(3, "name")).toHaveAttribute("aria-selected", "true");
        expect(cellOf(3, "name")).toHaveFocus();
      });
    }
  );

  Scenario(
    "選択したセルで文字を入力するとその文字から編集が始まり、Tab で確定すると右のセルへ移る",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("1行目の「id」列のセルをクリックする", () => {
        clickCell(cellOf(1, "id"));
        expect(cellOf(1, "id")).toHaveAttribute("aria-selected", "true");
      });
      And("「9」を入力して Tab を押す", () => {
        press(focused(), "9");
        expect(cellEditor()).toHaveValue("9");
        expect(press(cellEditor(), "Tab")).toBe(false);
      });
      Then("1行目のハンドルの行を「9」「Alice」に置き換える操作が送られる", () => {
        expect(sentOps()).toEqual([{ type: "setRow", handle: 1, row: ["9", "Alice"] }]);
      });
      And("1行目の「name」列のセルが選択される", () => {
        expect(cellOf(1, "name")).toHaveAttribute("aria-selected", "true");
        expect(cellOf(1, "id")).toHaveAttribute("aria-selected", "false");
      });
    }
  );

  Scenario("Delete キーで選択したセルを空にする", ({ Given, When, Then, And }) => {
    Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
    When("1行目の「name」列のセルをクリックする", () => {
      clickCell(cellOf(1, "name"));
    });
    And("Delete キーを押す", () => {
      press(focused(), "Delete");
    });
    Then("1行目のハンドルの行を「1」「」に置き換える操作が送られる", () => {
      expect(sentOps()).toEqual([{ type: "setRow", handle: 1, row: ["1", ""] }]);
      expect(screen.queryByRole("textbox", { name: "セルの編集" })).not.toBeInTheDocument();
    });
  });

  Scenario("Esc で編集をキャンセルすると何も送られない", ({ Given, When, Then, And }) => {
    Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
    When("2行目の「name」列のセルをクリックする", () => {
      clickCell(cellOf(2, "name"));
    });
    And("F2 を押して編集欄の内容を「changed」にして Esc を押す", () => {
      press(focused(), "F2");
      fireEvent.change(cellEditor(), { target: { value: "changed" } });
      press(cellEditor(), "Escape");
      // 編集欄が消えた後のフォーカスの移動で確定されない
      fireEvent.blur(focused());
    });
    Then("操作は送られない", () => {
      expect(sentOps()).toEqual([]);
    });
    And("2行目の「name」列に「Bob」と表示される", () => {
      expect(screen.queryByRole("textbox", { name: "セルの編集" })).not.toBeInTheDocument();
      expect(cellOf(2, "name")).toHaveTextContent("Bob");
      expect(cellOf(2, "name")).toHaveFocus();
    });
  });

  Scenario("値を変えずに確定すると何も送られない", ({ Given, When, Then, And }) => {
    Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
    When("2行目の「name」列のセルをクリックする", () => {
      clickCell(cellOf(2, "name"));
    });
    And("Enter を押して編集を始め、そのまま Enter を押す", () => {
      press(focused(), "Enter");
      expect(cellEditor()).toHaveValue("Bob");
      press(cellEditor(), "Enter");
    });
    Then("操作は送られない", () => {
      expect(sentOps()).toEqual([]);
    });
  });

  Scenario(
    "編集中の行が表示範囲の外へスクロールしても、入力中の内容は失われない",
    ({ Given, When, Then, And }) => {
      Given("1000行の大容量ファイルを編集できる状態で表示している", () => {
        showEditable(Array.from({ length: 1000 }, (_, i) => [String(i + 1), `name-${i + 1}`]));
      });
      When("1行目の「name」列のセルをダブルクリックして編集欄の内容を「draft」にする", () => {
        fireEvent.doubleClick(cellOf(1, "name"));
        fireEvent.change(cellEditor(), { target: { value: "draft" } });
      });
      And("末尾までスクロールしてから先頭へ戻る", () => {
        const scroll = trackScroll();
        scroll.scrollTo(1000 * 40 - (VIEWPORT_HEIGHT - 40));
        expect(screen.queryByRole("rowheader", { name: "1" })).not.toBeInTheDocument();
        expect(screen.queryByRole("textbox", { name: "セルの編集" })).not.toBeInTheDocument();
        scroll.scrollTo(0);
      });
      Then("1行目の「name」列の編集欄に「draft」が残っている", () => {
        expect(within(rowOf(1)).getByRole("textbox", { name: "セルの編集" })).toHaveValue("draft");
        expect(sentOps()).toEqual([]);
      });
    }
  );

  Scenario(
    "矢印キーで選択を移動し、表示範囲の外へ移るとその行が見えるようにスクロールする",
    ({ Given, When, Then, And }) => {
      let scroll: ReturnType<typeof trackScroll>;
      Given("100万行の大容量ファイルを表示している", () => {
        source = new GeneratedRowSource(HEADER, 1_000_000);
        render(<LargeTable source={source} theme="light" />);
        scroll = trackScroll();
      });
      When("1行目の「id」列のセルをクリックする", () => {
        clickCell(cellOf(1, "id"));
      });
      And("下矢印キーを30回押す", () => {
        for (let i = 0; i < 30; i++) {
          expect(press(focused(), "ArrowDown")).toBe(false);
        }
      });
      Then("31行目の「id」列のセルが選択されフォーカスされる", () => {
        expect(cellOf(31, "id")).toHaveAttribute("aria-selected", "true");
        expect(cellOf(31, "id")).toHaveFocus();
      });
      And("31行目が表示領域に入る位置まで表がスクロールされている", () => {
        expect(scroll.get()).toBeGreaterThan(0);
        const numbers = bodyRows().map((row) =>
          Number(within(row).getByRole("rowheader").textContent)
        );
        expect(Math.max(...numbers)).toBeGreaterThanOrEqual(31);
      });
    }
  );

  Scenario(
    "ヘッダーをダブルクリックして編集すると、ヘッダーの置き換えが送られる",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("「name」列のヘッダーをダブルクリックする", () => {
        fireEvent.doubleClick(screen.getByRole("columnheader", { name: "name" }));
      });
      And("ヘッダーの編集欄の内容を「氏名」にして Enter を押す", () => {
        expect(headerEditor()).toHaveValue("name");
        expect(headerEditor()).toHaveFocus();
        fireEvent.change(headerEditor(), { target: { value: "氏名" } });
        press(headerEditor(), "Enter");
      });
      Then("ヘッダーを「id」「氏名」に置き換える操作が送られる", () => {
        expect(sentOps()).toEqual([{ type: "setHeader", header: ["id", "氏名"] }]);
      });
      And("列名「氏名」が表示される", () => {
        expect(screen.getByRole("columnheader", { name: "氏名" })).toBeInTheDocument();
      });
    }
  );

  Scenario(
    "行番号の右クリックメニューで上に挿入すると、負のハンドルの空行の挿入が送られる",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("2行目の行番号を右クリックしてメニューの「Insert Row Above」を選ぶ", () => {
        selectFromMenu(2, "Insert Row Above");
      });
      Then("2行目のハンドルの直前に負のハンドルの空行を1行挿入する操作が送られる", () => {
        expect(sentOps()).toEqual([
          { type: "insertRows", beforeHandle: 2, handles: [-1], rows: [["", ""]] },
        ]);
      });
      And("4行になり2行目は空行になる", () => {
        expect(bodyRows()).toHaveLength(4);
        expect(cellOf(2, "id")).toHaveTextContent("");
        expect(cellOf(3, "name")).toHaveTextContent("Bob");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      });
    }
  );

  Scenario(
    "最終行の下に続けて挿入すると、末尾への挿入の後に別の負のハンドルで挿入が送られる",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("3行目の行番号を右クリックしてメニューの「Insert Row Below」を選ぶ", () => {
        selectFromMenu(3, "Insert Row Below");
      });
      And("3行目の行番号を右クリックしてメニューの「Insert Row Below」を選ぶ", () => {
        selectFromMenu(3, "Insert Row Below");
      });
      Then(
        "1回目は末尾へ、2回目は1回目の行の直前へ、異なる負のハンドルで挿入する操作が送られる",
        () => {
          expect(sentOps()).toEqual([
            { type: "insertRows", beforeHandle: null, handles: [-1], rows: [["", ""]] },
            { type: "insertRows", beforeHandle: -1, handles: [-2], rows: [["", ""]] },
          ]);
          expect(bodyRows()).toHaveLength(5);
        }
      );
    }
  );

  Scenario(
    "行番号の右クリックメニューで削除すると、その行のハンドルの削除が送られる",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("2行目の行番号を右クリックしてメニューの「Delete Row」を選ぶ", () => {
        selectFromMenu(2, "Delete Row");
      });
      Then("2行目のハンドルの行を削除する操作が送られる", () => {
        expect(sentOps()).toEqual([{ type: "deleteRows", handles: [2] }]);
      });
      And("2行になり2行目は「Carol」の行になる", () => {
        expect(bodyRows()).toHaveLength(2);
        expect(cellOf(2, "name")).toHaveTextContent("Carol");
      });
    }
  );

  Scenario(
    "メニューに表示されているショートカットで行を挿入・削除する",
    ({ Given, When, Then, And }) => {
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("2行目の「id」列のセルをクリックする", () => {
        clickCell(cellOf(2, "id"));
      });
      And("Ctrl+Shift+I を押す", () => {
        expect(press(focused(), "I", { ctrlKey: true, shiftKey: true })).toBe(false);
      });
      Then("2行目のハンドルの直前に負のハンドルの空行を1行挿入する操作が送られる", () => {
        expect(sentOps()).toEqual([
          { type: "insertRows", beforeHandle: 2, handles: [-1], rows: [["", ""]] },
        ]);
        // 挿入した行が選択される
        expect(cellOf(2, "id")).toHaveAttribute("aria-selected", "true");
      });
      When("Ctrl+Shift+D を押す", () => {
        expect(press(focused(), "D", { ctrlKey: true, shiftKey: true })).toBe(false);
      });
      Then("挿入した行を削除する操作が送られる", () => {
        expect(sentOps()[1]).toEqual({ type: "deleteRows", handles: [-1] });
        expect(bodyRows()).toHaveLength(3);
      });
    }
  );

  Scenario("インデックス作成中は編集できないが、選択は移動できる", ({ Given, When, Then, And }) => {
    Given("3行の大容量ファイルをインデックス作成中で編集できない状態で表示している", () =>
      threeRows(true)
    );
    When("2行目の「name」列のセルをダブルクリックしてから「x」・Delete・F2 を押す", () => {
      fireEvent.doubleClick(cellOf(2, "name"));
      press(cellOf(2, "name"), "x");
      press(cellOf(2, "name"), "Delete");
      press(cellOf(2, "name"), "F2");
    });
    And("2行目の行番号と「name」列のヘッダーを右クリック・ダブルクリックする", () => {
      fireEvent.contextMenu(screen.getByRole("rowheader", { name: "2" }));
      fireEvent.doubleClick(screen.getByRole("columnheader", { name: "name" }));
      press(cellOf(2, "name"), "I", { ctrlKey: true, shiftKey: true });
    });
    Then("編集欄もメニューも表示されず、操作は送られない", () => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(sentOps()).toEqual([]);
      expect(cellOf(2, "name")).toHaveTextContent("Bob");
    });
    When("2行目の「name」列のセルをクリックして下矢印キーを押す", () => {
      clickCell(cellOf(2, "name"));
      press(focused(), "ArrowDown");
    });
    Then("3行目の「name」列のセルが選択される", () => {
      expect(cellOf(3, "name")).toHaveAttribute("aria-selected", "true");
    });
  });

  Scenario("大容量モードで使えない操作は表示されない", ({ Given, When, Then, And }) => {
    Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
    When("1行目の「id」列のセルをクリックし、「id」列のヘッダーを右クリックする", () => {
      clickCell(cellOf(1, "id"));
      fireEvent.contextMenu(screen.getByRole("columnheader", { name: "id" }));
    });
    Then("オートフィルのハンドルも列のメニューも表示されない", () => {
      expect(screen.queryByRole("button", { name: "Auto fill handle" })).not.toBeInTheDocument();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
    And("行と列はドラッグできない", () => {
      expect(document.body.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    });
  });

  Scenario(
    "セルを選択中の Ctrl+Z・Ctrl+Y・Ctrl+S は処理せず止めもしない",
    ({ Given, When, Then, And }) => {
      // vi.fn の呼び出し記録はステップ（テスト）ごとに消されるため、数を自分で数える
      let reached = 0;
      const countReached = () => {
        reached += 1;
      };
      const results: boolean[] = [];
      Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
      When("2行目の「name」列のセルをクリックする", () => {
        clickCell(cellOf(2, "name"));
      });
      And("Ctrl+Z・Ctrl+Y・Ctrl+Shift+Z・Ctrl+S を押す", () => {
        window.addEventListener("keydown", countReached);
        for (const [key, shiftKey] of [
          ["z", false],
          ["y", false],
          ["Z", true],
          ["s", false],
        ] as const) {
          results.push(press(focused(), key, { ctrlKey: true, shiftKey }));
        }
        window.removeEventListener("keydown", countReached);
      });
      Then("どのキーも既定の動作を止められずに window まで届く", () => {
        expect(results).toEqual([true, true, true, true]);
        expect(reached).toBe(4);
      });
      And("操作は送られない", () => {
        expect(sentOps()).toEqual([]);
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      });
    }
  );

  Scenario("セル編集中の Ctrl+Z も止めず、編集は続く", ({ Given, When, Then, And }) => {
    let reached = 0;
    const countReached = () => {
      reached += 1;
    };
    let notPrevented = false;
    Given("3行の大容量ファイルを編集できる状態で表示している", () => threeRows());
    When("2行目の「name」列のセルをダブルクリックする", () => {
      fireEvent.doubleClick(cellOf(2, "name"));
    });
    And("編集欄で Ctrl+Z を押す", () => {
      window.addEventListener("keydown", countReached);
      notPrevented = press(cellEditor(), "z", { ctrlKey: true });
      window.removeEventListener("keydown", countReached);
    });
    Then("キーは既定の動作を止められずに window まで届く", () => {
      expect(notPrevented).toBe(true);
      expect(reached).toBe(1);
    });
    And("編集欄は表示されたままで、操作は送られない", () => {
      expect(cellEditor()).toBeInTheDocument();
      expect(sentOps()).toEqual([]);
    });
  });
});
