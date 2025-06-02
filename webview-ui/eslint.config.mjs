// @ts-check
import pluginTypeScript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import pluginPrettier from "eslint-config-prettier";
import pluginReact from "eslint-plugin-react";
import reactConfigRecommended from "eslint-plugin-react/configs/recommended.js";
import pluginReactHooks from "eslint-plugin-react-hooks";
import storybook from 'eslint-plugin-storybook'
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const ignores = {
  name: "eslint-ignores",
  ignores: ["node_modules", "dist"]
};

const typescriptConfig = {
  name: "typescript-eslint",
  files: ["**/*.ts", "**/*.tsx", "**/*.stories.ts", "**/*.stories.tsx"],
  languageOptions: {
    parser: typescriptParser,
  },
  plugins: {
    "@typescript-eslint": pluginTypeScript,
  },
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
    "@typescript-eslint/no-floating-promises": "error",
  },
}

const reactConfig = {
  name: "react",
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
  },
}

const storybookConfig = {
  name: "storybook",
  files: ["**/*.stories.ts", "**/*.stories.tsx"],
  plugins: {
    "storybook": storybook,
  },
};

export default [
  ignores,
  ...storybook.configs['flat/recommended'],
  storybookConfig,
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  typescriptConfig,
  reactConfig,
];
