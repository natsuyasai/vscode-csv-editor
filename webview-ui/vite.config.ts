import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync } from "fs";

const BuildAfterScriptPlugin = () => {
  return {
    name: "rollup-build-aafter-plugin",
    closeBundle() {
      try {
        copyFileSync("src/icons/codicon.css", "build/assets/codicon.css");
        copyFileSync("src/icons/codicon.ttf", "build/assets/codicon.ttf");
      } catch {}
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), BuildAfterScriptPlugin()],
  resolve: {
    alias: {
      "@message": resolve("../src/message"),
      "@": resolve("src/"),
    },
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
