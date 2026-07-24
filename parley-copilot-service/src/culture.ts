// Cultural brain-matching. The SAME tone means different things in different cultures — a reserved
// Chinese "yes", a blunt Russian "no", a warm Indian politeness. So we (1) recalibrate the affect
// read to the culture's expressive baseline (don't mistake directness for anger, or reserve for
// disengagement), and (2) re-voice the closer strategy to the culture's norms. This is how Parley
// matches the prospect's *vibe*, not just their words.
import type { Affect, Emotion } from "@parley/contracts";
import type { Strategy } from "./affect.js";
import { CLOSERS, pickFramework, type FrameworkId } from "./closers.js";

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));

export interface CultureProfile {
  id: string; name: string;
  directness: number;      // 0 indirect/face-saving … 1 blunt
  formality: number;
  warmth: number;          // relationship-first
  expressiveness: number;  // emotional expressiveness of *baseline* speech (used to calibrate affect)
  patience: number;        // tolerance for a slow build (low = wants it fast)
  hierarchy: number;       // deference / respect signaling
  frameworks: FrameworkId[]; // ranked closer frameworks that resonate here
  affect: { arousalBaseline: number; valenceBias: number; resonanceTarget: number };
  style: string;           // LLM style directive injected into the advisor prompt
  pace: string;
}

const P: Record<string, CultureProfile> = {
  "en-US": { id: "en-US", name: "US / General", directness: 0.8, formality: 0.4, warmth: 0.5, expressiveness: 0.6, patience: 0.4, hierarchy: 0.3,
    frameworks: ["straight-line", "hormozi", "voss", "cardone"], affect: { arousalBaseline: 0.4, valenceBias: 0, resonanceTarget: 0.6 },
    style: "Be direct and benefit-first; confident, get to the point.", pace: "brisk" },
  "en-IN": { id: "en-IN", name: "Indian", directness: 0.45, formality: 0.7, warmth: 0.85, expressiveness: 0.65, patience: 0.7, hierarchy: 0.75,
    frameworks: ["hormozi", "nepq", "voss", "cardone"], affect: { arousalBaseline: 0.4, valenceBias: 0.05, resonanceTarget: 0.6 },
    style: "Be warm, respectful and relationship-first; acknowledge them, use polite framing ('I completely understand'), build rapport before the ask, and connect to family, security and long-term value.", pace: "unhurried — earn trust first" },
  "zh-CN": { id: "zh-CN", name: "Chinese", directness: 0.25, formality: 0.75, warmth: 0.6, expressiveness: 0.35, patience: 0.85, hierarchy: 0.7,
    frameworks: ["nepq", "voss", "hormozi"], affect: { arousalBaseline: 0.28, valenceBias: 0.12, resonanceTarget: 0.72 },
    style: "Be indirect, patient and face-saving; never push or hard-close; ask questions and let them arrive at it; signal long-term reliability and mutual benefit; never force a blunt 'no'.", pace: "slow — trust over speed" },
  "ru-RU": { id: "ru-RU", name: "Russian", directness: 0.9, formality: 0.55, warmth: 0.35, expressiveness: 0.45, patience: 0.3, hierarchy: 0.5,
    frameworks: ["straight-line", "cardone", "voss"], affect: { arousalBaseline: 0.42, valenceBias: 0.15, resonanceTarget: 0.5 },
    style: "Be direct, substantive and competence-first; lead with proof and specifics; skip smiley small talk (it reads as fake); respect their intelligence — confident, not salesy.", pace: "fast — no fluff" },
  "es-419": { id: "es-419", name: "Latin American", directness: 0.55, formality: 0.45, warmth: 0.8, expressiveness: 0.85, patience: 0.6, hierarchy: 0.5,
    frameworks: ["hormozi", "straight-line", "voss"], affect: { arousalBaseline: 0.55, valenceBias: 0.05, resonanceTarget: 0.6 },
    style: "Be warm, personable and expressive; build rapport with energy, then land concrete value.", pace: "energetic" },
  "ja-JP": { id: "ja-JP", name: "Japanese", directness: 0.2, formality: 0.9, warmth: 0.55, expressiveness: 0.3, patience: 0.85, hierarchy: 0.85,
    frameworks: ["nepq", "voss"], affect: { arousalBaseline: 0.26, valenceBias: 0.12, resonanceTarget: 0.75 },
    style: "Be highly polite, indirect and patient; never pressure; emphasize reliability, consensus and respect; read silence as thinking, not rejection.", pace: "very measured" },
  "de-DE": { id: "de-DE", name: "German", directness: 0.85, formality: 0.65, warmth: 0.4, expressiveness: 0.4, patience: 0.45, hierarchy: 0.4,
    frameworks: ["hormozi", "straight-line", "voss"], affect: { arousalBaseline: 0.38, valenceBias: 0.1, resonanceTarget: 0.55 },
    style: "Be precise and fact-based; no hype; lead with data and specifics.", pace: "efficient" },
};

