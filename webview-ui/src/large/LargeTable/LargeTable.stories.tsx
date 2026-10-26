import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { LargeTable, type LargeTableClipboard } from "@/large/LargeTable/LargeTable";
import { MAX_SCROLL_HEIGHT } from "@/large/LargeTable/scrollScaling";
import { InMemoryRowSource } from "@/large/rowSource/InMemoryRowSource";
import {
  GeneratedRowSource,
  PendingRowSource,
  RecordingRowSource,
} from "@/test-utils/largeRowSources";

const MILLION = 1_000_000;
const HEADER = ["id", "name", "city", "note"];

const meta: Meta<typeof LargeTable> = {
  title: "Large/LargeTable",
  component: LargeTable,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    source: { control: false },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "400px", width: "800px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LargeTable>;

const fewRows = () =>
  new InMemoryRowSource(HEADER, [
    ["1", "Alice", "Tokyo", "first"],
    ["2", "Bob", "Osaka", "second"],
    ["3", "Carol", "Kyoto", "multi\nline"],
  ]);

const scroller = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "大容量CSVの表" });

export const FewRows: Story = {
  name: "少数行",
  args: { source: fewRows(), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
    await expect(canvas.getByRole("rowheader", { name: "3" })).toBeInTheDocument();
    await expect(canvas.getByText("Bob")).toBeInTheDocument();
  },
};

export const MillionRows: Story = {
  name: "100万行（スクロールで末尾まで）",
  args: { source: new GeneratedRowSource(HEADER, MILLION), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = scroller(canvasElement);
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());

    // 100万行×40px（4,000万px）はブラウザの最大要素高を超えるため、DOM 上の高さは上限に収める
    await expect(element.scrollHeight).toBeLessThanOrEqual(MAX_SCROLL_HEIGHT + 100);

    // スクロールバーで中ほどへ移動すると、その位置の行が表示される
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2;
    await waitFor(() => {
      const numbers = canvas
        .getAllByRole("rowheader")
        .map((cell) => Number(cell.textContent))
        .filter((n) => n > 0);
      return expect(Math.max(...numbers)).toBeGreaterThan(MILLION * 0.45);
    });

    // 末尾まで移動すると最終行が表示領域の中に表示される
    element.scrollTop = element.scrollHeight;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader", { name: String(MILLION) })).toBeInTheDocument()
    );
    const lastRow = canvas.getByRole("rowheader", { name: String(MILLION) });
    const rowRect = lastRow.getBoundingClientRect();
    const viewRect = element.getBoundingClientRect();
    await expect(rowRect.bottom).toBeLessThanOrEqual(viewRect.bottom + 1);
    await expect(rowRect.top).toBeGreaterThanOrEqual(viewRect.top);
    await expect(canvas.getByText(`name-${String(MILLION)}`)).toBeVisible();

    // 先頭へ戻せる
    element.scrollTop = 0;
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());
  },
};

/** 性能目標の規模（500MB・約500万行）でも末尾まで移動できる */
export const FiveMillionRows: Story = {
  name: "500万行（性能目標の規模で末尾まで）",
  args: { source: new GeneratedRowSource(HEADER, 5 * MILLION), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = scroller(canvasElement);
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());
    await expect(element.scrollHeight).toBeLessThanOrEqual(MAX_SCROLL_HEIGHT + 100);

    element.scrollTop = element.scrollHeight;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader", { name: String(5 * MILLION) })).toBeInTheDocument()
    );
    await expect(canvas.getByText(`name-${String(5 * MILLION)}`)).toBeVisible();
  },
};

export const PendingRows: Story = {
  name: "未取得の行がある状態",
  args: { source: new PendingRowSource(HEADER, MILLION), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());
    const rows = within(canvas.getAllByRole("rowgroup")[1]).getAllByRole("row");
    // 表示範囲の行はすべて読み込み中（aria-busy）として表示される
    await expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      await expect(row).toHaveAttribute("aria-busy", "true");
    }
    // 表示範囲の行だけを要求している
    const source = args.source as PendingRowSource;
    await expect(source.requests.every(([start, end]) => end - start < 100)).toBe(true);
  },
};

export const DarkTheme: Story = {
  name: "ダークテーマ",
  args: { source: fewRows(), theme: "dark" },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e", height: "100%" }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    await expect(canvas.getByText("Alice")).toBeVisible();
  },
};

// ---- 編集（2-2） ----

