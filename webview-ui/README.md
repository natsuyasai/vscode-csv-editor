# webview-ui

CSVエディタのWebview部分（React + Vite）です。拡張機能側（`src/`）から読み込まれ、テーブルUIを描画します。

## セットアップ

```bash
cd webview-ui
npm install
```

`postinstall` でコードアイコンのフォントを `src/icons/` にコピーします。

## 主なコマンド

| コマンド | 内容 |
| --- | --- |
| `npm start` | Vite の開発サーバーを起動（Webview 単体での確認用） |
| `npm run build` | 型チェックのうえ本番用ビルド（`build/`） |
| `npm run preview` | ビルド結果をプレビュー |
| `npm test` | Vitest をウォッチモードで実行 |
| `npm run test:unit` | 単体テストを 1 回実行（`unit` プロジェクト） |
| `npm run test:story` | Storybook のストーリーテストを実行 |
| `npm run test:property` | プロパティベーステスト（`*.property.spec.ts`）を実行 |
| `npm run storybook` | Storybook を起動（ポート 6006） |
| `npm run build-storybook` | Storybook の静的ビルド |
| `npm run check-types` | TypeScript の型チェック（`tsc --build`） |
| `npm run lint` | ESLint と markuplint を実行 |
| `npm run format` | Prettier で整形 |

## 補足

- ルートの `npm run build:webview` から本ディレクトリの `npm run build` が呼ばれ、拡張機能のパッケージに含まれます。
- テストは対象コードと同じディレクトリに配置します（コロケーション）。共通ヘルパーは `src/test-utils/` にあります。
