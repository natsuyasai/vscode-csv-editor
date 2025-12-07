/// <reference types="vitest" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

import viteConfig from "./vite.config";
import storybookTest from "@storybook/addon-vitest/vitest-plugin";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
            globals: true,
            environment: "jsdom",
            setupFiles: "./tests/setup.ts",
            alias: {
              "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu":
                "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu.js",
            },
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "yarn storybook --ci",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider: playwright(),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        },
      ],
    },
    define: {
      global: "window",
    },
  })
);