const editableRows = () =>
  new RecordingRowSource(HEADER, [
    ["1", "Alice", "Tokyo", "first"],
    ["2", "Bob", "Osaka", "second"],
    ["3", "Carol", "Kyoto", "third"],
  ]);

/** n 行目（1 始まり）の col 列目のセル */
const cellAt = (canvasElement: HTMLElement, rowNumber: number, col: number) => {
  const row = within(canvasElement)
    .getByRole("rowheader", { name: String(rowNumber) })
    .closest("tr");
  if (!row) throw new Error(`${String(rowNumber)}行目が無い`);
  return within(row).getAllByRole("gridcell")[col];
};

/** 行番号を右クリックし、行のメニュー（VscodeContextMenu）の項目を選ぶ */
async function selectRowMenu(canvasElement: HTMLElement, rowNumber: number, value: string) {
  const rowHeader = within(canvasElement).getByRole("rowheader", { name: String(rowNumber) });
  await userEvent.pointer({ keys: "[MouseRight]", target: rowHeader });
  const link = await waitFor(() => {
    const menu = document.body.querySelector("vscode-context-menu");
    const item = menu?.shadowRoot?.querySelector(`vscode-context-menu-item[value="${value}"]`);
    const anchor = item?.shadowRoot?.querySelector("a");
    if (!anchor) throw new Error(`メニューの項目 ${value} が無い`);
    return anchor;
  });
  await userEvent.click(link);
  await waitFor(() => expect(document.body.querySelector("vscode-context-menu")).toBeNull());
}

export const EditCell: Story = {
  name: "セルの編集（ダブルクリックで編集し Enter で確定）",
  args: { source: editableRows(), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const source = args.source as RecordingRowSource;
    await userEvent.dblClick(cellAt(canvasElement, 2, 1));
    const editor = canvas.getByRole("textbox", { name: "セルの編集" });
    await waitFor(() => expect(editor).toHaveFocus());
    await userEvent.clear(editor);
    await userEvent.type(editor, "Bobby{Enter}");

    // ハンドル（ファイルの行番号）を指定した行の置き換えが送られ、即座に表示される
    await expect(source.applied).toEqual([
      { type: "setRow", handle: 2, row: ["2", "Bobby", "Osaka", "second"] },
    ]);
    await expect(cellAt(canvasElement, 2, 1)).toHaveTextContent("Bobby");
    // 確定後は下のセルが選択される
    await waitFor(() => expect(cellAt(canvasElement, 3, 1)).toHaveFocus());
    await expect(cellAt(canvasElement, 3, 1)).toHaveAttribute("aria-selected", "true");
  },
};

export const EditByTyping: Story = {
  name: "入力で編集を始め Tab で確定、Esc でキャンセル",
  args: { source: editableRows(), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const source = args.source as RecordingRowSource;
    await userEvent.click(cellAt(canvasElement, 1, 2));
    await userEvent.keyboard("Nagoya");
    await expect(canvas.getByRole("textbox", { name: "セルの編集" })).toHaveValue("Nagoya");
    await userEvent.keyboard("{Tab}");
    await expect(source.applied).toEqual([
      { type: "setRow", handle: 1, row: ["1", "Alice", "Nagoya", "first"] },
    ]);
    await waitFor(() => expect(cellAt(canvasElement, 1, 3)).toHaveFocus());

    // F2 で編集を始めて Esc でキャンセルすると何も送られない
    await userEvent.keyboard("{F2}x{Escape}");
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await expect(source.applied).toHaveLength(1);
    await expect(cellAt(canvasElement, 1, 3)).toHaveTextContent("first");

    // Ctrl+Z は表では処理しない（VSCode の Undo に委ねる）
    await userEvent.keyboard("{Control>}z{/Control}");
    await expect(source.applied).toHaveLength(1);
  },
};

export const EditHeader: Story = {
  name: "ヘッダーの編集",
  args: { source: editableRows(), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const source = args.source as RecordingRowSource;
    await userEvent.dblClick(canvas.getByRole("columnheader", { name: "city" }));
    const editor = canvas.getByRole("textbox", { name: "列名の編集" });
    await userEvent.clear(editor);
    await userEvent.type(editor, "都市{Enter}");
    await expect(source.applied).toEqual([
      { type: "setHeader", header: ["id", "name", "都市", "note"] },
    ]);
    await expect(canvas.getByRole("columnheader", { name: "都市" })).toBeInTheDocument();
  },
};

