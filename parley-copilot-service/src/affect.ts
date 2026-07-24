// Affect & lead-temperature — understand the prospect's TONE before curating a response, and track
// how warm they're getting so the copilot keeps a cold lead on the line and moves them to hot.
//
// Two signals, fused:
//   • acoustic (prosody / tone of voice) — supplied by the audio edge via call.affect.v1 (Hume-class)
//   • lexical  (the words themselves)     — the fast heuristic below (no LLM in the hot path)
// Fusion matters: tone catches an angry "fine." that the words alone would read as neutral.
import type { Affect, Emotion, HeatTier } from "@parley/contracts";

const HOT_NEG = ["stop calling", "remove me", "don't call", "how dare", "never call", "scam", "harass"];
const NEG = ["not interested", "no thanks", "busy", "waste", "annoying", "ridiculous", "already told", "how did you get", "unsubscribe", ...HOT_NEG];
const SKEPTIC = ["doubt", "really?", "sure it does", "yeah right", "prove", "too good", "what's the catch"];
const POS = ["interesting", "tell me more", "makes sense", "go on", "sounds good", "okay yeah", "fair enough", "i like"];
const BUY = ["how much", "what's the price", "when could you", "how does it work", "what if", "send me", "next step", "can you do", "what would that look"];

const count = (t: string, w: string[]) => w.reduce((n, x) => n + (t.includes(x) ? 1 : 0), 0);
const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));

/** Words-only affect. Cheap, deterministic, always available even with no acoustic model wired. */
export function lexicalAffect(text: string): Affect {
  const t = text.toLowerCase();
  const neg = count(t, NEG), pos = count(t, POS), buy = count(t, BUY), skep = count(t, SKEPTIC), hot = count(t, HOT_NEG);
  const emphatic = /[!]{1,}|\b(never|absolutely|seriously)\b/.test(t) || text.replace(/[^A-Z]/g, "").length > text.length * 0.3;
  const valence = clamp((pos + buy * 0.5 - neg - skep * 0.5) / Math.max(1, pos + neg + buy + skep));
  const arousal = clamp(hot > 0 ? 0.9 : emphatic ? 0.7 : neg > 0 ? 0.5 : buy > 0 ? 0.55 : 0.3, 0, 1);
  let emotion: Emotion = "neutral";
  if (hot > 0 || (valence < -0.3 && arousal > 0.6)) emotion = "angry";
  else if (skep > 0) emotion = "skeptical";
  else if (valence < -0.15) emotion = "frustrated";
  else if (buy > 0 && valence >= 0) emotion = valence > 0.3 ? "warming" : "curious";
  else if (valence > 0.5) emotion = arousal > 0.6 ? "excited" : "positive";
  else if (t.split(/\s+/).length <= 3 && valence <= 0) emotion = "hesitant";
  const strength = Math.min(1, (neg + pos + buy + skep + hot) / 3);
  return { emotion, valence, arousal, confidence: 0.35 + strength * 0.45, source: "lexical" };
}

/** Fuse tone (acoustic) with words (lexical). Tone drives arousal & catches hidden anger; words drive
 *  topic. Disagreement (calm words / hot tone) lowers confidence and trusts the tone. */
export function fuseAffect(lex: Affect, aco?: Affect): Affect {
  if (!aco) return lex;
  // trust the tone more when the model is stronger than a DSP baseline.
  const w = aco.model === "audio-llm" || aco.model === "emotion2vec" || aco.model === "hume" ? 0.7 : 0.6;
  const valence = clamp(lex.valence * (1 - w * 0.5) + aco.valence * (w * 0.5) + lex.valence * (0.5 - w * 0.25));
  const arousal = clamp(lex.arousal * (1 - w) + aco.arousal * w, 0, 1);
  const disagree = Math.abs(lex.valence - aco.valence) > 0.6;
  // anger hides behind neutral words — let a hot, negative TONE override a mild lexical read.
  const emotion: Emotion = aco.arousal > 0.6 && aco.valence < -0.2 ? "angry" : (valence < 0 ? aco.emotion : lex.emotion);
  return {
    emotion, valence, arousal, source: "fused",
    confidence: (lex.confidence + aco.confidence) / 2 * (disagree ? 0.7 : 1),
    model: aco.model ? `fused(${aco.model}+lexical)` : "fused",
    features: aco.features, resonance: aco.resonance,
  };
}

/** The lead thermometer. A 0–100 heat with momentum: rises on engagement + warming tone + buying
 *  signals, falls on hostility / disengagement, decays gently toward neutral. This is the number the
 *  whole strategy optimizes — cold → hot without hanging up. */
