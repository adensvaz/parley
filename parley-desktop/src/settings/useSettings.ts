import { useEffect, useState, useCallback } from "react";
import type { Settings } from "../../shared/settings";
import type { DeepPartial } from "../../shared/ipc-contract";
import { DEFAULT_SETTINGS } from "../../shared/settings";
import type { ProspectingMode } from "../../shared/modes";

// Bridge shim: real impl is injected by preload (window.parley). In the browser preview
// it falls back to in-memory defaults so the UI still renders without Electron.
const api: any = (globalThis as any).parley ?? {
  getSettings: async () => DEFAULT_SETTINGS,
  patchSettings: async (p: any) => ({ ...DEFAULT_SETTINGS, ...p }),
  resetSettings: async () => DEFAULT_SETTINGS,
  listModes: async () => [],
  upsertMode: async () => [],
  deleteMode: async () => [],
  hasSecret: async () => ({ present: false }),
  setSecret: async () => ({ ok: true }),
  clearSecret: async () => ({ ok: true }),
  on: () => () => {},
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getSettings().then((s: Settings) => { setSettings(s); setLoaded(true); });
    const off = api.on?.("settings:changed", (s: Settings) => setSettings(s));
    return () => off?.();
  }, []);

  const patch = useCallback(async (p: DeepPartial<Settings>) => {
    // optimistic update for snappy UI; main process is source of truth
    setSettings((prev) => mergeLocal(prev, p));
    const next = await api.patchSettings(p);
    if (next && !next.__error) setSettings(next);
  }, []);

  const reset = useCallback(async () => setSettings(await api.resetSettings()), []);

  return { settings, loaded, patch, reset, api };
}

export type ModeApi = {
  list: () => Promise<ProspectingMode[]>;
  upsert: (m: ProspectingMode) => Promise<ProspectingMode[]>;
  remove: (id: string) => Promise<ProspectingMode[]>;
};
export const modeApi: ModeApi = {
  list: () => api.listModes(),
  upsert: (m) => api.upsertMode(m),
  remove: (id) => api.deleteMode(id),
};
export const secretApi = {
  has: (key: string) => api.hasSecret(key),
  set: (key: string, value: string) => api.setSecret(key, value),
  clear: (key: string) => api.clearSecret(key),
};

function mergeLocal<T>(base: T, over: any): T {
  if (over && typeof over === "object" && !Array.isArray(over) && base && typeof base === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(over)) out[k] = mergeLocal((base as any)[k], over[k]);
    return out;
  }
  return (over ?? base) as T;
}
