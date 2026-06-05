---
description: "Storybook駆動でUI開発を行う（Story-Firstワークフロー）"
user-invocable: true
arg: "開発対象のコンポーネント名や機能の説明"
---

# Storybook駆動UI開発

CLAUDE.mdの「UI開発前にStorybook MCP呼び出し」を手順化したワークフローです。

## ワークフロー

### Step 1: Storybook MCP の確認

UI/フロントエンド/React開発を開始する前に、Storybook MCPサーバーの利用可能性を確認する。

**MCP利用可能な場合:**

- MCPサーバーからの指示に従って開発を進める

**MCP利用不可の場合（フォールバック）:**

- 以下のStory-First開発手順に従う

### Step 2: Story-First開発

#### 2a. 既存コンポーネントの修正

1. 対象コンポーネントの既存Storyを確認する (`webview-ui/stories/`)
2. 必要に応じて新しいStoryバリエーションを追加
3. Storyのplay functionでインタラクションテストを記述
4. コンポーネントを修正
5. Storybookテストを実行して確認

#### 2b. 新規コンポーネントの作成

1. `/component-create <コンポーネント名>` スキルを使用してテンプレートを生成
2. Story（`webview-ui/stories/<Name>.stories.tsx`）を先に完成させる
3. play functionでユーザーインタラクションを定義
4. コンポーネントを実装してStoryが動くようにする
5. テーマバリエーション（Light/Dark）のStoryを追加

### Step 3: テーマバリエーション

すべてのコンポーネントStoryには、以下のテーマバリエーションを含めること:

```tsx
export const LightTheme: Story = {
  args: {
    /* props */
  },
  decorators: [
    (Story) => (
      <div data-theme="light">
        <Story />
      </div>
    ),
  ],
  name: "ライトテーマ",
};

export const DarkTheme: Story = {
  args: {
    /* props */
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: "#1e1e1e" }}>
        <Story />
      </div>
    ),
  ],
  name: "ダークテーマ",
};
```

### Step 4: play function（必須）

すべてのStoryには `play` functionを含めること。参考パターン:

```tsx
play: async ({ canvasElement, args }) => {
  const canvas = within(canvasElement);

  // 要素が表示されることを確認
  await waitFor(async () => {
    await expect(canvas.getByText("テキスト")).toBeInTheDocument();
  });

  // ユーザーインタラクション
  await userEvent.click(canvas.getByRole("button"));

  // コールバックが呼ばれたことを検証
  await expect(args.onClick).toHaveBeenCalledTimes(1);
},
```

### Step 5: テスト実行

```bash
cd ./webview-ui

# Storybookテスト
npm run test:story

# ユニットテスト
npm run test:unit
```

## Storyのimport規約

```tsx
// 外部パッケージ
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within, waitFor, fireEvent } from "storybook/test";
// ローカルインポート
import { Component } from "@/components/Component/Component";
```

- グループ間の空行は不要
- 同グループ内はアルファベット順

## 参考Story

- `webview-ui/stories/ContextMenu.stories.tsx` — play function・テーマバリエーションの参考実装
