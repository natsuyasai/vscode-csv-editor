---
description: "開発フロー[4] 実装完了後、仕様が明確かつコードから実装可能な場合にfast-checkでプロパティベーステストを作成する"
user-invocable: true
arg: "プロパティベーステスト対象のモジュール/機能名"
---

# プロパティベーステスト（フロー Phase 4）

実装完了後、**仕様が明確かつ対応コードの内容から実装可能** な場合に、`fast-check` を用いたプロパティベーステスト（PBT）を作成する。

## 作成可否の判断（最初に行う）

以下を **すべて満たす** 場合のみ作成する:

- 仕様（入力に対して常に成り立つべき性質）が明確に言語化できる。
- 入力をランダム生成でき、出力の検証可能な不変条件が存在する。
- 対象が純粋関数 / 決定的なロジック（hooks の純粋部分、変換・パース・整形、データ構造操作 等）。

満たさない場合（仕様が曖昧、副作用が支配的で性質を定義できない 等）は **無理に作成せず、その理由を報告** する。

## 適した対象の例

- CSV/TSV のパース・整形・エスケープ（RFC 4180 ラウンドトリップ等）
- セル選択範囲・並び替え・フィルタ・検索のデータ操作
- 履歴（undo/redo）の不変条件
- 列/行リサイズの範囲クランプ（min/max 内に収まる 等）

## 典型的なプロパティ

- **ラウンドトリップ**: `parse(stringify(x)) === x`
- **不変条件**: 出力が常に制約内（例: 幅は 50〜1000px）
- **冪等性**: `f(f(x)) === f(x)`
- **可換性 / 結合性**: 操作順に依存しない性質
- **対称性**: undo→redo で元に戻る

## 配置と書き方

- ファイル: `webview-ui/src/<dir>/<Name>.property.spec.ts`（対象コードとコロケーション）
- 既存の参考: `webview-ui/src/hooks/*.property.spec.ts`

```typescript
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { targetFn } from "@/path/to/module";

describe("targetFn のプロパティ", () => {
  it("常に <不変条件> を満たす", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (input) => {
        const result = targetFn(input);
        expect(/* 不変条件 */).toBe(true);
      })
    );
  });
});
```

## 実行

```bash
cd ./webview-ui
npm run test:property        # property.spec のみ実行
npm run test:unit            # 単体テスト全体（property 含む）
```

## 注意

- PBT は **ランダムシード依存でフレーク** し得る。失敗時は単体再実行で再現性を確認し、再現する場合は `fc` の縮小（shrink）結果から原因を特定する。再現しない場合はシード依存のフレークとして切り分ける。

## 完了条件 / 次のフェーズ

- PBT の追加可否を判断し、可能なものを追加・実行した（不可なら理由を報告）。
- → `/check-creation`（Phase 5: 最終チェック）へ進む。