export class Thermometer {
  private heat = 22;      // start cold
  private prev = 22;
  private prevRes = 0.3;  // last vocal-resonance reading (for its trend)
  update(inp: { affect: Affect; prospectWords: number; buyingSignal: boolean; objectionResolved?: boolean }): { heat: number; tier: HeatTier; trend: "up" | "flat" | "down"; drivers: string[] } {
    const d: string[] = [];
    let delta = 0;
    // engagement: a talking prospect is a warming prospect; monosyllables cool it.
    if (inp.prospectWords >= 12) { delta += 4; d.push("engaged / talking"); }
    else if (inp.prospectWords <= 3) { delta -= 3; d.push("short answers"); }
    // tone
    delta += inp.affect.valence * 8 * inp.affect.confidence;
    if (inp.affect.emotion === "angry") { delta -= 12; d.push("tone: angry"); }
    else if (inp.affect.emotion === "warming" || inp.affect.emotion === "excited") { delta += 6; d.push("tone: warming"); }
    if (inp.buyingSignal) { delta += 9; d.push("asked a buying question"); }
    if (inp.objectionResolved) { delta += 5; d.push("objection handled"); }
    // VOCAL RESONANCE — rapport shows up in the voice before the words. Rising entrainment is a
    // leading warm signal; a diverging voice is an early cooling warning.
    if (inp.affect.resonance != null) {
      const r = inp.affect.resonance;
      if (r > this.prevRes + 0.05) { delta += 5; d.push("voice matching (rapport ↑)"); }
      else if (r < this.prevRes - 0.08) { delta -= 3; d.push("voice diverging"); }
      else if (r > 0.7) { delta += 2; }
      this.prevRes = r;
    }
    delta += (40 - this.heat) * 0.02; // mild pull toward neutral so nothing runs away
    this.prev = this.heat;
    this.heat = Math.max(0, Math.min(100, this.heat + delta));
    const tier: HeatTier = this.heat >= 75 ? "hot" : this.heat >= 50 ? "warm" : this.heat >= 28 ? "cool" : "cold";
    const trend = this.heat - this.prev > 1.5 ? "up" : this.heat - this.prev < -1.5 ? "down" : "flat";
    return { heat: Math.round(this.heat), tier, trend, drivers: d.slice(0, 2) };
  }
  get value() { return Math.round(this.heat); }
}

// ── emotion → response strategy ──────────────────────────────────────────────────
// The whole objective: KEEP THEM ON THE CALL and warm them up. Never dead-end, never push a hot
// prospect too early, never pitch an angry one. Each play names the master whose move fits the moment.
export interface Strategy { play: "de-escalate" | "acknowledge" | "probe" | "advance" | "trial-close" | "close"; master: string; directive: string; }

export function strategyFor(a: Affect, heat: number, traj: "escalating" | "cooling" | "steady" = "steady"): Strategy {
  if (a.emotion === "angry" || a.emotion === "frustrated") {
    // read the DIRECTION, not just the level: if they're already cooling, don't re-trigger them.
    if (traj === "cooling")
      return { play: "acknowledge", master: "Chris Voss", directive: "They're settling — validate it (“I appreciate you sticking with me”), then ask ONE easy question to keep the momentum. Don't re-open the heat." };
    return { play: "de-escalate", master: "Chris Voss", directive: "Do NOT pitch. Label the emotion (“it sounds like this landed at a bad time”), slow your pace, then ask one open question to keep them talking." };
  }
  if (a.emotion === "skeptical")
    return { play: "acknowledge", master: "Chris Voss", directive: "Acknowledge the doubt out loud, give one crisp proof point, then hand it back with a calibrated question. Keep them on the line." };
  const resonating = (a.resonance ?? 0) > 0.65;
  if (heat >= 75 || (heat >= 62 && resonating))
    return { play: "close", master: "Straight Line", directive: "They're hot and their voice is in sync with yours — go for the specific ask now. Assume the meeting; offer two concrete times." };
  if (heat >= 50 || a.emotion === "warming" || a.emotion === "curious")
    return { play: "trial-close", master: "Alex Hormozi", directive: "Stack value on exactly what they just showed interest in, then float a soft trial close to test the temperature." };
  return { play: "probe", master: "NEPQ (Jeremy Miner)", directive: "Ask one sharp question that surfaces the real motivation and keeps them talking — the longer they talk, the warmer they get." };
}