export const InsertAndDeleteRows: Story = {
  name: "行番号の右クリックメニューで行を挿入・削除",
  args: { source: editableRows(), theme: "light" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const source = args.source as RecordingRowSource;
    const bodyRows = () => within(canvas.getAllByRole("rowgroup")[1]).getAllByRole("row");

    await selectRowMenu(canvasElement, 2, "insertRowAbove");
    await expect(source.applied[0]).toEqual({
      type: "insertRows",
      beforeHandle: 2,
      handles: [-1],
      rows: [["", "", "", ""]],
    });
    await waitFor(() => expect(bodyRows()).toHaveLength(4));
    await expect(cellAt(canvasElement, 3, 1)).toHaveTextContent("Bob");

    await selectRowMenu(canvasElement, 4, "insertRowBelow");
    await expect(source.applied[1]).toMatchObject({ beforeHandle: null, handles: [-2] });

    await selectRowMenu(canvasElement, 1, "deleteRow");
    await expect(source.applied[2]).toEqual({ type: "deleteRows", handles: [1] });
    await waitFor(() => expect(bodyRows()).toHaveLength(4));
    await expect(cellAt(canvasElement, 2, 1)).toHaveTextContent("Bob");
  },
};

export const ReadOnlyWhileIndexing: Story = {
  name: "インデックス作成中（編集できない）",
  args: { source: editableRows(), theme: "light", readOnly: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const source = args.source as RecordingRowSource;
    await userEvent.dblClick(cellAt(canvasElement, 2, 1));
    await userEvent.keyboard("x{Delete}{F2}");
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByRole("rowheader", { name: "2" }),
    });
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    await expect(document.body.querySelector("vscode-context-menu")).toBeNull();
    await expect(source.applied).toEqual([]);
    // 選択の移動はできる
    await userEvent.keyboard("{ArrowDown}");
    await expect(cellAt(canvasElement, 3, 1)).toHaveAttribute("aria-selected", "true");
  },
};

export const KeyboardNavigationMillion: Story = {
  name: "100万行で選択の移動に合わせてスクロール",
  args: { source: new GeneratedRowSource(HEADER, MILLION), theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = scroller(canvasElement);
    const isVisible = (cell: HTMLElement) => {
      const rect = cell.getBoundingClientRect();
      const view = element.getBoundingClientRect();
      // 固定ヘッダー（40px）の下に収まっている
      return rect.top >= view.top + 40 - 1 && rect.bottom <= view.bottom + 1;
    };
    await waitFor(() => expect(canvas.getByRole("rowheader", { name: "1" })).toBeVisible());

    // 下矢印で表示範囲の外へ移ると、その行が見える位置までスクロールする
    await userEvent.click(cellAt(canvasElement, 1, 0));
    for (let i = 0; i < 30; i++) {
      await userEvent.keyboard("{ArrowDown}");
    }
    await waitFor(() => expect(cellAt(canvasElement, 31, 0)).toHaveFocus());
    await expect(isVisible(cellAt(canvasElement, 31, 0))).toBe(true);

    // 末尾付近（DOM の高さを縮めている範囲の終わり）でも、上へ移る選択に合わせてスクロールする
    element.scrollTop = element.scrollHeight;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader", { name: String(MILLION) })).toBeVisible()
    );
    await userEvent.click(cellAt(canvasElement, MILLION, 1));
    for (let i = 0; i < 20; i++) {
      await userEvent.keyboard("{ArrowUp}");
    }
    const target = MILLION - 20;
    await waitFor(() => expect(cellAt(canvasElement, target, 1)).toHaveFocus());
    await expect(isVisible(cellAt(canvasElement, target, 1))).toBe(true);
    await expect(canvas.getByText(`name-${String(target)}`)).toBeVisible();
  },
};

/** 書き込んだ内容を持つだけのクリップボード（Story の実行環境ではクリップボードの権限が無いため） */
class MemoryClipboard implements LargeTableClipboard {
  text = "";
  writes = 0;
  constructor(text = "") {
    this.text = text;
  }
  readText(): Promise<string> {
    return Promise.resolve(this.text);
  }
  writeText(text: string): Promise<void> {
    this.text = text;
    this.writes += 1;
    return Promise.resolve();
  }
}

const quotedRows = () =>
  new RecordingRowSource(HEADER, [
    ["1", 'say "hi"', "Tokyo", "multi\nline"],
    ["2", "Bob", "Osaka", "tab\there"],
    ["3", "Carol", "Kyoto", "third"],
  ]);

