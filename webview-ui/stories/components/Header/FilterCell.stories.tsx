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
