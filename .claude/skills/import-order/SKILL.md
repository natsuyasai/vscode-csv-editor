---
description: "ESLint import/order規約の詳細リファレンス（Claude自動参照用）"
user-invocable: false
---

# import/order 規約

このプロジェクトのESLint `import/order` ルール設定と正しい書き方のリファレンスです。

## ESLint設定

```javascript
"import/order": ["error", {
  "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
  "newlines-between": "never",
  "alphabetize": { "order": "asc", "caseInsensitive": true }
}]
```

## ルール詳細

| 項目 | 設定 |
|------|------|
| グループ順 | builtin → external → internal → parent → sibling → index |
| グループ間の空行 | **なし** (`newlines-between: "never"`) |
| 同グループ内の順序 | **アルファベット昇順** (大文字小文字区別なし) |

## 正しい例

### ソースファイル (.tsx)

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Component.module.scss";
```

### テストファイル (.spec.ts)

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { myFunction } from "@/path/to/module";
```

### Storyファイル (.stories.tsx)

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within, waitFor, fireEvent } from "storybook/test";
import { Component } from "@/components/Component/Component";
```

## 間違いやすいパターン

### NG: グループ間に空行がある

```typescript
import { describe, expect, it } from "vitest";

import { myFunction } from "@/path/to/module";  // ← 空行はNG
```

### OK: 空行なし

```typescript
import { describe, expect, it } from "vitest";
import { myFunction } from "@/path/to/module";
```

### NG: アルファベット順でない

```typescript
import { render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";  // ← 同じパッケージは1つにまとめる
```

### NG: `type` importの位置が間違い

```typescript
import { Component } from "@/components/Component";
import type { Meta } from "@storybook/react-vite";  // ← externalが先
```

### OK: type importもアルファベット順に配置

```typescript
import type { Meta } from "@storybook/react-vite";
import { Component } from "@/components/Component";
```

## パスエイリアス

- `@/` → `webview-ui/src/` (internal グループ)
- `@message/` → `src/message/` (internal グループ)