export const DragSelectAndCopy: Story = {
  name: "ドラッグで範囲を選択して Ctrl+C でコピー（TSV）",
  args: { source: quotedRows(), theme: "light", clipboard: new MemoryClipboard() },
  play: async ({ canvasElement, args }) => {
    const clipboard = args.clipboard as MemoryClipboard;
    // 1行目の name 列から2行目の note 列までドラッグする
    await userEvent.pointer([
      { keys: "[MouseLeft>]", target: cellAt(canvasElement, 1, 1) },
      { target: cellAt(canvasElement, 2, 2) },
      { target: cellAt(canvasElement, 2, 3) },
      { keys: "[/MouseLeft]", target: cellAt(canvasElement, 2, 3) },
    ]);
    for (const [row, col] of [
      [1, 1],
      [1, 3],
      [2, 1],
      [2, 3],
    ]) {
      await expect(cellAt(canvasElement, row, col)).toHaveAttribute("aria-selected", "true");
    }
    await expect(cellAt(canvasElement, 1, 0)).toHaveAttribute("aria-selected", "false");
    await expect(cellAt(canvasElement, 3, 1)).toHaveAttribute("aria-selected", "false");

    await userEvent.keyboard("{Control>}c{/Control}");
    // 通常モードと同じ TSV（改行・タブ・引用符を含むセルはクォートし、引用符は2つ重ねる）
    await waitFor(() =>
      expect(clipboard.text).toBe('"say ""hi"""\tTokyo\t"multi\nline"\nBob\tOsaka\t"tab\there"')
    );
  },
};

export const ShiftSelectAndPaste: Story = {
  name: "Shift+矢印キーで範囲を選択して Ctrl+V で貼り付け（1回の編集）",
  args: {
    source: editableRows(),
    theme: "light",
    clipboard: new MemoryClipboard("A\tB\nC\tD\nE\tF"),
  },
  play: async ({ canvasElement, args }) => {
    const source = args.source as RecordingRowSource;
    await userEvent.click(cellAt(canvasElement, 2, 2));
    await userEvent.keyboard("{Shift>}{ArrowUp}{ArrowLeft}{/Shift}");
    await expect(cellAt(canvasElement, 1, 1)).toHaveFocus();
    await expect(cellAt(canvasElement, 2, 2)).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Control>}v{/Control}");
    // 選択の左上（1行目の name 列）から貼り付ける。末尾の行を超える分（3行目より後）は無いので3行とも置き換える
    await waitFor(() => expect(source.batches).toHaveLength(1));
    await expect(source.batches[0]).toEqual([
      { type: "setRow", handle: 1, row: ["1", "A", "B", "first"] },
      { type: "setRow", handle: 2, row: ["2", "C", "D", "second"] },
      { type: "setRow", handle: 3, row: ["3", "E", "F", "third"] },
    ]);
    await expect(cellAt(canvasElement, 3, 2)).toHaveTextContent("F");
    // 貼り付けた範囲が選択される
    await expect(cellAt(canvasElement, 3, 2)).toHaveAttribute("aria-selected", "true");
    await expect(cellAt(canvasElement, 1, 1)).toHaveFocus();
  },
};

const SIXTY_THOUSAND = 60_000;

export const CopyLimit: Story = {
  name: "10万セルを超える範囲はコピーできずメッセージを出す",
  args: {
    source: new InMemoryRowSource(
      HEADER,
      Array.from({ length: SIXTY_THOUSAND }, (_, i) =>
        HEADER.map((name) => `${name}-${String(i + 1)}`)
      )
    ),
    theme: "light",
    clipboard: new MemoryClipboard("unchanged"),
    onNotice: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const clipboard = args.clipboard as MemoryClipboard;
    const element = scroller(canvasElement);
    await userEvent.click(cellAt(canvasElement, 1, 0));
    element.scrollTop = element.scrollHeight;
    await waitFor(() =>
      expect(canvas.getByRole("rowheader", { name: String(SIXTY_THOUSAND) })).toBeVisible()
    );
    // Shift を押したままクリックする（押したキーの状態を共有するため同じ user で操作する）
    const user = userEvent.setup();
    await user.keyboard("{Shift>}");
    await user.click(cellAt(canvasElement, SIXTY_THOUSAND, 1));
    await user.keyboard("{/Shift}");
    await expect(cellAt(canvasElement, SIXTY_THOUSAND, 0)).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Control>}c{/Control}");

    // 6万行×2列＝12万セルは上限（10万セル）を超える
    await expect(args.onNotice).toHaveBeenCalledWith(expect.stringMatching(/10万セル.*120,000/));
    await expect(clipboard.text).toBe("unchanged");
    await expect(clipboard.writes).toBe(0);
  },
};
