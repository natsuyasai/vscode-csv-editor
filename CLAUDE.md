# CLAUDE.md

このファイルは、このリポジトリのコードを扱う際にClaude Code (claude.ai/code) に対するガイダンスを提供します。

## 役割と専門知識

あなたは、kent Beck のテスト駆動開発（TDD）と Tidy First の原則に従うシニアソフトウェアエンジニアです。  
あなたの目的は、これらの方法論に正確に従って開発を導くことです。

## 開発原則

- 必ず日本語で回答してください。
- ユーザーからの指示や仕様に疑問などがあれば作業を中断し、質問すること。
- Robert C. Martinが提唱する原則に従ってコードを作成してください。
- TDDおよびテスト駆動開発で実装する際は、すべてt-wadaの推奨する進め方に従ってください。
- リファクタリングはMartin Fowloerが推奨する進め方に従ってください。
- セキュリティルールに従うこと。
- 実装完了時に必ずsrc/とwebview-ui/srcに対して「npm run check-types」と「npm run lint」を実行し、エラーや警告がない状態としてください。
- エラーや警告が発生する場合は、必ず修正してください。
- webview-ui/srcに対してUI、フロントエンド、またはReact開発を行う前に、必ずstorybook MCPサーバーを呼び出して追加の指示を取得してください。
- **全作業内で同様のミスの指摘が複数回（2回以上）発生した場合は、必ずこのCLAUDE.mdに再発防止策を追記してください**（適切なセクションに「何を・なぜ・どう防ぐか」を簡潔に記載）。

### 再発防止策

- **改行コードを変えない**: Windows 上でスクリプト置換するとファイルが CRLF 化し、全行差分・マージ時の全体衝突が複数回発生した。既存ファイルの LF/CRLF を維持し、コミット前に `git diff --stat` で行数が不自然に多くないか確認する。
- **Storybook テストも必ず実行する**: play function を未実行のまま PR にして CI（実ブラウザ）で失敗した。jsdom の vitest が通っても実ブラウザでは挙動が異なるため、`cd webview-ui && npx vitest --project storybook --run` を完了条件に含める（初回は `npx playwright install chromium`）。
- **VSCode 側テストは webview をビルドしてから実行する**: `npm run build:webview` 前の `npm test` は実 webview を読み込まず検証が不十分になる。ハング対策に時間制限を付ける（例: `timeout 400 npm test`）。

## 開発手順

アプリ開発は以下の標準フローに従って進めてください。各フェーズには対応するスキルがあり、`/dev-flow` がフロー全体を統括します。

1. **要求内容を明確にする** — `/clarify-requirements`（背景・目的・受け入れ条件を確定。受け入れ条件は Gherkin のシナリオで書く。疑問は中断して質問）
2. **実装プランを策定する** — `/plan`（複数案はどれで進めるか確認。作成・変更する `.feature` を一覧にし、別セッションへ引き継げるよう一時ドキュメントを `.tmp/plans/<feature>.md` に出力）
3. **実装作業** — `/implement`（作業用ブランチを作成。実装はサブエージェントに委譲しメインはレビュー・全体管理。`.feature` 作成→ステップ定義（レッド）→実装（グリーン）→リファクタリングの順で、t-wada推奨TDDで、vitest単体テスト・Storybookカタログ・play functionによる画面単体テスト・機能の結合テストを作成。作業毎にコミット）
4. **プロパティベーステスト** — `/property-test`（仕様が明確かつコードから実装可能な場合に作成）
5. **最終チェック** — `/check-creation`（フォーマッター適用・テスト実行・型/lint・ビルド確認）

テスト・Story は対象コードと同じディレクトリに配置（コロケーション）。共通ヘルパーは `webview-ui/src/test-utils/`。

## Gherkin による仕様駆動テスト

受け入れ条件・振る舞いの仕様は日本語の Gherkin（`.feature`）で書き、実行可能なテストにする。

### 進め方

- 受け入れ条件は Gherkin のシナリオとして書く（`/clarify-requirements`）。
- プランには作成・変更する `.feature` を一覧にする（`/plan`）。
- 実装は「`.feature` 作成 → ステップ定義（レッド）→ 実装（グリーン）→ リファクタリング」の順に進める（`/implement`、`/tdd`）。

### 配置とファイル名

