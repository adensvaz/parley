// ── Parley Affect Engine ──────────────────────────────────────────────────────────────────────
// State-of-the-art tone understanding on the audio edge. Three things, in order of authority:
//
//   1. MODEL ENSEMBLE — the best configured model classifies emotion from the raw audio:
//        audio-native LLM (GPT-4o-audio / Gemini) → open SER (emotion2vec+) → Hume prosody.
//      These read sarcasm, strain, warmth — things text and energy alone miss.
//   2. DSP BASELINE — always on, zero-dependency: F0 (pitch), energy, intonation range, and speech
//      rate → a real acoustic affect read (not just loudness). Used when no model is configured, and
//      as the feature backbone for (3).
//   3. VOCAL RESONANCE (novel) — prosodic ENTRAINMENT between the prospect and the rep: how much the
//      prospect's voice is converging toward the rep's. Rapport shows up in the voice before the words,
//      so rising resonance is a *leading* indicator that a cold lead is warming. This is our invention.
//
// Output is always a single `Affect`; downstream (copilot) never changes when the model tier does.
import type { Affect, AcousticFeatures, Emotion } from "@parley/contracts";

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const EMOTION2VEC_URL = process.env.EMOTION2VEC_URL;         // self-hosted SER (best open model)
const HUME_KEY = process.env.HUME_API_KEY;
const AUDIO_LLM = process.env.AFFECT_AUDIO_LLM_MODEL;        // e.g. "gpt-4o-audio-preview"
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// ── PCM decode (linear16 or μ-law) → Int16 samples ──────────────────────────────────────────────
function muLawDecode(b: number): number {
  b = ~b & 0xff; const sign = b & 0x80, exp = (b >> 4) & 7, man = b & 0x0f;
  let s = ((man << 3) + 0x84) << exp; s -= 0x84; return sign ? -s : s;
}
export function toSamples(buf: Buffer, enc: "linear16" | "mulaw"): Int16Array {
  if (enc === "mulaw") { const o = new Int16Array(buf.length); for (let i = 0; i < buf.length; i++) o[i] = muLawDecode(buf[i]); return o; }
  const o = new Int16Array(buf.length >> 1); for (let i = 0; i + 1 < buf.length; i += 2) o[i >> 1] = buf.readInt16LE(i); return o;
}

// ── Prosodic feature extraction (dependency-free DSP) ───────────────────────────────────────────
export function extractFeatures(s: Int16Array, sr: number): AcousticFeatures {
  if (!s.length) return { energyDb: -60, pitchHz: 0, pitchVar: 0, speechRate: 0 };
  // energy (dBFS)
  let sumSq = 0; for (let i = 0; i < s.length; i++) sumSq += s[i] * s[i];
  const rms = Math.sqrt(sumSq / s.length);
  const energyDb = 20 * Math.log10(rms / 32768 + 1e-6);
  // frame-wise: voiced ratio (speech rate proxy) + F0 per voiced frame (autocorrelation)
  const frame = Math.round(sr * 0.03), hop = Math.round(sr * 0.015);
  const minLag = Math.floor(sr / 350), maxLag = Math.floor(sr / 80); // F0 ∈ 80–350 Hz
  const f0s: number[] = []; let voiced = 0, frames = 0;
  for (let start = 0; start + frame < s.length; start += hop) {
    frames++;
    let e = 0; for (let i = 0; i < frame; i++) e += s[start + i] * s[start + i];
    if (Math.sqrt(e / frame) < rms * 0.5) continue; // silent-ish frame
    voiced++;
    let bestLag = 0, best = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let ac = 0; for (let i = 0; i + lag < frame; i++) ac += s[start + i] * s[start + i + lag];
      if (ac > best) { best = ac; bestLag = lag; }
    }
    if (bestLag) f0s.push(sr / bestLag);
  }
  const pitchHz = f0s.length ? f0s.reduce((a, b) => a + b, 0) / f0s.length : 0;
  const pitchVar = f0s.length > 1 ? Math.sqrt(f0s.reduce((a, b) => a + (b - pitchHz) ** 2, 0) / f0s.length) : 0;
  return { energyDb, pitchHz, pitchVar, speechRate: frames ? voiced / frames : 0 };
}

