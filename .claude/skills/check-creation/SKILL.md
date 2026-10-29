---
description: "品質チェック（test, lint, typecheck, format）をルートとwebview-uiの両方で実行"
user-invocable: true
---

# 品質チェック (check-creation)

プロジェクト全体の品質チェックを実行します。ルートディレクトリとwebview-uiディレクトリの両方で以下を実施してください。

## 実行手順

### 1. ルートディレクトリ（VSCode拡張機能）

```bash
npm run format
npm run check-types
npm run lint
npm test
```

### 2. webview-uiディレクトリ（React UI）

```bash
cd ./webview-ui
npm run format
npm run check-types
npm run lint
npm run test:unit
```

## エラー修正の優先順位

1. **型エラー (check-types)**: 最優先で修正。型定義の不整合はビルドエラーに直結する
2. **Lintエラー (lint)**: 次に修正。import/orderエラーはPrettierやauto-fixで解決可能な場合が多い
3. **テスト失敗 (test)**: テストコードまたは実装コードを修正
4. **フォーマット (format)**: Prettierで自動修正

## 禁止事項

- `eslint-disable` コメントは可能な限り使用しないでください
- やむを得ず使用する場合は、必ず理由を明記したコメントを付与してください（例: `// eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Context menu trigger requires onContextMenu handler`）
- `@ts-ignore` / `@ts-expect-error` も同様に最小限にしてください

## 完了条件

- すべてのチェックがエラー・警告なしで通過すること
- すべての対応が完了した後、**再度すべてのチェックを実行**し、エラーがないことを最終確認すること