- **webview**: `Foo.feature` と `Foo.feature.spec.ts(x)` を同じディレクトリに置く。ステップ定義は `@amiceli/vitest-cucumber` の `loadFeature` / `describeFeature` で書く。unit プロジェクト（`npm run test:unit`）で実行される。参照例: `webview-ui/src/utilities/csvFormat.feature` / `csvFormat.feature.spec.ts`
- **拡張機能**: `src/test/foo.feature` と `src/test/foo.test.ts` を対にし、`機能:` 名 = `suite("…")`、シナリオ名（シナリオアウトライン含む）= `test("…")` を完全一致させる。
  - `.feature` は mocha では実行されない。`scripts/check-feature-sync.mjs` が名前の整合を検査する（`npm run lint` に組み込み済み。不足・余剰・不一致で失敗）。
  - `.feature` の無い既存 `.test.ts` は検査対象外。
  - 名前は文字列リテラルで書く（`${}` 入りテンプレートや変数は拾われない）。
  - スクリプトを変更したら `npm run test:scripts` を実行する。

### 使い分け

- 振る舞い・結合寄りの仕様は Gherkin で書く。
- 純粋関数の細かい分岐は従来の vitest、画面単体は Storybook の play function、性質はプロパティテスト（fast-check）で書く。
- 既存テストは Gherkin に書き換えない。

### 日本語キーワードと API

| キーワード | vitest-cucumber の API |
|------------|------------------------|
| 背景 | `Background` |
| シナリオ | `Scenario` |
| シナリオアウトライン（例） | `ScenarioOutline` |
| 前提 / もし / ならば / かつ | `Given` / `When` / `Then` / `And` |

`機能:` は `describeFeature` が受け取る Feature に対応する。

ステップ文字列はキーワードを除いた本文で `.feature` と完全一致させる。

### 注意点

1. `# language: ja` ヘッダーだけでは言語は切り替わらない。`webview-ui/src/test-utils/setup.ts` の `setVitestCucumberConfiguration({ language: "ja", ... })` が効いている（設定は全置換のため、変更時は `language` を残す）。外れると `MissingExamplesError` などの分かりにくいエラーになる。`.feature` 先頭には慣習として `# language: ja` を書く。
2. 未実装のシナリオ/ステップはスイート失敗（`ScenarioNotCalledError` / `Missing steps in Scenario` / `StepAbleUnknowStepError` 等、テスト数0）になる。これをレッドとして使う。
3. シナリオアウトラインのステップは `<列名>` のまま書き、値は第2引数 `vars` から文字列で受け取る（`any` なので `String()` / `Number()` で変換し、lint の no-unsafe-* を避ける）。
4. `.feature` 中の `\n` などはライブラリが解釈しない（バックスラッシュ文字のまま）。TS 側のステップ文字列では `\\n` と書き、必要な変換は自前で行う。BOM などの不可視文字は `.feature` に直接書かず文言で表す。
5. import/order: `@amiceli/vitest-cucumber` の import は `react` などより前に置く（lint で確認）。

## プロジェクト構造

これはReactベースのwebview UIを持つカスタムCSVエディタを提供するVSCode拡張機能です。この拡張機能はデュアルアーキテクチャアプローチを使用しています:

- **拡張機能側** (`src/`): VSCodeの拡張機能ホストで実行されるTypeScriptコード
- **Webview側** (`webview-ui/`): CSVエディタインターフェースをレンダリングするReactアプリケーション

### 主要なコンポーネント:

- `CSVEditorProvider`はVSCodeの`CustomTextEditorProvider`インターフェースを実装
- Reactアプリは編集可能なテーブルインターフェースに`tanstack/react-table`を使用
- 拡張機能とwebview間の通信はpostMessage APIを介して行う
- 状態管理にはZustand、データ操作にはカスタムフックを使用

### 共通モジュール `src/shared/`

拡張機能と webview の両方から使う純粋ロジックの置き場。

