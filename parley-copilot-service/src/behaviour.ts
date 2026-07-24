// Voice Behaviour Analysis — the premium layer.
//
// The engine already reads, per prospect turn, a fused Affect (tone + words), a Vocal Resonance
// (voice entrainment between rep and prospect), and a 0–100 lead heat. Individually those are signals.
// Aggregated across the whole call they become a *behavioural profile*: how present the prospect was,
// how in-sync the two voices got, how much they swung, how much strain was in the voice, and which way
// the momentum ran. That profile is the sellable artifact — it reads HOW the call felt, not just what
// was said — and it's what Voice Intelligence charges for.
//
// Pure + dependency-free so it runs live (a rolling gauge) and at call end (into the scorecard), and is
// trivially testable.
import type { Affect, Emotion, VoiceBehaviour, BehaviourSample } from "@parley/contracts";

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a: number[]) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };

/** Per-turn strain: a voice under pressure is high-arousal + negative, or hesitant/slowed, or overtly hot. */
function strainOf(s: BehaviourSample): number {
  let x = 0;
  if (s.arousal > 0.5 && s.valence < 0) x += Math.min(1, (s.arousal - 0.5) * 2) * Math.min(1, -s.valence * 1.5);
  if (s.emotion === "hesitant") x += 0.4;
  if (s.emotion === "skeptical") x += 0.3;
  if (s.emotion === "frustrated") x += 0.5;
  if (s.emotion === "angry") x += 0.7;
  return Math.min(1, x);
}

/**
 * Analyze a call's behaviour from the affect/resonance/heat samples.
 * @param talkRatioRep 0..1 fraction of words spoken by the rep (for talk-share balance).
 */
export function analyzeBehaviour(callId: string, samples: BehaviourSample[], talkRatioRep = 0.5): VoiceBehaviour {
  const pros = samples.filter((s) => s.speaker === "prospect");
  if (!pros.length) {
    return { callId, engagement: 0, rapport: 0, volatility: 0, stress: 0, momentum: 0, balance: 50, peakHeat: 0, read: "No read yet — waiting for the prospect to talk.", flags: [], timeline: [] };
  }

  // engagement — a talking prospect is a warming prospect: length of turns + share of the conversation.
  const avgWords = mean(pros.map((s) => s.words));
  const prospectShare = 1 - talkRatioRep;
  const engagement = clamp(Math.round(0.6 * clamp((avgWords / 16) * 100) + 0.4 * prospectShare * 100));

  // rapport — Vocal Resonance, peak-weighted (a single moment of real sync matters more than a flat mean).
  const res = pros.map((s) => s.resonance).filter((r) => r > 0);
  const rapport = res.length ? clamp(Math.round((0.6 * Math.max(...res) + 0.4 * mean(res)) * 100)) : 0;

  // volatility — how much the emotional valence swung across the call.
  const volatility = clamp(Math.round(Math.min(1, std(pros.map((s) => s.valence)) / 0.5) * 100));

  // stress — mean vocal strain across prospect turns.
  const stress = clamp(Math.round(mean(pros.map(strainOf)) * 100));

  // momentum — the cold→hot slope. Compare the last third of the call to the first third (robust to noise).
  const heats = pros.map((s) => s.heat);
  const third = Math.max(1, Math.floor(heats.length / 3));
  const early = mean(heats.slice(0, third));
  const late = mean(heats.slice(-third));
  const momentum = Math.round(Math.max(-100, Math.min(100, (late - early) * 1.8)));

  // balance — talk-share health. 40–60% rep is the ideal band; monologue or one-word answers erode it.
  const balance = clamp(Math.round(100 - Math.abs(talkRatioRep - 0.5) * 220));

  const peakHeat = clamp(Math.round(Math.max(...heats)));

  // one-line read — ranked by what a closer would act on first.
  let read: string;
  if (momentum >= 25 && rapport >= 55) read = "Warming fast — the two voices are syncing. Keep pulling and go for the ask while it's hot.";
  else if (momentum <= -20) read = "Cooling — the voice is diverging. Stop pitching and re-open with a question before you lose them.";
  else if (volatility >= 60 && stress >= 55) read = "Guarded and swinging — high vocal strain. De-escalate and slow the pace before any close.";
  else if (momentum >= 20) read = "Trending up — engagement is building even if the voices haven't fully synced. Keep them talking.";
  else if (engagement <= 30) read = "Low presence — short, closed answers. You're carrying the call; ask something they can't answer in one word.";
  else if (rapport >= 60) read = "In sync and steady — strong rapport. This is the moment to advance.";
  else read = "Steady and neutral — nudge with a sharp discovery question to create movement.";

  const flags: string[] = [];
  if (momentum >= 25) flags.push("heating up");
  if (momentum <= -20) flags.push("cooling — voice diverging");
  if (rapport >= 60) flags.push("rapport building (voice sync ↑)");
  if (stress >= 60) flags.push("vocal strain detected");
  if (volatility >= 60) flags.push("emotionally volatile");
  if (engagement >= 70) flags.push("highly engaged");
  if (balance <= 45) flags.push(talkRatioRep > 0.6 ? "monologue risk — rep dominating" : "rep too quiet — prospect running the call");
  if (peakHeat >= 75) flags.push("hit hot — was there a clear ask?");

  // timeline — down-sample the journey to ≤24 points for a sparkline.
  const step = Math.max(1, Math.ceil(pros.length / 24));
  const timeline = pros.filter((_, i) => i % step === 0).map((s) => ({ atMs: s.atMs, heat: s.heat, resonance: s.resonance, emotion: s.emotion }));

  return { callId, engagement, rapport, volatility, stress, momentum, balance, peakHeat, read, flags: flags.slice(0, 4), timeline };
}

/** Rolling accumulator used live in the engine: push each prospect turn, read a snapshot for the overlay. */
export class VoiceBehaviourMeter {
  private samples: BehaviourSample[] = [];
  constructor(private callId: string) {}
  push(affect: Affect, heat: number, opts: { atMs: number; speaker: "rep" | "prospect"; words: number }) {
    this.samples.push({
      atMs: opts.atMs, heat,
      valence: affect.valence, arousal: affect.arousal,
      resonance: affect.resonance ?? 0, emotion: affect.emotion,
      speaker: opts.speaker, words: opts.words,
    });
  }
  /** Current behavioural read. Pass the live talk ratio for balance. */
  snapshot(talkRatioRep = 0.5): VoiceBehaviour { return analyzeBehaviour(this.callId, this.samples, talkRatioRep); }
  get turns() { return this.samples.filter((s) => s.speaker === "prospect").length; }
}

export type { VoiceBehaviour, BehaviourSample } from "@parley/contracts";