// normalized feature vector [energy, pitch, rate] in 0..1 — the basis for affect + resonance.
function norm(f: AcousticFeatures) {
  return {
    e: clamp((f.energyDb + 45) / 45),           // −45dBFS..0 → 0..1
    p: clamp((f.pitchHz - 90) / 180),           // 90..270 Hz → 0..1 (higher = more activated)
    pv: clamp(f.pitchVar / 60),                 // intonation range
    r: clamp(f.speechRate),
  };
}

// ── DSP → Affect (a real acoustic read, not just volume) ────────────────────────────────────────
export function dspAffect(f: AcousticFeatures): Affect {
  const n = norm(f);
  const arousal = clamp(0.45 * n.e + 0.3 * n.r + 0.25 * n.p);
  // acoustic valence is weak but not zero: animated modulation reads warm; harsh flat-high reads hostile.
  const valence = clamp(0.6 * n.pv - 0.5 * Math.max(0, n.e - 0.7) - 0.3 * Math.max(0, 0.25 - n.r), -1, 1);
  let emotion: Emotion = "neutral";
  if (arousal > 0.6 && valence < -0.1) emotion = arousal > 0.78 ? "angry" : "frustrated";
  else if (arousal > 0.6 && valence >= 0.15) emotion = "excited";
  else if (arousal < 0.35 && n.r < 0.3) emotion = "hesitant";
  else if (valence > 0.2 && n.pv > 0.4) emotion = "warming";
  return { emotion, valence, arousal, confidence: 0.5, source: "acoustic", model: "dsp", features: f };
}

// ── Best-model providers (each fetch-based, fails safe to null) ──────────────────────────────────
function pcmToWav(s: Int16Array, sr: number): Buffer {
  const bytes = Buffer.alloc(44 + s.length * 2), n = s.length * 2;
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + n, 4); bytes.write("WAVE", 8); bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(sr, 24);
  bytes.writeUInt32LE(sr * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36); bytes.writeUInt32LE(n, 40);
  for (let i = 0; i < s.length; i++) bytes.writeInt16LE(s[i], 44 + i * 2);
  return bytes;
}
const EMO_MAP: Record<string, Partial<Affect>> = {
  anger: { emotion: "angry", valence: -0.8, arousal: 0.9 }, frustration: { emotion: "frustrated", valence: -0.5, arousal: 0.6 },
  contempt: { emotion: "skeptical", valence: -0.4, arousal: 0.5 }, doubt: { emotion: "skeptical", valence: -0.3, arousal: 0.4 },
  boredom: { emotion: "hesitant", valence: -0.2, arousal: 0.2 }, calmness: { emotion: "neutral", valence: 0.1, arousal: 0.2 },
  interest: { emotion: "curious", valence: 0.4, arousal: 0.5 }, excitement: { emotion: "excited", valence: 0.7, arousal: 0.85 },
  joy: { emotion: "positive", valence: 0.8, arousal: 0.6 }, amusement: { emotion: "warming", valence: 0.6, arousal: 0.5 },
};
function fromEmotionScores(scores: { name: string; score: number }[], model: string): Affect | null {
  if (!scores?.length) return null;
  const top = scores.slice().sort((a, b) => b.score - a.score)[0];
  const m = EMO_MAP[top.name.toLowerCase()] ?? {};
  return { emotion: (m.emotion as Emotion) ?? "neutral", valence: m.valence ?? 0, arousal: m.arousal ?? 0.5, confidence: clamp(top.score), source: "acoustic", model };
}
async function emotion2vec(wav: Buffer): Promise<Affect | null> {
  if (!EMOTION2VEC_URL) return null;
  try {
    const r = await fetch(EMOTION2VEC_URL, { method: "POST", headers: { "content-type": "audio/wav" }, body: new Uint8Array(wav) });
    if (!r.ok) return null; const j: any = await r.json();
    return fromEmotionScores(j.emotions ?? j.scores, "emotion2vec");
  } catch { return null; }
}
async function humeProsody(_wav: Buffer): Promise<Affect | null> {
  if (!HUME_KEY) return null;
  // Hume Expression Measurement (prosody) → { predictions:[{emotions:[{name,score}]}] }. Slot kept
  // deliberately thin; returning null degrades to the next tier.
  return null;
}
async function audioLLM(wav: Buffer): Promise<Affect | null> {
  if (!AUDIO_LLM || !OPENAI_KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: AUDIO_LLM, modalities: ["text"], response_format: { type: "json_object" }, max_tokens: 60,
        messages: [
          { role: "system", content: "You judge a sales prospect's emotional tone from audio. Return JSON {emotion, valence, arousal}: emotion ∈ angry|frustrated|skeptical|hesitant|neutral|curious|warming|positive|excited; valence −1..1; arousal 0..1." },
          { role: "user", content: [{ type: "input_audio", input_audio: { data: wav.toString("base64"), format: "wav" } }] },
        ],
      }),
    });
    if (!r.ok) return null; const j: any = await r.json();
    const p = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    if (!p.emotion) return null;
    return { emotion: p.emotion, valence: clamp(p.valence ?? 0, -1, 1), arousal: clamp(p.arousal ?? 0.5), confidence: 0.8, source: "acoustic", model: "audio-llm" };
  } catch { return null; }
}
async function bestModel(s: Int16Array, sr: number): Promise<Affect | null> {
  const wav = pcmToWav(s, sr);
  return (await audioLLM(wav)) ?? (await emotion2vec(wav)) ?? (await humeProsody(wav));
}