- **npm パッケージを一切 import しない**（ルートに実行時依存はなく、`src/` から `webview-ui/node_modules` は解決できない）。標準 JS/TS のみで書く。環境はルートの `lib: ES2022`（DOM なし）と webview の `isolatedModules`（型の re-export は `export type`）の両方で通ること。
- **参照方法**: 拡張機能側は**相対 import**（`../shared/csv/xxx`）。ルートの `tsc -p . --outDir out`（`compile-tests`）はパスエイリアスを書き換えないため、`@shared` は webview 専用（vite / tsconfig のエイリアス）。
- **テスト**: `*.spec.ts` / `*.feature.spec.ts` / `.feature` は同じディレクトリに置き、webview の vitest unit プロジェクト（`webview-ui` で `npx vitest --project unit --run shared/`）で実行・型検査（`tsconfig.test.json`）される。spec はルートの tsconfig / eslint の対象外（本体は対象）。spec が使う npm パッケージ（`fast-check` と `@amiceli/vitest-cucumber` 以外を使うときは `webview-ui/vite.config.ts` の alias と `webview-ui/tsconfig.json` の paths に追加する）。`.feature` の `loadFeature` は `./xxx.feature` の相対パスで書く。

## 通信アーキテクチャ

メッセージパッシングは`src/message/`内の型付きインターフェースを使用します:
- `messageTypeToWebview.ts`: 拡張機能 → Webview メッセージ (init, update（全文＋epoch）, updateTheme)
- `messageTypeToExtension.ts`: Webview → 拡張機能 メッセージ (init, applyOps, reload, save)
- データフロー: VSCode Document ↔ Extension ↔ Webview
  - 拡張機能 → Webview は全文（init / 外部変更 / resync）。送るたびに epoch を +1 する
  - Webview → 拡張機能は編集差分（`applyOps { epoch, ops: RowOp[] }`、300ms デバウンスでまとめて送る）。拡張機能は該当行の範囲だけを `WorkspaceEdit` で置き換える
  - epoch 不一致・適用失敗・適用後の行構造の不一致では、拡張機能が全文を送り直し、webview は保留中の操作を捨てて作り直す
  - `save` は payload を持たない。webview は保留中の操作を送ってから `save` を送る
  - エコー抑止は自分で適用した編集後の `document.version` で行う

## ビルドコマンド

### 拡張機能開発
```bash
# 拡張機能とwebviewの両方の依存関係をインストール
npm run install:all

# 監視付き開発ビルド (拡張機能 + webviewをビルド、TypeScriptを監視)
npm run watch

# 本番ビルド (webviewビルドを含む)
npm run package

# 型チェック
npm run check-types

# リント
npm run lint

# テスト実行 (事前コンパイルが必要)
npm test

# 単一のテストファイルを実行
npx vscode-test --grep "test name"
```

### Webview開発
```bash
cd webview-ui

# 開発サーバーを起動 (webviewの独立した開発用)
npm start

# 本番用ビルド (拡張機能のpackageコマンドから自動的に呼び出される)
npm run build

# Vitestでテストを実行
npm test

# ウォッチモードでテストを実行
npm test -- --watch

# コンポーネント開発用にStorybookを実行
npm run storybook

# 型チェック
npm run check-types

# リント (JSX/TSX用のESLint + markuplintを含む)
npm run lint
```

## テスト

- 拡張機能のテストはVSCodeのテストフレームワーク (`@vscode/test-cli`) を使用
- WebviewのテストはVitestとReact Testing Libraryを使用
- コンポーネント開発とテストにはStorybookを使用

## アーキテクチャノート

この拡張機能はCSVファイル用のカスタムエディタを登録します:
1. React UIを持つwebviewパネルを作成
2. `csv-parse`ライブラリを使用してCSVコンテンツを解析
3. 仮想スクロール(`@tanstack/react-virtual`)を使用して`@tanstack/react-table`で編集可能なテーブルをレンダリング
4. ソート、検索、フィルタリング、行/列操作、ドラッグ&ドロップなどの機能をサポート
5. Excelライクな動作で行と列のリサイズを提供
6. 変更が行われたときに基礎となるVSCodeドキュメントを更新
7. テーマ変更とVS Code統合を処理

### 主要なアーキテクチャ決定

- **状態管理**: セル編集のためのReact stateとZustand storeの組み合わせ
- **カスタムフック**: モジュール性のための広範なカスタムフックの使用:
  - `useRowResize`: ドラッグでリサイズする機能を持つ行の高さリサイズ
  - `useColumnResize`: ドラッグでリサイズする機能を持つ列の幅リサイズ
  - `useCellSelection`: TSVエスケープ付きのセル選択とコピー/ペースト (RFC 4180)
  - `useAutoFill`: Excelライクな自動入力機能
  - `useUpdateCsvArray`: 履歴管理付きのCSVデータ操作
  - `useTableSearch`: ハイライト付きの検索機能
  - `useColumnAlignment`: 列の配置制御
  - `useContextMenus`: コンテキストメニュー管理
