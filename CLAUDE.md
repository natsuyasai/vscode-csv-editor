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

## 開発手順

アプリ開発は以下の標準フローに従って進めてください。各フェーズには対応するスキルがあり、`/dev-flow` がフロー全体を統括します。

1. **要求内容を明確にする** — `/clarify-requirements`（背景・目的・受け入れ条件を確定。疑問は中断して質問）
2. **実装プランを策定する** — `/plan`（複数案はどれで進めるか確認。別セッションへ引き継げるよう一時ドキュメントを `.tmp/plans/<feature>.md` に出力）
3. **実装作業** — `/implement`（作業用ブランチを作成。実装はサブエージェントに委譲しメインはレビュー・全体管理。t-wada推奨TDDで、vitest単体テスト・Storybookカタログ・play functionによる画面単体テスト・機能の結合テストを作成。作業毎にコミット）
4. **プロパティベーステスト** — `/property-test`（仕様が明確かつコードから実装可能な場合に作成）
5. **最終チェック** — `/check-creation`（フォーマッター適用・テスト実行・型/lint・ビルド確認）

テスト・Story は対象コードと同じディレクトリに配置（コロケーション）。共通ヘルパーは `webview-ui/src/test-utils/`。


## プロジェクト構造

これはReactベースのwebview UIを持つカスタムCSVエディタを提供するVSCode拡張機能です。この拡張機能はデュアルアーキテクチャアプローチを使用しています:

- **拡張機能側** (`src/`): VSCodeの拡張機能ホストで実行されるTypeScriptコード
- **Webview側** (`webview-ui/`): CSVエディタインターフェースをレンダリングするReactアプリケーション

### 主要なコンポーネント:

- `CSVEditorProvider`はVSCodeの`CustomTextEditorProvider`インターフェースを実装
- Reactアプリは編集可能なテーブルインターフェースに`tanstack/react-table`を使用
- 拡張機能とwebview間の通信はpostMessage APIを介して行う
- 状態管理にはZustand、データ操作にはカスタムフックを使用

## 通信アーキテクチャ

メッセージパッシングは`src/message/`内の型付きインターフェースを使用します:
- `messageTypeToWebview.ts`: 拡張機能 → Webview メッセージ (init, update, updateTheme)
- `messageTypeToExtention.ts`: Webview → 拡張機能 メッセージ (init, update, reload, save)
- データフロー: VSCode Document ↔ Extension ↔ Webview (デバウンス更新あり)

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