import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
  "vitest.config.ts",
  {
    extends: "vite.config.ts",
    plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
      storybookTest({ configDir: path.join(dirname, ".storybook") }),
    ],
    test: {
      name: "storybook",
      globals: true,
      browser: {
        enabled: true,
        headless: true,
        provider: "playwright",
        instances: [{ browser: "chromium" }],
      },
      alias: {
        "@message": resolve("../src/message"),
        "@": resolve("src/"),
      },
      setupFiles: [".storybook/vitest.setup.ts"],
    },
    optimizeDeps: {
      include: [
        "react-dom/client",
        "csv-parse/browser/esm/sync",
        "csv-stringify/browser/esm/sync",
        "react",
        "react-dom",
      ],
    },
  },
]);
