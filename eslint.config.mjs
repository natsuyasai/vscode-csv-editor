// @ts-check
import typescriptEslintParser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";

const ignores = {
  name: "eslint-ignores",
  ignores: ["node_modules", "dist", ".vscode-test", "out", "webview-ui"],
};

export default [
  ignores,
  { files: ["**/*.ts"], },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: true,
        sourceType: "commonjs",
      },
    }
  },
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
];
