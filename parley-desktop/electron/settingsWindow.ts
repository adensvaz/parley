// Settings window — a standard (non-overlay) hardened BrowserWindow.
import { BrowserWindow, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { trackRenderer } from "./ipc.js";

let win: BrowserWindow | null = null;

export function openSettings() {
  if (win && !win.isDestroyed()) { win.focus(); return win; }
  win = new BrowserWindow({
    width: 920, height: 720, minWidth: 760, minHeight: 560,
    titleBarStyle: "hiddenInset", show: false, backgroundColor: "#0e1014",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,   // renderer can't touch node
      nodeIntegration: false,
      sandbox: true,            // OS-level sandbox for the renderer
      webSecurity: true,
    },
  });

  // Strict CSP — no remote script, no inline eval; locks down the renderer.
  session.fromPartition("").webRequest?.onHeadersReceived?.((details, cb) => {
    cb({ responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https:; img-src 'self' data:"],
    }});
  });

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) win.loadURL(`${url}settings.html`);
  else win.loadFile(path.join(__dirname, "../dist/settings.html"));

  win.once("ready-to-show", () => win?.show());
  trackRenderer(win.webContents);
  win.on("closed", () => (win = null));
  return win;
}
