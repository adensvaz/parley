// IPC contract — the SINGLE source of truth for every renderer↔main channel.
// Security model: the main process registers handlers ONLY for channels in this allowlist,
// and the preload exposes ONLY these. No arbitrary channel names, no dynamic eval.

import type { Settings } from "./settings.js";
import type { ProspectingMode } from "./modes.js";

/** Invoke channels: renderer -> main, request/response. */
export interface IpcInvokeMap {
  "settings:get": { req: void; res: Settings };
  "settings:patch": { req: DeepPartial<Settings>; res: Settings };
  "settings:reset": { req: void; res: Settings };

  // Secrets are write-only from the renderer; they are NEVER returned in plaintext.
  "secret:set": { req: { key: SecretKey; value: string }; res: { ok: true } };
  "secret:has": { req: { key: SecretKey }; res: { present: boolean } };
  "secret:clear": { req: { key: SecretKey }; res: { ok: true } };

  "modes:list": { req: void; res: ProspectingMode[] };        // built-in + custom
  "modes:upsert": { req: ProspectingMode; res: ProspectingMode[] };
  "modes:delete": { req: { id: string }; res: ProspectingMode[] };

  "capture:start": { req: { modeId: string }; res: { ok: boolean } };
  "capture:stop": { req: void; res: { ok: boolean } };

  "overlay:setDiscreet": { req: { on: boolean }; res: { ok: true } };
  "overlay:setClickThrough": { req: { on: boolean }; res: { ok: true } };

  "audio:listDevices": { req: void; res: { id: string; label: string }[] };
  "compliance:checkDnc": { req: { phone: string }; res: { blocked: boolean; reason?: string } };

  "account:status": { req: void; res: { signedIn: boolean; email?: string; plan?: string } };
}

/** Event channels: main -> renderer, fire-and-forget (server events, hotkeys, state). */
export interface IpcEventMap {
  "copilot:event": unknown;          // ServerEvent from the gateway, bridged through main
  "hotkey": string;
  "overlay:state": { discreet: boolean };
  "settings:changed": Settings;
}

export type SecretKey = "openaiApiKey" | "anthropicApiKey" | "deepgramApiKey" | "authToken";

export const INVOKE_CHANNELS = [
  "settings:get", "settings:patch", "settings:reset",
  "secret:set", "secret:has", "secret:clear",
  "modes:list", "modes:upsert", "modes:delete",
  "capture:start", "capture:stop",
  "overlay:setDiscreet", "overlay:setClickThrough",
  "audio:listDevices", "compliance:checkDnc", "account:status",
] as const satisfies readonly (keyof IpcInvokeMap)[];

export const EVENT_CHANNELS = [
  "copilot:event", "hotkey", "overlay:state", "settings:changed",
] as const satisfies readonly (keyof IpcEventMap)[];

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
