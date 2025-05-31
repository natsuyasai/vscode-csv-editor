import typescriptEslintParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import tseslint from 'typescript-eslint';

export default [
  { files: ["**/*.ts"], },
  {
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: true,
        sourceType: "module",
      },
    }
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "@typescript-eslint/prefer-includes": "error"
    }
  },
  {
    ignores: ["node_modules", "dist", ".vscode-test", "out", "webview-ui"],
  },
];
