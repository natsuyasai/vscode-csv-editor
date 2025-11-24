import { test, expect } from "@playwright/test";

test.describe("EditableTable", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:6007/");
    await page.waitForLoadState("networkidle");
  });

  test("基本的な表示ができること", async ({ page }) => {
    // EditableTable > Default ストーリーに移動
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Default" }).click();

    // テーブルが表示されることを確認
    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // ヘッダーが表示されることを確認（テーブル内のテキストに限定）
    const tableContainer = iframe.locator("table");
    await expect(tableContainer.getByText("A", { exact: true })).toBeVisible();
    await expect(tableContainer.getByText("B", { exact: true })).toBeVisible();
  });

  test("ライトテーマで表示できること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Light" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();
  });

  test("ダークテーマで表示できること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Dark" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();
  });

  test("大量データでスクロールできること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Large Dataset" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // スクロールコンテナを取得（テーブルの親div）
    const scrollContainer = iframe.locator('div[style*="overflow: auto"]');

    // スクロールができることを確認
    const initialScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    await scrollContainer.evaluate((el) => el.scrollTo(0, 500));
    await page.waitForTimeout(100); // スクロール完了を待つ
    const scrolledScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);

    expect(scrolledScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test("空データでもエラーが発生しないこと", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Empty", exact: true }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');

    // エラーメッセージがないことを確認
    const errorMessage = iframe.getByText(/error/i);
    await expect(errorMessage).not.toBeVisible();
  });

  test("日本語データが正しく表示されること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Japanese Data" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // 日本語ヘッダーが表示されることを確認
    await expect(iframe.getByText("名前")).toBeVisible();
    await expect(iframe.getByText("年齢")).toBeVisible();
  });

  test("セルをダブルクリックで編集できること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Default" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // データセル（最初のデータセル"1"）を取得
    const firstCell = iframe.getByRole("button").filter({ hasText: "1" }).first();
    await expect(firstCell).toBeVisible();

    // ダブルクリックして編集モードに入る
    await firstCell.dblclick();

    // textareaが表示されることを確認
    const textarea = iframe.locator("textarea");
    await expect(textarea).toBeVisible();

    // テキストエリアの値を変更
    await textarea.fill("999");

    // Enterキーで編集を確定
    await textarea.press("Enter");

    // 編集後の値が反映されることを確認
    await expect(iframe.getByRole("button").filter({ hasText: "999" })).toBeVisible();
  });

  test("セル編集時のテキストエリアサイズがセルサイズと一致すること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Default" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // データセルを取得
    const firstCell = iframe.getByRole("button").filter({ hasText: "1" }).first();
    await expect(firstCell).toBeVisible();

    // セルのサイズを取得
    const cellBox = await firstCell.boundingBox();
    expect(cellBox).not.toBeNull();

    // ダブルクリックして編集モードに入る
    await firstCell.dblclick();

    // textareaが表示されることを確認
    const textarea = iframe.locator("textarea");
    await expect(textarea).toBeVisible();

    // テキストエリアのサイズを取得
    const textareaBox = await textarea.boundingBox();
    expect(textareaBox).not.toBeNull();

    // サイズが一致することを確認（誤差を許容）
    if (cellBox && textareaBox) {
      expect(Math.abs(cellBox.width - textareaBox.width)).toBeLessThan(2);
      expect(Math.abs(cellBox.height - textareaBox.height)).toBeLessThan(2);
    }
  });

  test.skip("列ヘッダーをクリックしてソートできること", async ({ page }) => {
    await page.getByRole("button", { name: "EditableTable" }).click();
    await page.getByRole("link", { name: "Default" }).click();

    const iframe = page.frameLocator('iframe[title="storybook-preview-iframe"]');
    const table = iframe.getByRole("table");
    await expect(table).toBeVisible();

    // スクロールコンテナを確認
    const scrollContainer = iframe.locator('div[style*="overflow: auto"]');
    await expect(scrollContainer).toBeVisible();

    // スクロールを一番上に
    await scrollContainer.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(200);

    // 列Aのヘッダーをテキストで取得
    const columnAHeader = iframe.getByText("A", { exact: true }).first();
    await expect(columnAHeader).toBeVisible();

    // ヘッダーのテキストを確認
    const headerText = await columnAHeader.textContent();
    expect(headerText?.trim()).toBe("A");

    // ヘッダーをクリックして昇順ソート
    await columnAHeader.click();
    await page.waitForTimeout(300); // ソート完了を待つ

    // 昇順ソートアイコンが表示されることを確認（同じ要素を再取得）
    const sortedHeader = iframe.locator("th").filter({ hasText: "A" }).first();
    const headerTextAsc = await sortedHeader.textContent();
    expect(headerTextAsc?.includes("🔼")).toBe(true);

    // もう一度クリックして降順ソート
    await sortedHeader.click();
    await page.waitForTimeout(300);

    // 降順ソートアイコンが表示されることを確認
    const headerTextDesc = await sortedHeader.textContent();
    expect(headerTextDesc?.includes("🔽")).toBe(true);
  });
});
