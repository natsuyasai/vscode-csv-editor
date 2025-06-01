// @ts-check
import pluginTypeScript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import pluginPrettier from "eslint-config-prettier";
import pluginReact from "eslint-plugin-react";
import reactConfigRecommended from "eslint-plugin-react/configs/recommended.js";
import pluginReactHooks from "eslint-plugin-react-hooks";
import storybook from 'eslint-plugin-storybook'

export default [
  {
    ignores: ["./dist"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
    },
    plugins: {
      "@typescript-eslint": pluginTypeScript,
    },
    rules: {
      ...pluginTypeScript.configs["eslint-recommended"].rules,
      ...pluginTypeScript.configs["recommended"].rules,
    },
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    settings: {
      "react": {
        version: "detect",
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
        typescript: {},
      },
    },
    plugins: {
      "react": pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...reactConfigRecommended.rules,
      ...pluginPrettier.rules,
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_"
        }
      ],
    },
  },
  ...storybook.configs['flat/recommended'],
];
