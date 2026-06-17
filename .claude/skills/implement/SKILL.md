---
description: "開発フロー[3] 作業ブランチを作成し実装を開始。実装はサブエージェントへ委譲しメインはレビュー、TDDで多層テストを作成、作業毎にコミットする"
user-invocable: true
arg: "実装対象（.tmp/plans/<feature>.md のプラン名）"
---

# 実装作業（フロー Phase 3）

承認済みプラン（`.tmp/plans/<feature>.md`）に従って実装を進める。
**メインエージェントは実装を直接書かず、サブエージェントへ委譲し、レビューと全体管理に徹する。**

## 手順

### Step 1: 作業用ブランチの作成

```bash
git checkout -b <type>/<feature>   # 例: feat/csv-export, fix/column-resize
```

### Step 2: 実装のサブエージェント委譲（メインはレビュー）

- プランの実装ステップ単位で **サブエージェント（Agent ツール）に作業を委譲** する。
- 委譲時にサブエージェントへ渡す情報:
  - `.tmp/plans/<feature>.md` のパスと該当ステップ
  - 「t-wada 推奨 TDD（Red→Green→Refactor）で進めること」
  - 後述の **多層テスト** を作成すること
  - 完了条件（該当ステップのテストが Green、lint/type/format クリーン）
- サブエージェントの成果物は **メインエージェントが必ずレビュー** してから取り込む:
  - 受け入れ条件・プランとの整合
  - TDD の手順を踏んでいるか（テスト先行）
  - テストの網羅性、コード規約（import 順 / a11y / 型安全）
  - 不備があれば差し戻し、修正を依頼する

### Step 3: TDD で実装（`/tdd` 準拠）

各ステップは Red → Green → Refactor を厳守する。詳細は `/tdd` を参照。

### Step 4: 多層テストの作成

| 種別 | 目的 | 配置（コロケーション） | 実行 |
|------|------|------------------------|------|
| vitest 単体テスト | hooks / stores / utilities / 純ロジック | `webview-ui/src/<dir>/<Name>.spec.ts(x)` | `npm run test:unit` |
| Storybook カタログ | コンポーネントの各バリエーション・テーマ | `webview-ui/src/<dir>/<Name>.stories.tsx` | Storybook |
| play function（画面単体） | 各コンポーネントのインタラクション検証 | 上記 Story 内の `play` | `npm run test:story` |
| 機能の結合テスト | 複数コンポーネント連携・機能全体 | `webview-ui/src/App.<Feature>.stories.tsx` の `play` / `webview-ui/src/<dir>/<Name>Integration.spec.tsx` | `npm run test:story` / `test:unit` |

- UI/React 開発の前に **Storybook MCP を確認**（`/storybook-dev` 参照）。
- 新規コンポーネントは `/component-create <Name>` で雛形生成。
- テスト・Story は **対象コードと同じディレクトリ** に置く（コロケーション）。Story 共通ヘルパーは `webview-ui/src/test-utils/`。

### Step 5: 作業毎にコミット

- 論理的なまとまり（プランの1ステップ）が完了し、関連テスト・lint・type・format が通るたびにコミットする。
- コミットメッセージは日本語で、何を・なぜを簡潔に記載。

## 完了条件 / 次のフェーズ

- 受け入れ条件をすべて満たす実装と多層テストが揃い、各ステップがコミット済み。
- → `/property-test`（Phase 4: プロパティベーステスト）へ進む。

## 横断ルール

- 同じ指摘がサブエージェント/レビューで **複数回（2回以上）発生** したら、`CLAUDE.md` に再発防止を追記する（`/dev-flow` 横断ルール参照）。

## 禁止事項

- メインエージェントが実装を直接書き進めること（委譲＋レビューを徹底）。
- テストを書く前に実装すること。
- テスト・lint・type が通らない状態でコミットすること。
- テスト/Story を旧 `tests/`・`stories/` ディレクトリに作ること（コロケーション必須）。
