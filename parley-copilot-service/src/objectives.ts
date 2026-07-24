// The Play-Caller — the DIRECTIVE layer of the brain.
//
// The reactive layer answers objections. The affective layer reads tone. The behavioural layer reads
// how the call is going. None of them decide WHAT TO DO NEXT TO WIN. That's this layer.
//
// It models the call as a set of winnable objectives (earn permission → discover → surface & quantify
// pain → tie value → set the next step) and, on every turn, calls the next best play. Its headline job
// is the hardest instinct to teach a rep: TIMING THE ASK. Deals die two ways — asking too early (cold,
// no pain) and never asking (warm call, no close). The Play-Caller catches both: it throws a GREEN LIGHT
// the moment the close window opens, and a HOLD when the rep reaches for it too soon.
//
// Pure + deterministic so the judgment is testable; the engine feeds it live signals it already computes.

export type ObjectiveId = "permission" | "discovery" | "pain" | "value" | "next-step";

export interface CallSignals {
  elapsedMs: number;
  stage: string;            // intro | discovery | value | objection | close | wrap
  repQuestions: number;     // rep utterances containing a question
  prospectTurns: number;
  painSurfaced: boolean;    // the prospect voiced a real problem / motivation
  valueTied: boolean;       // the rep connected a benefit to that pain
  nextStepAsked: boolean;   // the rep has asked for the meeting / next step
  heat: number;             // 0..100 lead temperature
  buyingSignal: boolean;    // a buying question landed recently
  resonance: number;        // 0..1 vocal entrainment (rapport)
  repClosingNow: boolean;   // the rep is reaching for the close on THIS turn
}

export interface Objective { id: ObjectiveId; done: boolean; label: string }

/** The winnable objectives of the call, derived from live signals. Completion of these IS the call. */
export function objectives(s: CallSignals): Objective[] {
  return [
    { id: "permission", done: s.stage !== "intro" || s.prospectTurns >= 2, label: "Earn permission to continue" },
    { id: "discovery", done: s.repQuestions >= 2, label: "Ask real discovery questions" },
    { id: "pain", done: s.painSurfaced, label: "Surface the real pain / motivation" },
    { id: "value", done: s.valueTied, label: "Tie value to that pain" },
    { id: "next-step", done: s.nextStepAsked, label: "Lock the next step" },
  ];
}

/** 0..100 — how much of the winnable call has actually been won. Feeds a live progress gauge. */
export function completion(s: CallSignals): number {
  const o = objectives(s);
  return Math.round((o.filter((x) => x.done).length / o.length) * 100);
}

export type PlayKind = "close" | "hold" | "discover" | "quantify" | "advance";
export interface Play { kind: PlayKind; action: string; detail: string; urgency: "now" | "soon" | "fyi" }

const discoveryDone = (s: CallSignals) => s.repQuestions >= 2;

/**
 * The next best move, or null if the rep is on track and nothing needs saying. Ordered by stakes:
 * timing the ask first (the money move), then course-corrections.
 */
export function nextBestAction(s: CallSignals): Play | null {
  // ── GREEN LIGHT: the close window is open — warm, engaged, discovered, and no ask on the table yet.
  if (!s.nextStepAsked && discoveryDone(s) && (s.heat >= 62 || (s.heat >= 55 && (s.buyingSignal || s.resonance >= 0.65))))
    return { kind: "close", urgency: "now",
      action: "Green light — ask for the meeting now",
      detail: "They're warm and with you. Assume it and offer two concrete times: “Does Tuesday at 10 or Thursday at 2 work better?” Don't keep selling — ask." };

  // ── HOLD: the rep is reaching for the close cold — no pain surfaced, still cool. Pull them back.
  if (s.repClosingNow && s.heat < 42 && !s.painSurfaced)
    return { kind: "hold", urgency: "now",
      action: "Too early — don't ask yet",
      detail: "No pain on the table and they're still cool. Asking now gets a reflex no. One real question first, then earn it." };

  // ── DISCOVERY OVERDUE: prospect has talked, rep hasn't asked a single question.
  if (s.repQuestions === 0 && s.prospectTurns >= 2 && s.elapsedMs > 40_000)
    return { kind: "discover", urgency: "now",
      action: "Ask your first real question",
      detail: "You're talking, not diagnosing. Ask what's driving the timing — then go quiet and let them fill it." };

  // ── PAIN NOT QUANTIFIED: they named a problem but no number is attached, so value has no size.
  if (s.painSurfaced && !s.valueTied && s.repQuestions >= 1)
    return { kind: "quantify", urgency: "soon",
      action: "Put a number on the pain",
      detail: "They named the problem — quantify it: “What's that costing you a month?” Value only lands once it has a size." };

  // ── NEXT-STEP OVERDUE: a long, warming call with no ask yet — close the loop before the energy fades.
  if (!s.nextStepAsked && s.elapsedMs > 240_000 && s.heat >= 45)
    return { kind: "advance", urgency: "now",
      action: "Lock the next step now",
      detail: "You're deep in a good call with no ask on the table. Set the next step out loud before the momentum cools." };

  return null;
}
