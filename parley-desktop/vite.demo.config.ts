// Demo config: serves the renderer as a plain web app (no Electron auto-launch), so the live
// product can be shown in a browser against the real gateway.  npx vite --config vite.demo.config.ts
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

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
  plugins: [jsToTs, react()],
  server: { port: 5199, open: false },
});
