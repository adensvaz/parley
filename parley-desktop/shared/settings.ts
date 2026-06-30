// Settings schema — the single source of truth for user preferences.
// Versioned + migration-ready so we can evolve the shape without corrupting installs.
// NOTE: secrets (API keys, auth tokens) are NEVER stored here — see electron/secureStore.ts.

import type { ProspectingMode } from "./modes.js";

export const SETTINGS_VERSION = 1;

export type ThemeMode = "system" | "dark" | "light";
export type LlmProvider = "openai" | "anthropic";

export interface Keybind { id: string; label: string; accelerator: string }

export interface Settings {
  version: number;

  general: {
    theme: ThemeMode;
    launchAtLogin: boolean;
    overlayDiscreet: boolean;     // hide overlay from screen-share by default
    overlayOpacity: number;       // 0.4..1
    autoUpdate: boolean;
  };

  language: {
    transcription: string;        // BCP-47, what the rep speaks
    output: string;               // language for AI suggestions + notes
  };

  audio: {
    micDeviceId: string | null;   // null = system default
    captureSystemAudio: boolean;  // prospect-side loopback
    noiseSuppression: boolean;
  };

  copilot: {
    provider: LlmProvider;
    model: string;
    activeModeId: string;
    suggestionThrottleMs: number; // min gap between LLM advisor cards
    talkRatioWarnAt: number;      // 0..1 monologue threshold
    autoSummary: boolean;
  };

  notifications: {
    appointmentSet: boolean;
    dncRequested: boolean;
    coachingNudges: boolean;
    sound: boolean;
  };

  compliance: {
    // TCPA / call-recording posture — security-critical, on by default
    recordingDisclosure: boolean;     // prompt rep to disclose recording
    enforceDncScrub: boolean;         // block dial if number is on DNC list
    callWindowStart: string;          // "08:00" local
    callWindowEnd: string;            // "21:00" local
    retainTranscripts: boolean;       // store transcripts after call
    transcriptRetentionDays: number;
  };

  keybinds: Keybind[];

  /** user-created modes (built-ins live in shared/modes.ts) */
  customModes: ProspectingMode[];
}

export const DEFAULT_KEYBINDS: Keybind[] = [
  { id: "toggleVisibility", label: "Toggle overlay", accelerator: "CommandOrControl+\\" },
  { id: "ask", label: "Ask the copilot", accelerator: "CommandOrControl+Return" },
  { id: "toggleSession", label: "Start / stop call", accelerator: "CommandOrControl+Shift+\\" },
  { id: "toggleDiscreet", label: "Toggle discreet mode", accelerator: "CommandOrControl+D" },
  { id: "moveUp", label: "Move overlay up", accelerator: "CommandOrControl+Up" },
  { id: "moveDown", label: "Move overlay down", accelerator: "CommandOrControl+Down" },
];

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  general: { theme: "system", launchAtLogin: false, overlayDiscreet: true, overlayOpacity: 0.92, autoUpdate: true },
  language: { transcription: "en-US", output: "en-US" },
  audio: { micDeviceId: null, captureSystemAudio: true, noiseSuppression: true },
  copilot: { provider: "openai", model: "gpt-4o-mini", activeModeId: "expired", suggestionThrottleMs: 4000, talkRatioWarnAt: 0.7, autoSummary: true },
  notifications: { appointmentSet: true, dncRequested: true, coachingNudges: true, sound: true },
  compliance: { recordingDisclosure: true, enforceDncScrub: true, callWindowStart: "08:00", callWindowEnd: "21:00", retainTranscripts: true, transcriptRetentionDays: 90 },
  keybinds: DEFAULT_KEYBINDS,
  customModes: [],
};

// ── Validation + migration (defensive; tolerates partial/old/corrupt files) ─────

/** Deep-merge persisted values over defaults so missing keys self-heal. */
export function coerceSettings(raw: unknown): Settings {
  const base = structuredCloneSafe(DEFAULT_SETTINGS);
  if (!raw || typeof raw !== "object") return base;
  const migrated = migrate(raw as Record<string, any>);
  return deepMerge(base, migrated) as Settings;
}

export function migrate(s: Record<string, any>): Record<string, any> {
  let v = typeof s.version === "number" ? s.version : 0;
  // Example migration ladder — extend as the schema evolves.
  // if (v < 2) { s.someNewField = ...; v = 2; }
  s.version = SETTINGS_VERSION;
  void v;
  return s;
}

/** Clamp/normalize values that must stay in-range (defense against tampered files). */
export function sanitize(s: Settings): Settings {
  s.general.overlayOpacity = clamp(s.general.overlayOpacity, 0.4, 1);
  s.copilot.talkRatioWarnAt = clamp(s.copilot.talkRatioWarnAt, 0.4, 0.95);
  s.copilot.suggestionThrottleMs = clamp(s.copilot.suggestionThrottleMs, 1000, 30000);
  s.compliance.transcriptRetentionDays = clamp(s.compliance.transcriptRetentionDays, 0, 3650);
  return s;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

function deepMerge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(base as any)) if (over && k in over) out[k] = deepMerge((base as any)[k], over[k]);
    return out;
  }
  return (over ?? base) as T;
}

function structuredCloneSafe<T>(o: T): T {
  return typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}
