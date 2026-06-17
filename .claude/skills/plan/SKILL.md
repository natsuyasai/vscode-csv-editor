---
description: "開発フロー[2] 明確化した要求から実装プランを策定。複数案は確認し、別セッションに引き継げる一時ドキュメントを.tmp/plans/に出力する"
user-invocable: true
arg: "プラン対象の機能名（.tmp/plans/<feature>.md のファイル名に使う）"
---

# 実装プラン策定（フロー Phase 2）

`/clarify-requirements` で確定した受け入れ条件を元に、実装プランを策定する。

## 目的

- 実装の進め方を具体化し、ユーザー承認を得る。
- **複数案がある場合は、どの案で進めるかを確認する。**
- 作業を **別セッションにも引き継げるよう、一時ドキュメントとして出力** する。

## 手順

### Step 1: 設計検討

1. 受け入れ条件を満たすための実装方針を検討する。
2. 既存の関数・hooks・ユーティリティ・コンポーネントで再利用できるものを優先する（新規追加は最小限に）。
3. 影響ファイル、テスト戦略（vitest 単体 / Storybook カタログ / play function / 結合）、リスクを整理する。

### Step 2: 複数案がある場合の確認

- 実現方針が複数考えられる場合は、各案のトレードオフ（複雑さ・保守性・パフォーマンス・工数）を整理し、**AskUserQuestion でどの案を採用するか確認する**。
- 推奨案を先頭に提示し、理由を添える。

### Step 3: 一時プランドキュメントの出力

承認・確定した内容を `.tmp/plans/<feature>.md` に出力する（`.tmp/` は gitignore 済み。別セッションでもこのファイルを読めば作業を継続できる）。

```markdown
# <機能名> 実装プラン

## 背景 / 目的
（なぜこの変更を行うか）

## 受け入れ条件
- [ ] ...

## 採用方針
（複数案から選んだ案と、その理由）

## 影響ファイル
- webview-ui/src/... / src/...

## 実装ステップ（コミット単位）
1. ...
2. ...

## テスト戦略
- vitest 単体: src/.../<Name>.spec.ts(x)
- Storybook カタログ: src/.../<Name>.stories.tsx
- play function（画面単体）: 各 Story の play
- 結合テスト: src/App.<Feature>.stories.tsx の play / src/.../<Name>Integration.spec.tsx
- プロパティベーステスト（可能なら）: src/.../<Name>.property.spec.ts

## 検証手順
- npm run check-types / lint / test:unit / test:story / build / build-storybook
```

## 完了条件 / 次のフェーズ

- プラン文書が `.tmp/plans/<feature>.md` に保存され、ユーザーが実装開始を承認した。
- → `/implement`（Phase 3: 実装）へ進む。

## 禁止事項

- ユーザー承認前に実装を始めること。
- 複数案があるのに独断で1案に決めて進めること。
- 引き継ぎ文書を出力せずに実装へ進むこと。
