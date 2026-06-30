import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Map TS-style ".js" import specifiers (NodeNext) to their ".ts"/".tsx" siblings so the
// bundler resolves them. Applied to the renderer AND the electron main/preload builds.
const jsToTs: Plugin = {
  name: "js-to-ts",
  enforce: "pre",
  resolveId(source, importer) {
    if (importer && source.startsWith(".") && source.endsWith(".js")) {
      for (const ext of [".ts", ".tsx"]) {
        const cand = resolve(dirname(importer), source.replace(/\.js$/, ext));
        if (existsSync(cand)) return cand;
      }
    }
    return null;
  },
};

export default defineConfig({
  root,
  plugins: [
    jsToTs,
    react(),
    electron({
      main: { entry: "electron/main.ts", vite: { plugins: [jsToTs] } },
      preload: { input: resolve(root, "electron/preload.ts"), vite: { plugins: [jsToTs] } },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),       // the overlay
        settings: resolve(root, "settings.html"),  // the settings window
      },
    },
  },
});
