// Parley — Electron main process.
// Frameless content-protected overlay (Cluely-class) + secure store + allowlisted IPC +
// settings window. Audio→copilot→UI is bridged through the main process over IPC (one socket).

import { app, BrowserWindow, globalShortcut, desktopCapturer, session, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The bundle is ESM (package.json "type":"module"), so __dirname doesn't exist — recreate it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { initStore, getSettings, patchSettings } from "./secureStore.js";
import { registerIpc, trackRenderer, broadcast } from "./ipc.js";
import { openSettings } from "./settingsWindow.js";
import type { ProspectingMode } from "../shared/modes.js";

let overlay: BrowserWindow | null = null;

function applyProtection(win: BrowserWindow) {
  // macOS: NSWindowSharingNone · Windows: WDA_EXCLUDEFROMCAPTURE — omitted from capture buffers.
  win.setContentProtection(getSettings().general.overlayDiscreet);
}

/** Setup work (onboarding, playbooks, settings) needs room; a live call needs a thin rail
 *  pinned out of the way. Same window, two shapes — switched via the `overlay:setMode` IPC. */
export function setWindowMode(mode: "setup" | "call") {
  if (!overlay) return;
  const { workArea } = screen.getPrimaryDisplay();
  if (mode === "call") {
    const w = 420;
    overlay.setResizable(false);
    overlay.setBounds({ x: workArea.x + workArea.width - w - 24, y: workArea.y + 24, width: w, height: workArea.height - 80 }, true);
    overlay.setAlwaysOnTop(true, "screen-saver");
  } else {
    const w = Math.min(900, workArea.width - 80), h = Math.min(680, workArea.height - 80);
    overlay.setResizable(true);
    overlay.setBounds({ x: workArea.x + Math.round((workArea.width - w) / 2), y: workArea.y + Math.round((workArea.height - h) / 2), width: w, height: h }, true);
    overlay.setAlwaysOnTop(false);
  }
}

function createOverlay() {
  const { workArea } = screen.getPrimaryDisplay();
  // Start in SETUP shape — the first thing a user sees is onboarding, not a call.
  const width = Math.min(900, workArea.width - 80);
  const height = Math.min(680, workArea.height - 80);
  overlay = new BrowserWindow({
    width, height,
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
    frame: false, transparent: true, hasShadow: false, resizable: true, skipTaskbar: true,
    hiddenInMissionControl: true, alwaysOnTop: false, fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setOpacity(getSettings().general.overlayOpacity);
  applyProtection(overlay);
  trackRenderer(overlay.webContents);

  const url = process.env.VITE_DEV_SERVER_URL;
  const target = url ?? path.join(__dirname, "../dist/index.html");
  (url ? overlay.loadURL(url) : overlay.loadFile(target));
  overlay.webContents.on("did-fail-load", (_e, code, desc) => console.error("[overlay] load failed:", code, desc));
  overlay.on("ready-to-show", () => overlay?.show());
  if (process.env.PARLEY_DEBUG) {
    overlay.webContents.on("did-finish-load", () => {
      setTimeout(async () => {
        console.error("[dbg]", JSON.stringify({
          visible: overlay?.isVisible(), bounds: overlay?.getBounds(),
          opacity: overlay?.getOpacity(), discreet: getSettings().general.overlayDiscreet,
        }));
        if (process.env.PARLEY_SHOT && overlay) {
          const img = await overlay.webContents.capturePage();
          (await import("node:fs")).writeFileSync(process.env.PARLEY_SHOT, img.toPNG());
          console.error("[dbg] captured ->", process.env.PARLEY_SHOT);
        }
      }, 1200);
    });
  }
  return overlay;
}

function wireSystemAudio() {
  session.defaultSession.setDisplayMediaRequestHandler((_req, cb) => {
    desktopCapturer.getSources({ types: ["screen"] }).then((s) => cb(s[0] ? { video: s[0], audio: "loopback" } : {}));
  });
}

function registerShortcuts() {
  for (const k of getSettings().keybinds) {
    const fn = {
      toggleVisibility: () => overlay && (overlay.isVisible() ? overlay.hide() : overlay.show()),
      ask: () => overlay?.webContents.send("hotkey", "ask"),
      toggleSession: () => overlay?.webContents.send("hotkey", "toggleSession"),
      toggleDiscreet: () => setDiscreet(!getSettings().general.overlayDiscreet),
      moveUp: () => nudge(0, -40), moveDown: () => nudge(0, 40),
    }[k.id];
    if (fn) globalShortcut.register(k.accelerator, fn);
  }
  globalShortcut.register("CommandOrControl+,", () => openSettings());
}

function nudge(dx: number, dy: number) {
  if (!overlay) return;
  const [x, y] = overlay.getPosition();
  overlay.setPosition(x + dx, y + dy);
}

function setDiscreet(on: boolean) {
  patchSettings({ general: { overlayDiscreet: on } });
  if (overlay) applyProtection(overlay);
  broadcast("overlay:state", { discreet: on });
}

app.whenReady().then(async () => {
  await initStore();
  wireSystemAudio();
  createOverlay();

  registerIpc({
    // Audio capture + the gateway socket live in the renderer (WebAudio); these remain as
    // session markers / future server-side arming hooks.
    startCapture: async () => ({ ok: true }),
    stopCapture: async () => ({ ok: true }),
    setDiscreet: (on) => setDiscreet(on),
    setClickThrough: (on) => overlay?.setIgnoreMouseEvents(on, { forward: true }),
    setWindowMode: (mode) => setWindowMode(mode),
    windowAction: (a) => {
      if (!overlay) return;
      if (a === "close") overlay.close();
      else if (a === "minimize") overlay.minimize();
      else overlay.isMaximized() ? overlay.unmaximize() : overlay.maximize();
    },
    listAudioDevices: async () => [],               // populated by renderer enumerateDevices in production
    checkDnc: async () => ({ blocked: false }),      // wired to the DNC service in production
    accountStatus: async () => ({ signedIn: false }),// wired to Clerk in production
    customModes: () => getSettings().customModes,
    upsertMode: (m: ProspectingMode) => {
      const list = getSettings().customModes.filter((x) => x.id !== m.id).concat({ ...m, builtIn: false });
      patchSettings({ customModes: list });
      return list;
    },
    deleteMode: (id: string) => {
      const list = getSettings().customModes.filter((x) => x.id !== id);
      patchSettings({ customModes: list });
      return list;
    },
  });

  registerShortcuts();
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
