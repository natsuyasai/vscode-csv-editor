---
description: "プロジェクト規約に準拠したReactコンポーネント一式を作成する"
user-invocable: true
arg: "コンポーネント名（PascalCase）"
---

# Reactコンポーネント作成

プロジェクトの規約に沿って、Reactコンポーネント一式（5ファイル）を作成します。

## 作成するファイル

`$ARGUMENTS` というコンポーネント名で以下を作成:

1. `webview-ui/src/components/$ARGUMENTS/$ARGUMENTS.tsx` — コンポーネント本体
2. `webview-ui/src/components/$ARGUMENTS/$ARGUMENTS.module.scss` — CSS Modules
3. `webview-ui/src/components/$ARGUMENTS/index.ts` — バレルエクスポート
4. `webview-ui/stories/$ARGUMENTS.stories.tsx` — Storybook Story
5. `webview-ui/tests/components/$ARGUMENTS.spec.tsx` — ユニットテスト

## テンプレート

### 1. コンポーネント本体 (`$ARGUMENTS.tsx`)

```tsx
import styles from "./$ARGUMENTS.module.scss";

export interface ${ARGUMENTS}Props {
  // propsをここに定義
}

export function $ARGUMENTS({ /* props */ }: ${ARGUMENTS}Props) {
  return (
    <div className={styles.container}>
      {/* コンポーネントの内容 */}
    </div>
  );
}
```

### 2. CSS Modules (`$ARGUMENTS.module.scss`)

```scss
.container {
  // スタイル定義
}
```

### 3. バレルエクスポート (`index.ts`)

```typescript
export { $ARGUMENTS } from "./$ARGUMENTS";
export type { ${ARGUMENTS}Props } from "./$ARGUMENTS";
```

### 4. Storybook Story (`$ARGUMENTS.stories.tsx`)

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { $ARGUMENTS } from "@/components/$ARGUMENTS/$ARGUMENTS";

const meta: Meta<typeof $ARGUMENTS> = {
  title: "Components/$ARGUMENTS",
  component: $ARGUMENTS,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof $ARGUMENTS>;

export const Default: Story = {
  args: {
    // デフォルトのprops
  },
  name: "デフォルト",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // インタラクションテストを記述
  },
};

export const LightTheme: Story = {
  args: {
    // props
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
    // props
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

### 5. ユニットテスト (`$ARGUMENTS.spec.tsx`)

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { $ARGUMENTS } from "@/components/$ARGUMENTS/$ARGUMENTS";

describe("$ARGUMENTS", () => {
  it("正しくレンダリングされる", () => {
    render(<$ARGUMENTS />);
    // 検証
  });
});
```

## 注意事項

### import順序

- 外部パッケージ → vitest/storybook → ローカルインポートの順
- 同グループ内はアルファベット順
- グループ間の空行は不要

### アクセシビリティ (jsx-a11y/strict)

以下のチェックリストを確認:

- [ ] インタラクティブ要素には適切なrole属性がある
- [ ] ボタンやリンクにはアクセシブルな名前がある
- [ ] フォーム要素にはlabelが関連付けられている
- [ ] 画像にはalt属性がある
- [ ] キーボード操作が可能である

### 既存パターンの参考

- `ContextMenu` コンポーネントの構造を参考にしてください
- play function付きStoryの書き方は `webview-ui/stories/ContextMenu.stories.tsx` を参照
