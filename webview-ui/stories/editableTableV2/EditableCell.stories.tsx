import type { Meta, StoryObj } from "@storybook/react-vite";
import { CellContext } from "@tanstack/react-table";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { EditableCell } from "@/components/EditableTableV2/EditableCell";
import { RowData } from "@/components/EditableTableV2/types";

const meta: Meta<typeof EditableCell> = {
  title: "EditableTableV2/EditableCell",
  component: EditableCell,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "編集可能なセルコンポーネント。ダブルクリックまたはキーボード操作で編集モードに入り、テキストを編集できます。",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "200px", height: "40px", border: "1px solid #ccc" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

// モックのpropsを作成
const createMockProps = (
  value: string = "Sample Text",
  overrides?: Partial<CellContext<RowData, unknown>>
): CellContext<RowData, unknown> => ({
  getValue: (() => value) as never,
  row: { index: 0 } as never,
  column: { id: "col0" } as never,
  table: {
    options: {
      meta: {
        updateData: (rowIndex: number, columnId: string, newValue: string) => {
          console.log(`Updated [${rowIndex}][${columnId}] = "${newValue}"`);
        },
        selectedCells: new Set(),
      },
    },
  } as never,
  cell: {} as never,
  renderValue: () => value as never,
  ...overrides,
});

/**
 * デフォルトのセル表示
 */
export const Default: Story = {
  args: createMockProps(),
};

/**
 * 長いテキストのセル
 */
export const LongText: Story = {
  args: createMockProps(
    "This is a very long text that will be truncated with ellipsis when displayed in the cell"
  ),
};

/**
 * 空のセル
 */
export const Empty: Story = {
  args: createMockProps(""),
};

/**
 * 数値のセル
 */
export const Numeric: Story = {
  args: createMockProps("12345"),
};

/**
 * 選択状態のセル
 */
export const Selected: Story = {
  args: createMockProps("Selected Cell", {
    table: {
      options: {
        meta: {
          selectedCells: new Set(["0-0"]),
          updateData: () => {},
        },
      },
    } as never,
  }),
};

/**
 * ダブルクリックで編集モードに入る
 */
export const DoubleClickToEdit: Story = {
  args: createMockProps("Double click me"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // セルを取得
    const cell = canvas.getByRole("button");
    await expect(cell).toBeInTheDocument();

    // ダブルクリック
    await userEvent.dblClick(cell);

    // textareaが表示されることを確認
    await waitFor(
      async () => {
        const textarea = canvas.getByRole("textbox");
        await expect(textarea).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  },
};

/**
 * Enterキーで編集モードに入る
 */
export const EnterKeyToEdit: Story = {
  args: createMockProps("Press Enter to edit"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByRole("button");
    cell.focus();

    // Enterキーを押す
    await userEvent.keyboard("{Enter}");

    // textareaが表示されることを確認
    await waitFor(
      async () => {
        const textarea = canvas.getByRole("textbox");
        await expect(textarea).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  },
};

/**
 * Deleteキーでクリア
 */
export const DeleteKeyToClear: Story = {
  args: createMockProps("Press Delete to clear"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByRole("button");
    cell.focus();

    // Deleteキーを押す
    await userEvent.keyboard("{Delete}");

    // セルがクリアされることを確認（編集モードには入らない）
    await waitFor(async () => {
      await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    });
  },
};

/**
 * Backspaceキーでクリアして編集
 */
export const BackspaceKeyToClearAndEdit: Story = {
  args: createMockProps("Press Backspace"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByRole("button");
    cell.focus();

    // Backspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // textareaが表示され、空であることを確認
    await waitFor(
      async () => {
        const textarea = canvas.getByRole("textbox");
        await expect(textarea).toBeInTheDocument();
        await expect(textarea).toHaveValue("");
      },
      { timeout: 2000 }
    );
  },
};

/**
 * 文字入力で編集開始
 */
export const TypeToStartEditing: Story = {
  args: createMockProps("Type to replace"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByRole("button");
    cell.focus();

    // 文字を入力
    await userEvent.keyboard("a");

    // textareaが表示され、入力した文字が設定されることを確認
    await waitFor(
      async () => {
        const textarea = canvas.getByRole("textbox");
        await expect(textarea).toBeInTheDocument();
        await expect(textarea).toHaveValue("a");
      },
      { timeout: 2000 }
    );
  },
};

/**
 * Escapeキーで編集キャンセル
 */
export const EscapeToCancel: Story = {
  args: createMockProps("Edit and press Escape"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const cell = canvas.getByRole("button");

    // ダブルクリックして編集モードに入る
    await userEvent.dblClick(cell);

    await waitFor(
      async () => {
        const textarea = canvas.getByRole("textbox");
        await expect(textarea).toBeInTheDocument();

        // テキストを変更
        await userEvent.clear(textarea);
        await userEvent.type(textarea, "Changed");

        // Escapeキーで キャンセル
        await userEvent.keyboard("{Escape}");
      },
      { timeout: 3000 }
    );

    // 元のテキストが表示されることを確認
    await waitFor(
      async () => {
        await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
        await expect(canvas.getByText("Edit and press Escape")).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  },
};
