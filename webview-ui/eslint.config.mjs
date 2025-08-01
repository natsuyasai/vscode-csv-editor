// @ts-check
import eslint from "@eslint/js";
import pluginTypeScript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import pluginPrettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import reactConfigRecommended from "eslint-plugin-react/configs/recommended.js";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

const ignores = {
  name: "eslint-ignores",
  ignores: [
    "node_modules",
    "dist",
    "build",
    "eslint.config.mjs",
    "postcss.config.ts",
    "vite.config.ts",
    "vitest.config.ts",
    "vitest.shims.d.ts",
    "vitest.workspace.ts",
    "storybook-static",
    "scripts",
  ],
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
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-floating-promises": "error",
  },
};

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
};

const storybookConfig = {
  name: "storybook",
  files: ["**/*.stories.ts", "**/*.stories.tsx"],
  plugins: {
    storybook: storybook,
  },
};

const a11yConfig = {
  name: "jsx_a11y_config",
  files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
  settings: {
    react: {
      version: "detect",
    },
    components: {
      VscodeButton: "button",
      VscodeTextarea: "textarea",
      VscodeCheckbox: "input[type='checkbox']",
      VscodeSelect: "select",
      VscodeTextfield: "input[type='text'], input[type='email'], input[type='password'], input[type='number'], input[type='search']",
      VscodeRadio: "input[type='radio']",
    },
  },
  languageOptions: {
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
}

export default [
  ignores,
  ...storybook.configs["flat/recommended"],
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
  jsxA11y.flatConfigs.strict,
  a11yConfig
];
