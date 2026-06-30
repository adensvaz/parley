// Persistent settings + secret storage for the main process.
//
// SPEED:    in-memory cache is the read path (sync, zero I/O); writes are debounced and
//           atomic (temp file + rename) so rapid UI changes don't thrash the disk.
// SECURITY: preferences live in plaintext JSON (non-sensitive only). Secrets (API keys,
//           auth tokens) are encrypted with Electron safeStorage (OS keychain / DPAPI)
//           and stored separately — never in the settings JSON, never logged.

import { app, safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DEFAULT_SETTINGS, coerceSettings, sanitize, type Settings,
} from "../shared/settings.js";
import type { SecretKey } from "../shared/ipc-contract.js";
import type { DeepPartial } from "../shared/ipc-contract.js";

const dir = () => app.getPath("userData");
const SETTINGS_FILE = () => path.join(dir(), "settings.json");
const SECRETS_FILE = () => path.join(dir(), "secrets.bin"); // map<key, base64(ciphertext)>

let cache: Settings = DEFAULT_SETTINGS;
let secrets: Record<string, string> = {};
let writeTimer: NodeJS.Timeout | null = null;
const listeners = new Set<(s: Settings) => void>();

export async function initStore() {
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_FILE(), "utf8"));
    cache = sanitize(coerceSettings(raw));
  } catch {
    cache = sanitize(coerceSettings(null)); // first run / corrupt -> defaults
  }
  try {
    secrets = JSON.parse(await fs.readFile(SECRETS_FILE(), "utf8"));
  } catch {
    secrets = {};
  }
}

export function getSettings(): Settings {
  return cache;
}

export function patchSettings(patch: DeepPartial<Settings>): Settings {
  cache = sanitize(deepMerge(cache, patch));
  scheduleWrite();
  emit();
  return cache;
}

export function resetSettings(): Settings {
  cache = sanitize(coerceSettings(null));
  scheduleWrite();
  emit();
  return cache;
}

export function onSettingsChanged(fn: (s: Settings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Secrets (encrypted at rest) ────────────────────────────────────────────────
export function setSecret(key: SecretKey, value: string): void {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("OS secure storage unavailable; refusing to persist secret in plaintext.");
  secrets[key] = safeStorage.encryptString(value).toString("base64");
  void persistSecrets();
}
export function hasSecret(key: SecretKey): boolean {
  return !!secrets[key];
}
/** Decrypt for in-process use only (e.g. the gateway client). Never sent to the renderer. */
export function getSecret(key: SecretKey): string | null {
  const enc = secrets[key];
  if (!enc) return null;
  try { return safeStorage.decryptString(Buffer.from(enc, "base64")); } catch { return null; }
}
export function clearSecret(key: SecretKey): void {
  delete secrets[key];
  void persistSecrets();
}

// ── internals ──────────────────────────────────────────────────────────────────
function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => void persistSettings(), 300); // debounce burst edits
}
async function persistSettings() {
  await atomicWrite(SETTINGS_FILE(), JSON.stringify(cache, null, 2));
}
async function persistSecrets() {
  await atomicWrite(SECRETS_FILE(), JSON.stringify(secrets));
}
async function atomicWrite(file: string, data: string) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data, { mode: 0o600 }); // owner-only perms
  await fs.rename(tmp, file);                      // atomic swap
}
function emit() {
  for (const fn of listeners) fn(cache);
}
function deepMerge<T>(base: T, over: any): T {
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (base && typeof base === "object") {
    const out: any = { ...base };
    for (const k of Object.keys(over ?? {})) out[k] = deepMerge((base as any)[k], over[k]);
    return out;
  }
  return (over ?? base) as T;
}
