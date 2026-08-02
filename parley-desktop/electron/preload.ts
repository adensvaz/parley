// Hardened context bridge. Exposes ONLY the allowlisted channels from the IPC contract.
// No raw ipcRenderer, no node, no arbitrary channel names reach the renderer.

import { contextBridge, ipcRenderer } from "electron";
import { INVOKE_CHANNELS, EVENT_CHANNELS } from "../shared/ipc-contract.js";

const invoke = (channel: string, payload?: unknown) => {
  if (!(INVOKE_CHANNELS as readonly string[]).includes(channel))
    return Promise.reject(new Error(`blocked channel: ${channel}`));
  return ipcRenderer.invoke(channel, payload);
};

const on = (channel: string, cb: (payload: any) => void) => {
  if (!(EVENT_CHANNELS as readonly string[]).includes(channel)) return () => {};
  const sub = (_e: unknown, payload: any) => cb(payload);
  ipcRenderer.on(channel, sub);
  return () => ipcRenderer.removeListener(channel, sub);
};

contextBridge.exposeInMainWorld("parley", {
  invoke,
  on,
  // convenience typed wrappers
  getSettings: () => invoke("settings:get"),
  patchSettings: (p: unknown) => invoke("settings:patch", p),
  resetSettings: () => invoke("settings:reset"),
  setSecret: (key: string, value: string) => invoke("secret:set", { key, value }),
  hasSecret: (key: string) => invoke("secret:has", { key }),
  clearSecret: (key: string) => invoke("secret:clear", { key }),
  listModes: () => invoke("modes:list"),
  upsertMode: (m: unknown) => invoke("modes:upsert", m),
  deleteMode: (id: string) => invoke("modes:delete", { id }),
  startCapture: (modeId: string) => invoke("capture:start", { modeId }),
  stopCapture: () => invoke("capture:stop"),
  setDiscreet: (on: boolean) => invoke("overlay:setDiscreet", { on }),
  setWindowMode: (mode: "setup" | "call") => invoke("overlay:setMode", { mode }),
  windowAction: (action: "close" | "minimize" | "maximize") => invoke("window:action", { action }),
  listAudioDevices: () => invoke("audio:listDevices"),
  checkDnc: (phone: string) => invoke("compliance:checkDnc", { phone }),
  accountStatus: () => invoke("account:status"),
});
