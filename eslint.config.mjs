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
        sourceType: "commonjs",
      },
    }
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_"
        }
      ],
      "no-undef": "warn",
      "@typescript-eslint/prefer-includes": "error"
    }
  },
  {
    ignores: ["node_modules", "dist", ".vscode-test", "out", "webview-ui"],
  },
];
