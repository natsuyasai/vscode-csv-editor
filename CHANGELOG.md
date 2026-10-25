# Change Log

All notable changes to the "csv-editor" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

### Changed

- webview のデータ管理を一本化し、編集のたびに行う CSV 全体の文字列化を送信・保存時まで遅延する。大きな CSV での編集を高速化 (#90)
- 編集時に変更のない行の参照と行 ID を保持し、行の安定化を図る (#90)
- 依存パッケージを更新（csv-parse 7、Vite 8、Vitest 5、jsdom 30 など）し、npm audit の指摘を解消 (#91)
- CI の Node.js を LTS 24 へ更新し、GitHub Actions を最新メジャーへ更新。型チェック・拡張機能ビルド・パッケージ検証を CI に追加 (#91, #92)

### Fixed

- ソート・フィルター中に、表示上の行位置とデータ上の行インデックスが混在して選択・コピー/貼り付け・検索・行操作が別の行を対象にする問題を修正 (#79)
- 編集内容が VSCode のドキュメントに反映されず、タブ切替や終了時に未保存の変更が失われる問題を修正 (#80)
- エディタタイトルの「Open CSV Editor」ボタンが、CSV 言語拡張のインストール時や拡張子の大文字・小文字の場合に表示されない問題を修正 (#93)
- 入力欄（セル・ヘッダーの編集中）で標準のコピー／貼り付け／元に戻すが動作するよう修正し、macOS の Cmd キーにも対応 (#84)
- 列数が揃っていない・クォートが閉じていない CSV を開くと例外で画面が真っ白になる問題を修正。エラー内容を表示し、テキストエディタで開き直せるようにした (#81)
- 保存時に元の CSV 書式が保持されない問題を修正（CRLF、BOM、末尾改行、クォートを保持） (#82)
- 空ファイルへの行・列の追加、ヘッダー行を無視する設定時の挿入位置と初期値の不具合を修正 (#83)
- Ctrl+S・Ctrl+F などの全体ショートカットが入力欄でも動作する問題を修正 (#84)
- 日本語入力（IME）中の Enter で編集が確定・終了する問題、直接入力で編集が開始できない問題を修正 (#85)
- 列・行の挿入、削除、移動時に列幅・文字寄せ・行の高さが別の列・行へずれる問題を修正 (#86)
- README 記載の行・列操作、フィルター切替のショートカット（Ctrl+Shift+H/D/I/B/L/R）が動作しない問題を修正 (#87)
- 拡張機能側のリソースリーク（テーマ変更リスナーの解除漏れ、コマンドが subscriptions に未登録）を修正 (#88)

### Security

- webview の nonce を `crypto.randomBytes` で生成するように変更 (#89)
- webview と拡張機能の間で受信するメッセージを型ガードで検証し、不正なメッセージは無視する (#89)
- csv-parse を更新して既知の脆弱性を解消、esbuild・Vite 関連の依存を更新 (#91)

### Removed

- 未使用のコード（FilterCell、useFilters、未使用の Zustand ストア、キーボード判定ユーティリティ、リロード処理など）を削除 (#94)
- 設定ファイルの不備を修正（tsconfig の outDir の綴り誤り `dsit` など） (#94)
