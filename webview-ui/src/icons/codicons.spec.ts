import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @vscode/codicons 更新時に、使っているアイコンが無くなっていないことを確かめる。
 * - `<VscodeIcon name="xxx">` は `codicon-xxx` クラスで描画される
 * - `className="codicon codicon-xxx"` を直接書いている箇所もある
 * - scripts/copyicon.cjs が dist/codicon.css と dist/codicon.ttf を src/icons へコピーし、
 *   ビルドで build/assets へ置いたものを拡張機能の webview が読み込む
 */

// vitest は CSS の import を空にするため、ファイルを直接読む（cwd は webview-ui）
const codiconDist = resolve("node_modules/@vscode/codicons/dist");
const installedCodiconCss = readFileSync(resolve(codiconDist, "codicon.css"), "utf-8");
const copiedCodiconCss = readFileSync(resolve("src/icons/codicon.css"), "utf-8");

const sources = Object.values(
  import.meta.glob<string>(["/src/**/*.tsx", "!/src/**/*.spec.tsx", "!/src/**/*.stories.tsx"], {
    query: "?raw",
    import: "default",
    eager: true,
  })
);

const literalsIn = (text: string) => [...text.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
const unique = (names: string[]) => [...new Set(names)].sort();

// name="xxx" と name={cond ? "xxx" : "yyy"} のどちらも、属性値の中の文字列リテラルをすべて拾う
const vscodeIconTagCount = sources.reduce(
  (sum, source) => sum + [...source.matchAll(/<VscodeIcon\b/g)].length,
  0
);
const vscodeIconNameAttrs = sources.flatMap((source) =>
  [...source.matchAll(/<VscodeIcon\b[^>]*?\bname=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1])
);
const vscodeIconNames = unique(vscodeIconNameAttrs.flatMap(literalsIn));
const codiconClassNames = unique(
  sources.flatMap((source) => [...source.matchAll(/\bcodicon-([a-z0-9-]+)\b/g)].map((m) => m[1]))
);
const usedIconNames = unique([...vscodeIconNames, ...codiconClassNames]);

const hasIcon = (css: string, name: string) =>
  new RegExp(`\\.codicon-${name}:before\\s*[{,]`).test(css);

describe("@vscode/codicons", () => {
  it("ソースからアイコン名を収集できている（前提確認）", () => {
    expect(sources.length).toBeGreaterThan(0);
    expect(vscodeIconNames).toEqual(
      expect.arrayContaining(["add", "arrow-down", "close", "filter", "filter-filled", "save"])
    );
    expect(codiconClassNames).toEqual(expect.arrayContaining(["chevron-down", "chevron-right"]));
  });

  it("すべての VscodeIcon から文字列リテラルの name を拾えている（収集漏れがない）", () => {
    expect(vscodeIconNameAttrs).toHaveLength(vscodeIconTagCount);
    for (const attr of vscodeIconNameAttrs) {
      expect(literalsIn(attr).length).toBeGreaterThan(0);
    }
  });

  it.each(usedIconNames)(
    "使用しているアイコン codicon-%s が導入済みの codicon.css に存在する",
    (name) => {
      expect(hasIcon(installedCodiconCss, name)).toBe(true);
    }
  );

  it("codicon.css は同じディレクトリの codicon.ttf をフォントとして参照する", () => {
    expect(installedCodiconCss).toMatch(/@font-face\s*{[^}]*url\(["']?\.\/codicon\.ttf/);
    expect(existsSync(resolve(codiconDist, "codicon.ttf"))).toBe(true);
  });

  it("src/icons にコピーされた codicon.css / codicon.ttf は導入済みのものと同じ", () => {
    expect(copiedCodiconCss).toBe(installedCodiconCss);
    expect(readFileSync(resolve("src/icons/codicon.ttf"))).toEqual(
      readFileSync(resolve(codiconDist, "codicon.ttf"))
    );
  });
});
