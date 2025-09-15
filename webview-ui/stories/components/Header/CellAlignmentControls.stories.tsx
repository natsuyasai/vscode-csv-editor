import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CellAlignmentControls } from "@/components/Header/CellAlignmentControls";
import { CellAlignment } from "@/types";

const meta = {
  title: "Components/Header/CellAlignmentControls",
  component: CellAlignmentControls,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    selectedColumnKey: {
      control: "text",
      description: "選択中の列キー",
    },
    currentAlignment: {
      control: "object",
      description: "現在の配置設定",
    },
  },
  args: {
    onAlignmentChange: fn(),
  },
} satisfies Meta<typeof CellAlignmentControls>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultAlignment: CellAlignment = {
  vertical: "center",
  horizontal: "left",
};

export const Default: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: defaultAlignment,
  },
};

export const NoColumnSelected: Story = {
  args: {
    selectedColumnKey: null,
    currentAlignment: defaultAlignment,
  },
};

export const TopLeftAlignment: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "top",
      horizontal: "left",
    },
  },
};

export const CenterCenterAlignment: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "center",
      horizontal: "center",
    },
  },
};

export const BottomRightAlignment: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "bottom",
      horizontal: "right",
    },
  },
};

export const AllVerticalAlignments: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "top",
      horizontal: "left",
    },
  },
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h3>上寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "top", horizontal: "left" }}
        />
      </div>
      <div>
        <h3>中央寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "center", horizontal: "left" }}
        />
      </div>
      <div>
        <h3>下寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "bottom", horizontal: "left" }}
        />
      </div>
    </div>
  ),
};

export const AllHorizontalAlignments: Story = {
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "center",
      horizontal: "left",
    },
  },
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h3>左寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "center", horizontal: "left" }}
        />
      </div>
      <div>
        <h3>中央寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "center", horizontal: "center" }}
        />
      </div>
      <div>
        <h3>右寄せ</h3>
        <CellAlignmentControls
          {...args}
          currentAlignment={{ vertical: "center", horizontal: "right" }}
        />
      </div>
    </div>
  ),
};
