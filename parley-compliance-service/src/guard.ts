// Compliance guard — the pure TCPA rails the dialer checks BEFORE a call, and the copilot surfaces AT
// call start. Three real risks, all fail-safe (when in doubt, warn/block, never silently allow):
//   1. Recording consent — you stream both legs; all-party-consent states require the prospect's OK.
//   2. Calling window — no telemarketing before 8am or after 9pm in the CALLED party's local time.
//   3. Do-Not-Call — honor internal (and, upstream, federal/state) DNC lists.
import { consentRegime, utcOffsetFor, stateFor, type ConsentRegime } from "./geo.js";

export const CALL_WINDOW = { openHour: 8, closeHour: 21 }; // 8:00–20:59 local, per TCPA

export interface WindowCheck { ok: boolean | null; localHour: number | null; reason?: string }

/** Is `nowUtcMs` within the legal calling window in the prospect's local time? null = tz unknown (warn). */
export function callingWindow(areaCode: string, nowUtcMs: number): WindowCheck {
  const off = utcOffsetFor(areaCode);
  if (off == null) return { ok: null, localHour: null, reason: "timezone unknown — confirm it's 8am–9pm for them before dialing" };
  const localHour = ((Math.floor(nowUtcMs / 3600000) + off) % 24 + 24) % 24;
  const ok = localHour >= CALL_WINDOW.openHour && localHour < CALL_WINDOW.closeHour;
  // DST can move the real edge by an hour, so treat the boundary hours as "warn", not a hard truth.
  const edge = localHour === CALL_WINDOW.openHour || localHour === CALL_WINDOW.closeHour - 1 || localHour === CALL_WINDOW.closeHour;
  return { ok, localHour, reason: ok ? (edge ? "near the window edge — mind daylight-saving" : undefined) : `outside 8am–9pm local (it's ${localHour}:00 there)` };
}

export interface PrecallInput {
  areaCode: string;
  nowUtcMs: number;
  dnc: boolean;           // resolved upstream from the tenant's DNC list
}
export interface PrecallResult {
  allow: boolean;                 // hard gate: false = do not connect
  recording: ConsentRegime;       // all-party | one-party | unknown
  needsConsent: boolean;          // must get the prospect's OK before/at recording
  window: WindowCheck;
  dnc: boolean;
  state?: string;
  warnings: string[];             // surfaced to the rep on the overlay
}

/**
 * The single pre-dial gate. Hard-blocks on DNC or a clear out-of-window call; warns (allows) when the
 * timezone is unknown or consent is required, so the rep can act rather than being silently exposed.
 */
export function precallCheck(inp: PrecallInput): PrecallResult {
  const recording = consentRegime(inp.areaCode);
  const needsConsent = recording !== "one-party"; // all-party OR unknown → get consent (fail-safe)
  const window = callingWindow(inp.areaCode, inp.nowUtcMs);
  const warnings: string[] = [];

  if (needsConsent)
    warnings.push(recording === "unknown"
      ? "Consent: unknown state — get the prospect's OK to record before you do."
      : `Consent: ${stateFor(inp.areaCode)} is all-party — say “this call may be recorded” and get an OK.`);
  if (window.ok === null) warnings.push(window.reason!);
  else if (window.ok === false) warnings.push(window.reason!);
  else if (window.reason) warnings.push(window.reason);

  const allow = !inp.dnc && window.ok !== false; // block on DNC or a definite out-of-window call
  if (inp.dnc) warnings.unshift("On the Do-Not-Call list — do not connect.");

  return { allow, recording, needsConsent, window, dnc: inp.dnc, state: stateFor(inp.areaCode), warnings };
}

/** A short, spoken consent line for the rep to open with when recording requires it. */
export function consentLine(): string {
  return "Quick heads-up before we start — I've got a note-taker on the line that may record this call for quality. That good with you?";
}