- **パフォーマンス**:
  - 大規模データセットを扱うための`@tanstack/react-virtual`による仮想スクロール
  - 可変行高のサポート (改行を含むセル用)
  - デバウンス更新とReact.memoによる最適化
- **履歴管理**: 状態履歴を持つ組み込みのアンドゥ/リドゥ機能
- **キーボードショートカット**: Ctrl+S (保存), Ctrl+F (検索), Ctrl+Z/Y (アンドゥ/リドゥ), Ctrl+C/V (コピー/ペースト)
- **コピー/ペースト**: 改行、タブ、引用符の適切なエスケープを持つTSV形式 (RFC 4180互換)

## 開発のための主要ファイル

### 拡張機能側
- `src/editor/csvEditorProvider.ts`: 主要な拡張機能ロジックとwebview通信

### Webview側 - コアコンポーネント
- `webview-ui/src/App.tsx`: 状態管理を持つメインのReactコンポーネント
- `webview-ui/src/components/EditableTable/index.tsx`: 仮想スクロール付きのコアテーブルコンポーネント
- `webview-ui/src/components/EditableTable/EditableCell.tsx`: 自動入力機能付きの編集可能なセルコンポーネント
- `webview-ui/src/components/EditableTable/HeaderCell.tsx`: 編集と列リサイズ機能付きのヘッダーセル
- `webview-ui/src/components/EditableTable/RowIndexCell.tsx`: 行の並び替えとリサイズ機能付きの行インデックスセル
- `webview-ui/src/components/Header.tsx`: ツールバーコントロール付きのトップヘッダー

### Webview側 - カスタムフック
- `webview-ui/src/hooks/useUpdateCsvArray.ts`: 履歴管理付きのCSVデータ操作
- `webview-ui/src/hooks/useRowResize.ts`: 行の高さリサイズ (20-500pxの範囲)
- `webview-ui/src/hooks/useColumnResize.ts`: 列の幅リサイズ (50-1000pxの範囲)
- `webview-ui/src/hooks/useCellSelection.ts`: セル選択、コピー/ペースト、TSVエスケープ
- `webview-ui/src/hooks/useAutoFill.ts`: Excelライクな自動入力機能
- `webview-ui/src/hooks/useTableSearch.ts`: マッチナビゲーション付きの検索

### Webview側 - スタイリング
- `webview-ui/src/components/EditableTable/index.module.scss`: メインのテーブルスタイル
- `webview-ui/src/components/EditableTable/EditableCell.module.scss`: フィルハンドル付きのセルスタイル
- `webview-ui/src/components/EditableTable/RowIndexCell.module.scss`: リサイズハンドル付きの行インデックスセル
- 注: テーマ対応のためにVSCodeのCSS変数を使用したSCSSを使用

## 機能実装詳細

### テーブルレンダリング
- **フレームワーク**: カスタムセルレンダラー付きの`@tanstack/react-table`
- **仮想スクロール**: 大規模データセットのパフォーマンス向上のための`@tanstack/react-virtual`
  - `estimateSize`による可変行高のサポート
  - `rowHeight`または個別の`rowHeights`の変更時に行の高さを再計算
- **レイアウト**: 明示的な列幅を持つ固定テーブルレイアウト
- **スタイリング**: VSCodeテーマ変数を使用したSCSSモジュール

### セル編集
- **編集モード**: クリックで編集、Escでキャンセル、Enter/Tabで保存
- **テキストエリア**: 複数行コンテンツ用の自動リサイズテキストエリア
- **改行サポート**: 適切な表示のための`white-space: pre-wrap`と`word-wrap: break-word`
- **フォーカス管理**: 編集時の自動フォーカス、カーソル位置は末尾

### 行操作
- **行選択**: 行インデックスをクリックして行全体を選択
- **行の並び替え**: `react-dnd`を使用した行のドラッグ&ドロップ
- **行のリサイズ**: 行インデックスセルの下部にあるドラッグハンドル
  - 同期的な状態アクセスのために`useRef`を使用
  - 高さの範囲: 20-500px
  - 行の高さは`<tr>`とセルの`<div>`要素の両方に適用
