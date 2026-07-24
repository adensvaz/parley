// parley-contracts — the versioned event catalog (NATS subjects) shared by every service.
// Backward-compatible evolution only: add fields, never repurpose; bump v2.* for breaking changes.

export const SUBJECTS = {
  callStarted: "call.started.v1",
  callTranscript: "call.transcript.v1",
  callCard: "call.card.v1",
  callEnded: "call.ended.v1",
  callScored: "call.scored.v1",              // analytics → desktop/web: the rep's scorecard is ready
  callAffect: "call.affect.v1",              // audio edge → copilot: acoustic emotion of an utterance (prosody)
  leadHeat: "lead.heat.v1",                  // copilot → desktop/analytics: running cold→hot lead temperature
  objectionFired: "objection.fired.v1",
  leadUpserted: "lead.upserted.v1",
  usageMetered: "usage.metered.v1",
  dncRequested: "compliance.dnc_requested.v1",
  numberProvisioned: "telephony.number_provisioned.v1", // a Parley virtual number was assigned to an org
  callBehaviour: "call.behaviour.v1",        // copilot → desktop/analytics: live + final Voice Behaviour Analysis
} as const;

export type Subject = (typeof SUBJECTS)[keyof typeof SUBJECTS];

export interface Envelope<T> {
  id: string;            // event id (idempotency key for consumers)
  subject: Subject;
  orgId: string;
  traceId: string;       // propagated from the edge for distributed tracing
  occurredAt: string;    // ISO-8601
  data: T;
}

// How the call's audio reached Parley. Every source converges on the same call.transcript pipeline,
// so copilot/analytics/billing stay source-agnostic — the source is metadata, not a branch.
// "bridge" = the rep keeps their OWN number/SIM. Parley rings the rep's cell, they answer on their
// normal phone, and Parley dials the prospect presenting the rep's own (verified) caller ID — both
// legs conferenced so we still hear both sides. No porting, no new SIM.
export type CallSource = "desktop" | "pstn" | "sip" | "zoom" | "meet" | "bridge";

export interface CallStarted { callId: string; repId: string; leadId?: string; modeId: string; source?: CallSource /* default "desktop" */; culture?: string /* prospect locale, e.g. en-IN / zh-CN / ru-RU */ }
export interface CallTranscript { callId: string; speaker: "rep" | "prospect"; text: string; isFinal: boolean }
export interface CallCard { callId: string; kind: "objection" | "script" | "coach" | "answer" | "signal"; title: string; body: string; urgency: "now" | "soon" | "fyi" }
export interface CallEnded { callId: string; repId: string; disposition: string; talkRatioRep: number; appointmentSet: boolean; source?: CallSource; durationSec?: number /* connected audio seconds — the billable unit (STT/affect cost is per-minute) */ }
export interface ObjectionFired { callId: string; label: string; severity?: "low" | "med" | "high" }
export interface UsageMetered { metric: "call" | "minute"; qty: number }

// ── Post-call report / scorecard (analytics-service) ─────────────────────────────
export type CallStage = "opener" | "discovery" | "objection" | "close";
export interface StageGrade {
  stage: CallStage;
  status: "strong" | "ok" | "weak" | "missed"; // drives the ✓ / ⚠ chips on the scorecard
  note: string;                                 // e.g. "4 discovery questions", "dropped price"
}
/** A transcript-anchored moment the report points back to (self-coaching: "here's where it happened"). */
export interface ReportMoment { atMs: number; speaker: "rep" | "prospect"; quote: string; tag: string }
export interface Scorecard {
  callId: string;
  repId: string;
  score: number;              // 0–100 overall
  stages: StageGrade[];       // opener / discovery / objection / close
  fix: { title: string; detail: string; playbook?: string }; // the ONE thing to fix next call (from the master playbook)
  moments: ReportMoment[];    // key transcript anchors
  talkRatioRep: number;
  objectionsHandled: number;
  appointmentSet: boolean;
  behaviour?: VoiceBehaviour; // premium — Voice Behaviour Analysis of the call (if the plan includes it)
}
export type CallScored = Scorecard;

