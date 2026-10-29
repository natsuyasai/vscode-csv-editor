---
description: "セキュリティレビューを実施する（WebView, XSS, 依存関係脆弱性, パストラバーサル）"
user-invocable: true
allowed-tools: "Read, Glob, Grep, Bash"
---

# セキュリティレビュー

CLAUDE.mdの「セキュリティルール遵守」を具体化したチェックリストに基づいてセキュリティレビューを実施します。

## チェックリスト

### 1. WebViewセキュリティ

- [ ] **CSP (Content Security Policy)** が適切に設定されている
  - `src/editor/editorProvider.ts` のWebView生成部分を確認
  - `script-src`, `style-src`, `img-src` が最小限の許可になっているか
- [ ] **postMessage検証**: WebViewが受信するメッセージのoriginを検証しているか
  - `webview-ui/src/` 内の `addEventListener("message", ...)` を検索
- [ ] **外部リソース読み込み**: 信頼できないURLからのスクリプト/スタイル読み込みがないか

### 2. XSS対策

- [ ] **dangerouslySetInnerHTML** の使用箇所を検索し、適切にサニタイズされているか確認

  ```bash
  grep -r "dangerouslySetInnerHTML" webview-ui/src/
  ```

- [ ] ユーザー入力がHTMLとしてレンダリングされる箇所でエスケープ処理が行われているか
- [ ] Markdownパーサーの出力がサニタイズされているか

### 3. 依存関係の脆弱性

- [ ] `npm audit` を実行して既知の脆弱性を確認

  ```bash
  npm audit
  cd ./webview-ui && npm audit
  ```

- [ ] 重大度(high/critical)の脆弱性がある場合は報告

### 4. パストラバーサル対策

- [ ] ファイルパスの構築にユーザー入力が使用されている箇所を確認
- [ ] `path.join()` や `path.resolve()` の引数にユーザー入力が直接渡されていないか
- [ ] `..` を含むパスの正規化・検証が行われているか

### 5. 機密情報の漏洩

- [ ] `.env` ファイルが `.gitignore` に含まれているか
- [ ] ハードコードされたAPIキー、トークン、パスワードがないか
- [ ] ログ出力に機密情報が含まれていないか

## 実行手順

1. 上記チェックリストの各項目について、Grep/Glob/Readを使って確認する
2. 問題が見つかった場合は、深刻度（Critical/High/Medium/Low）を付けて報告する
3. 修正案を提示する（ただし自動修正は行わない — 読み取り専用操作のみ）

## レポート形式

```markdown
## セキュリティレビュー結果

### 検出された問題

| #   | 深刻度 | カテゴリ | 場所 | 説明 | 推奨対応 |
| --- | ------ | -------- | ---- | ---- | -------- |
| 1   | High   | XSS      | ...  | ...  | ...      |

### 問題なしの項目

- [x] CSP設定: 適切
- [x] npm audit: 脆弱性なし
```
