// Secured IPC router. Registers handlers ONLY for channels in the allowlist contract,
// validates every payload, and never exposes secrets back to the renderer.

import { ipcMain, type WebContents } from "electron";
import { INVOKE_CHANNELS, type IpcInvokeMap, type IpcEventMap } from "../shared/ipc-contract.js";
import {
  getSettings, patchSettings, resetSettings, onSettingsChanged,
  setSecret, hasSecret, clearSecret,
} from "./secureStore.js";
import { MODES, mergeModes, type ProspectingMode } from "../shared/modes.js";

type Handlers = { [K in keyof IpcInvokeMap]: (req: IpcInvokeMap[K]["req"], wc: WebContents) => Promise<IpcInvokeMap[K]["res"]> | IpcInvokeMap[K]["res"] };

// Lightweight runtime validators (defense-in-depth; reject malformed/hostile input).
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object";
const isStr = (v: unknown): v is string => typeof v === "string" && v.length < 100_000;
const SECRET_KEYS = new Set(["openaiApiKey", "anthropicApiKey", "deepgramApiKey", "authToken"]);
const assertSecretKey = (k: unknown) => { if (!isStr(k) || !SECRET_KEYS.has(k)) throw new Error("invalid secret key"); };

export function registerIpc(deps: {
  startCapture: (modeId: string) => Promise<{ ok: boolean }>;
  stopCapture: () => Promise<{ ok: boolean }>;
  setDiscreet: (on: boolean) => void;
  setClickThrough: (on: boolean) => void;
  listAudioDevices: () => Promise<{ id: string; label: string }[]>;
  checkDnc: (phone: string) => Promise<{ blocked: boolean; reason?: string }>;
  accountStatus: () => Promise<{ signedIn: boolean; email?: string; plan?: string }>;
  customModes: () => ProspectingMode[];
  upsertMode: (m: ProspectingMode) => ProspectingMode[];
  deleteMode: (id: string) => ProspectingMode[];
}) {
  const handlers: Handlers = {
    "settings:get": () => getSettings(),
    "settings:patch": (req) => { if (!isObj(req)) throw new Error("bad patch"); return patchSettings(req); },
    "settings:reset": () => resetSettings(),

    "secret:set": (req) => { assertSecretKey(req?.key); if (!isStr(req.value)) throw new Error("bad secret"); setSecret(req.key, req.value); return { ok: true }; },
    "secret:has": (req) => { assertSecretKey(req?.key); return { present: hasSecret(req.key) }; },
    "secret:clear": (req) => { assertSecretKey(req?.key); clearSecret(req.key); return { ok: true }; },

    "modes:list": () => Array.from(mergeModes(deps.customModes()).values()),
    "modes:upsert": (m) => { if (!isObj(m) || !isStr(m.id)) throw new Error("bad mode"); return deps.upsertMode(m as ProspectingMode); },
    "modes:delete": (req) => { if (!isStr(req?.id)) throw new Error("bad id"); return deps.deleteMode(req.id); },

    "capture:start": (req) => { if (!isStr(req?.modeId)) throw new Error("bad modeId"); return deps.startCapture(req.modeId); },
    "capture:stop": () => deps.stopCapture(),

    "overlay:setDiscreet": (req) => { deps.setDiscreet(!!req?.on); return { ok: true }; },
    "overlay:setClickThrough": (req) => { deps.setClickThrough(!!req?.on); return { ok: true }; },

    "audio:listDevices": () => deps.listAudioDevices(),
    "compliance:checkDnc": (req) => { if (!isStr(req?.phone)) throw new Error("bad phone"); return deps.checkDnc(req.phone); },
    "account:status": () => deps.accountStatus(),
  };

  for (const ch of INVOKE_CHANNELS) {
    ipcMain.handle(ch, async (_e, payload) => {
      try {
        return await (handlers[ch] as any)(payload, _e.sender);
      } catch (err: any) {
        // Never leak internals/secrets to the renderer; return a safe error envelope.
        return { __error: String(err?.message ?? "request failed") };
      }
    });
  }

  // Push settings changes to all renderers.
  onSettingsChanged((s) => broadcast("settings:changed", s));
}

const targets = new Set<WebContents>();
export function trackRenderer(wc: WebContents) {
  targets.add(wc);
  wc.once("destroyed", () => targets.delete(wc));
}
export function broadcast<K extends keyof IpcEventMap>(channel: K, payload: IpcEventMap[K]) {
  for (const wc of targets) if (!wc.isDestroyed()) wc.send(channel, payload);
}
