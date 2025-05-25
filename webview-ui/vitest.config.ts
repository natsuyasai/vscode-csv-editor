/// <reference types="vitest" />
import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    globals: true,
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    alias: {
      "@message": resolve("../src/message"),
      "@": resolve("src/"),
      "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu":
        "@vscode-elements/elements/dist/vscode-context-menu/vscode-context-menu.js",
    },
  },
});
