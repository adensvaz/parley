// Parley — Electron main process.
// Frameless content-protected overlay (Cluely-class) + secure store + allowlisted IPC +
// settings window. Audio→copilot→UI is bridged through the main process over IPC (one socket).

import { app, BrowserWindow, globalShortcut, desktopCapturer, session, screen } from "electron";
import path from "node:path";
import { initStore, getSettings, patchSettings } from "./secureStore.js";
import { registerIpc, trackRenderer, broadcast } from "./ipc.js";
import { openSettings } from "./settingsWindow.js";
import type { ProspectingMode } from "../shared/modes.js";

let overlay: BrowserWindow | null = null;

function applyProtection(win: BrowserWindow) {
  // macOS: NSWindowSharingNone · Windows: WDA_EXCLUDEFROMCAPTURE — omitted from capture buffers.
  win.setContentProtection(getSettings().general.overlayDiscreet);
}

function createOverlay() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 420;
  overlay = new BrowserWindow({
    width, height: workArea.height - 80,
    x: workArea.x + workArea.width - width - 24, y: workArea.y + 24,
    frame: false, transparent: true, hasShadow: false, resizable: false, skipTaskbar: true,
    hiddenInMissionControl: true, alwaysOnTop: true, fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setOpacity(getSettings().general.overlayOpacity);
  applyProtection(overlay);
  trackRenderer(overlay.webContents);

  const url = process.env.VITE_DEV_SERVER_URL;
  if (url) overlay.loadURL(url);
  else overlay.loadFile(path.join(__dirname, "../dist/index.html"));
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