// ── Voice Behaviour Analysis (premium tier) ──────────────────────────────────────
// The affect + Vocal Resonance + heat stream, aggregated into a behavioural profile of the WHOLE
// call: how present the prospect was, how in-sync the two voices got, how much they swung, how much
// strain was in the voice, and which way the momentum ran. This is the sellable artifact that sits on
// top of the raw per-utterance affect signal — the thing that reads *how* the call felt, not just what
// was said. Emitted live (a running gauge) and finalized at call end (into the scorecard).
export interface BehaviourSample {
  atMs: number;
  heat: number;               // 0..100 lead temperature at this turn
  valence: number;            // -1..1
  arousal: number;            // 0..1
  resonance: number;          // 0..1 vocal entrainment
  emotion: Emotion;
  speaker: "rep" | "prospect";
  words: number;
}
export interface VoiceBehaviour {
  callId: string;
  engagement: number;   // 0..100 — presence: prospect talk-time + turn length (a talking lead is a warming lead)
  rapport: number;      // 0..100 — Vocal Resonance / entrainment, peak-weighted (rapport shows in the voice first)
  volatility: number;   // 0..100 — emotional swing across the call (steady vs. rollercoaster)
  stress: number;       // 0..100 — hesitation / vocal strain markers (pitch instability + slowed rate + negative arousal)
  momentum: number;     // -100..100 — cold→hot slope over the call (the number that matters most)
  balance: number;      // 0..100 — talk-share health (100 = the ideal 40–60% rep band; monologue or interrogation lowers it)
  peakHeat: number;     // 0..100 — hottest the lead got
  read: string;         // one-line behavioural read of the call
  flags: string[];      // opportunities / risks, e.g. "rapport building", "cooling — voice diverging", "monologue risk"
  timeline: { atMs: number; heat: number; resonance: number; emotion: Emotion }[]; // sparkline of the journey
}

// ── Affect / emotion + lead temperature ─────────────────────────────────────────
// Understanding the prospect's TONE (not just their words) before curating a response, and tracking
// how warm they are getting — so the copilot keeps a cold lead on the line and moves them to hot.
export type Emotion =
  | "angry" | "frustrated" | "skeptical" | "hesitant"
  | "neutral" | "curious" | "warming" | "positive" | "excited";
/** Low-level prosodic features (dependency-free DSP) that back the acoustic read + the resonance signal. */
export interface AcousticFeatures {
  energyDb: number;   // loudness (dBFS)
  pitchHz: number;    // fundamental frequency estimate (F0)
  pitchVar: number;   // intonation range — monotone (disengaged) vs. animated
  speechRate: number; // voiced-activity proxy, 0..1 (slow/hesitant vs. fast/activated)
}
export interface Affect {
  emotion: Emotion;
  valence: number;        // -1 (negative) … +1 (positive)
  arousal: number;        // 0 (calm) … 1 (activated) — an angry vs. a bored "no" differ here
  confidence: number;     // 0..1
  source: "acoustic" | "lexical" | "fused";
  model?: string;         // which engine produced it: audio-llm | emotion2vec | hume | dsp | lexical | fused
  features?: AcousticFeatures;
  // NOVEL — Vocal Resonance: 0..1 prosodic entrainment between prospect and rep (how much the prospect's
  // tone is converging toward the rep's). Rising resonance = rapport building, and it moves in the VOICE
  // before it shows in the words — a leading indicator that a cold lead is warming.
  resonance?: number;
}
/** Per-utterance acoustic emotion from the audio edge (prosody model ensemble). */
export interface CallAffect { callId: string; speaker: "prospect" | "rep"; affect: Affect }

export type HeatTier = "cold" | "cool" | "warm" | "hot";
export interface LeadHeat {
  callId: string;
  heat: number;           // 0..100
  tier: HeatTier;
  trend: "up" | "flat" | "down";
  drivers?: string[];     // why it moved: "asked a buying question", "tone warming", "went quiet"
}

// ── Telephony / connection (telephony-service) ───────────────────────────────────
export interface NumberProvisioned { e164: string; orgId: string; repId?: string; provider: "twilio" | "telnyx"; source: Extract<CallSource, "pstn" | "sip"> }