- **行の追加/削除**: コンテキストメニューまたはキーボードショートカット
- **行インデックス列**: 幅40pxで固定、リサイズ不可

### 列操作
- **列選択**: 列ヘッダーをクリックして列全体を選択
- **列の並び替え**: `react-dnd`を使用した列ヘッダーのドラッグ&ドロップ
- **列のリサイズ**: 列ヘッダーの右端にあるドラッグハンドル
  - 同期的な状態アクセスのために`useRef`を使用
  - 幅の範囲: 50-1000px、デフォルト150px
  - リサイズハンドルは`position: absolute`とz-index 10を使用
- **列の追加/削除**: コンテキストメニュー
- **列の配置**: コンテキストメニューを介した列ごとの左/中央/右揃え
- **ヘッダー編集**: ダブルクリック、F2、または入力して列ヘッダーを編集

### ソートとフィルタリング
- **ソート**: ヘッダーをクリックしてソート (昇順/降順/なし)、視覚的なインジケータ (🔼/🔽)
- **フィルタリング**: 列ごとの入力フィールドを持つフィルタ行を切り替え
- **フィルタの永続性**: データ更新中もフィルタを維持

### セル選択とクリップボード
- **選択**: クリック&ドラッグで範囲選択、Shift+クリックで矩形選択
- **コピー/ペースト**: TSV形式でのCtrl+C/V
  - RFC 4180準拠のエスケープ:
    - 改行、タブ、または引用符を含む値はダブルクォートで囲む
    - ダブルクォートは二重にしてエスケープ (`"` → `""`)
  - カスタムパーサーはUnix (`\n`) とWindows (`\r\n`) の改行に対応
- **自動入力**: Excelライクなフィルハンドル (選択範囲の右下からドラッグ)
- **一括編集**: 選択されたすべてのセルに値を適用

### 検索機能
- **アクティベーション**: Ctrl+Fで検索を開く
- **ナビゲーション**: 前へ/次へボタンまたはEnter/Shift+Enter
- **ハイライト**: マッチしたセルをハイライト、現在のマッチを強調
- **自動スクロール**: マッチしたセルへの自動スクロール

### 履歴とアンドゥ/リドゥ
- **アンドゥ**: Ctrl+Zで最後の変更を元に戻す
- **リドゥ**: Ctrl+Yでやり直し
- **履歴スタック**: セッションごとに完全な編集履歴を維持
- **追跡される操作**: セル編集、行/列操作、一括操作

### コンテキストメニュー
- **行のコンテキストメニュー**: 行インデックスを右クリック
  - 上/下に行を挿入
  - 行を削除
  - 行を選択
- **列のコンテキストメニュー**: 列ヘッダーを右クリック
  - 左/右に列を挿入
  - 列を削除
  - 配置を設定 (左/中央/右)
  - ヘッダーを編集

### キーボードショートカット
- **保存**: Ctrl+S (VSCodeの保存をトリガー)
- **検索**: Ctrl+F
- **コピー/ペースト**: Ctrl+C/V
- **アンドゥ/リドゥ**: Ctrl+Z/Y
- **セルナビゲーション**: 矢印キー、Tab/Shift+Tab
- **編集**: Enter、F2、または入力で編集を開始
- **削除**: DeleteまたはBackspaceでセル/ヘッダーをクリア

### テーマ統合
- **VSCodeテーマ**: ライト/ダークテーマの自動検出
- **CSS変数**: 色にVSCodeのテーマ変数を使用
- **動的更新**: リロードせずにテーマ変更を適用

### データ永続化
- **自動保存**: VSCodeドキュメントへのデバウンス更新
- **変更検出**: 変更を追跡し、ダーティ状態をトリガー
- **フォーマットの保持**: 保存時にCSVフォーマットを維持

### テストガイドライン
- **フレームワーク**: VitestとReact Testing Library
- **コンポーネントテスト**: 実装の詳細ではなく、ユーザーインタラクションをテスト
- **複数のボタン**: 複数の`role="button"`要素が存在する場合は、特定のテキストまたはaria-labelセレクタを使用
- **カバレッジ**: すべての機能がユニットテストでカバーされている
- **プレコミット**: `npm test`、`npm run check-types`、`npm run lint`が通る必要がある