// ── The engine: ingest both legs, read the prospect's affect + Vocal Resonance ──────────────────
export function createAffectEngine(opts: { encoding: "linear16" | "mulaw"; sampleRate: number } = { encoding: "linear16", sampleRate: 16000 }) {
  const buf: Buffer[] = [];                                   // prospect audio since last read
  const ema = { rep: null as null | ReturnType<typeof norm>, prospect: null as null | ReturnType<typeof norm> };
  const blend = (a: any, b: any, k = 0.4) => ({ e: a.e + (b.e - a.e) * k, p: a.p + (b.p - a.p) * k, pv: a.pv + (b.pv - a.pv) * k, r: a.r + (b.r - a.r) * k });

  function updateEma(speaker: "rep" | "prospect", s: Int16Array) {
    const v = norm(extractFeatures(s, opts.sampleRate));
    ema[speaker] = ema[speaker] ? blend(ema[speaker], v) : v;
  }
  function resonance(): number | undefined {
    if (!ema.rep || !ema.prospect) return undefined;
    const d = Math.sqrt(["e", "p", "r"].reduce((a, k) => a + ((ema.prospect as any)[k] - (ema.rep as any)[k]) ** 2, 0) / 3);
    return clamp(1 - d);                                      // 1 = voices aligned (entrained), 0 = far apart
  }

  return {
    push(speaker: "rep" | "prospect", base64pcm: string) {
      const b = Buffer.from(base64pcm, "base64");
      updateEma(speaker, toSamples(b, opts.encoding));         // both legs feed the resonance EMAs
      if (speaker === "prospect") { buf.push(b); while (buf.length > 60) buf.shift(); }
    },
    /** Prospect affect for the utterance just spoken — best model, DSP-backed, resonance-enriched. */
    async read(): Promise<Affect | null> {
      if (!buf.length) return null;
      const s = toSamples(Buffer.concat(buf.splice(0)), opts.encoding);
      const feats = extractFeatures(s, opts.sampleRate);
      const model = await bestModel(s, opts.sampleRate);
      const base = model ?? dspAffect(feats);
      return { ...base, features: feats, resonance: resonance() };
    },
  };
}

// Back-compat shim for existing call sites (createProsody().push(base64)/analyze()).
export function createProsody(opts?: { encoding: "linear16" | "mulaw"; sampleRate: number }) {
  const eng = createAffectEngine(opts);
  return { push: (b: string) => eng.push("prospect", b), analyze: () => eng.read() };
}