const ALIAS: Record<string, string> = {
  us: "en-US", en: "en-US", default: "en-US",
  in: "en-IN", india: "en-IN", indian: "en-IN", hi: "en-IN",
  cn: "zh-CN", zh: "zh-CN", china: "zh-CN", chinese: "zh-CN", mandarin: "zh-CN",
  ru: "ru-RU", russia: "ru-RU", russian: "ru-RU",
  mx: "es-419", es: "es-419", latam: "es-419", spanish: "es-419",
  jp: "ja-JP", ja: "ja-JP", japan: "ja-JP", japanese: "ja-JP",
  de: "de-DE", germany: "de-DE", german: "de-DE",
};
export function getCulture(id?: string): CultureProfile {
  if (!id) return P["en-US"];
  return P[id] ?? P[ALIAS[id.toLowerCase()]] ?? P["en-US"];
}

function deriveEmotion(v: number, ar: number): Emotion {
  if (ar > 0.6 && v < -0.15) return ar > 0.8 ? "angry" : "frustrated";
  if (ar > 0.6 && v > 0.2) return "excited";
  if (ar < 0.32 && v <= 0) return "hesitant";
  if (v > 0.35) return "positive";
  if (v > 0.1) return "warming";
  if (v < -0.1) return "skeptical";
  return "neutral";
}

/** Recenter the affect read to the culture's expressive baseline so we match their vibe, not a US default. */
export function calibrateAffect(a: Affect, c: CultureProfile): Affect {
  const arousal = clamp(0.3 + (a.arousal - c.affect.arousalBaseline), 0, 1);
  const valence = clamp(a.valence + c.affect.valenceBias);
  // keep a strong, unambiguous anger read; otherwise re-derive from the calibrated dimensions.
  const emotion = a.emotion === "angry" && a.arousal > 0.8 ? "angry" : deriveEmotion(valence, arousal);
  return { ...a, valence, arousal, emotion, model: `${a.model ?? a.source}+cx:${c.id}` };
}

/** Re-voice the base strategy to the culture: pick the resonant framework, soften hard closes where a
 *  blunt ask would break rapport, and fold in the cultural style + a canonical closer line. */
export function culturalize(base: Strategy, c: CultureProfile, a: Affect): Strategy {
  let play = base.play;
  if (c.directness < 0.4 && play === "close" && (a.resonance ?? 0) < c.affect.resonanceTarget) play = "trial-close";
  const fw = pickFramework(c.frameworks, play);
  const cl = CLOSERS[fw];
  return { play, master: cl.master, directive: `${base.directive} — ${c.style} ${cl.principle} e.g. "${cl.line}"` };
}

export function culturalStyle(c: CultureProfile): string { return `Prospect culture: ${c.name}. ${c.style} Pace: ${c.pace}.`; }
