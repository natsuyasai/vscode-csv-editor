// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// CSV言語拡張（言語ID csv）の導入を再現するためのテスト用拡張
	launchArgs: [
		`--extensionDevelopmentPath=${fileURLToPath(new URL('./src/test/fixtures/csv-language', import.meta.url))}`,
	],
});
