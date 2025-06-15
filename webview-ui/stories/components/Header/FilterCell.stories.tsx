/* eslint-disable jsx-a11y/label-has-associated-control */
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import { FilterCell } from "@/components/Header/FilterCell";

const meta = {
  title: "components/FilterCell",
  component: FilterCell,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "20px",
          width: "300px",
          background: "var(--vscode-editor-background)",
          color: "var(--vscode-editor-foreground)",
        }}>
        <Story />
      </div>
    ),
  ],
  args: {
    columnKey: "testColumn",
    value: "",
    onChange: fn(),
    onClear: fn(),
    isActive: false,
  },
} satisfies Meta<typeof FilterCell>;

export default meta;
type Story = StoryObj<typeof meta>;

// インタラクティブなStoryのための wrapper コンポーネント
const InteractiveFilterCell = ({
  columnKey,
  initialValue = "",
  isActive: initialIsActive = false,
}: {
  columnKey: string;
  initialValue?: string;
  isActive?: boolean;
}) => {
  const [value, setValue] = useState(initialValue);
  const [isActive, setIsActive] = useState(initialIsActive);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setIsActive(newValue.trim() !== "");
  };

  const handleClear = () => {
    setValue("");
    setIsActive(false);
  };

  return (
    <FilterCell
      columnKey={columnKey}
      value={value}
      onChange={handleChange}
      onClear={handleClear}
      isActive={isActive}
    />
  );
};

export const Default: Story = {
  args: {},
};

export const WithValue: Story = {
  args: {
    value: "フィルター値",
    isActive: true,
  },
};

export const Active: Story = {
  args: {
    value: "アクティブなフィルター",
    isActive: true,
  },
};

export const Interactive: Story = {
  render: () => <InteractiveFilterCell columnKey="interactive" />,
  parameters: {
    docs: {
      description: {
        story: "実際に入力とクリアができるインタラクティブなFilterCellです。",
      },
    },
  },
};

export const WithInitialValue: Story = {
  render: () => (
    <InteractiveFilterCell columnKey="withInitial" initialValue="初期値" isActive={true} />
  ),
  parameters: {
    docs: {
      description: {
        story: "初期値が設定されたインタラクティブなFilterCellです。",
      },
    },
  },
};

export const LongValue: Story = {
  args: {
    value: "これは非常に長いフィルター値のテストです。セルの幅を超える場合の表示を確認できます。",
    isActive: true,
  },
  parameters: {
    docs: {
      description: {
        story: "長い値が入力された場合の表示テストです。",
      },
    },
  },
};

export const MultipleFilters: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          名前でフィルター:
        </label>
        <InteractiveFilterCell columnKey="name" />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          カテゴリでフィルター:
        </label>
        <InteractiveFilterCell columnKey="category" />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          ステータスでフィルター:
        </label>
        <InteractiveFilterCell columnKey="status" initialValue="アクティブ" isActive={true} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "複数のFilterCellを組み合わせた使用例です。",
      },
    },
  },
};

export const DarkTheme: Story = {
  args: {
    value: "ダークテーマ",
    isActive: true,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "20px",
          width: "300px",
          background: "#1e1e1e",
          color: "#cccccc",
          border: "1px solid #3c3c3c",
        }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "ダークテーマでの表示例です。",
      },
    },
  },
};

export const Focused: Story = {
  args: {
    value: "フォーカス状態",
    isActive: true,
  },
  play: ({ canvasElement }) => {
    const canvas = canvasElement;
    const input = canvas.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  },
  parameters: {
    docs: {
      description: {
        story: "フォーカス状態のFilterCellです。",
      },
    },
  },
};

export const AndSearch: Story = {
  render: () => <InteractiveFilterCell columnKey="andSearch" initialValue="田中 太郎" isActive={true} />,
  parameters: {
    docs: {
      description: {
        story: "AND検索の例です。スペース区切りまたは「and」キーワードで複数条件の検索ができます。「田中 太郎」や「田中 and 太郎」と入力すると、両方の文字を含む行のみが表示されます。",
      },
    },
  },
};

export const OrSearch: Story = {
  render: () => <InteractiveFilterCell columnKey="orSearch" initialValue="Engineering or Marketing" isActive={true} />,
  parameters: {
    docs: {
      description: {
        story: "OR検索の例です。「or」キーワードで複数条件のいずれかにマッチする検索ができます。「Engineering or Marketing」と入力すると、どちらかの文字を含む行が表示されます。",
      },
    },
  },
};

export const ZenkakuHankaku: Story = {
  render: () => <InteractiveFilterCell columnKey="zenkaku" initialValue="Ａｂｃ" isActive={true} />,
  parameters: {
    docs: {
      description: {
        story: "全角半角同一視の例です。「Ａｂｃ」（全角）と入力しても「Abc」（半角）の行もマッチします。数字や記号も同様に全角半角を区別しません。",
      },
    },
  },
};

export const ComplexSearch: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          名前フィルター（OR検索）:
        </label>
        <InteractiveFilterCell columnKey="name" initialValue="田中 or 佐藤" isActive={true} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          部署フィルター（AND検索）:
        </label>
        <InteractiveFilterCell columnKey="department" initialValue="Engineering" isActive={true} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "5px", fontSize: "12px" }}>
          ステータスフィルター（全角半角同一視）:
        </label>
        <InteractiveFilterCell columnKey="status" initialValue="Ａｃｔｉｖｅ" isActive={true} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "複雑な検索条件の組み合わせ例です。複数のフィルターでAND検索、OR検索、全角半角同一視を同時に使用できます。",
      },
    },
  },
};
