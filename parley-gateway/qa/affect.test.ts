// Proves the affect engine's DSP + Vocal-Resonance math with NUMBERS, not vibes — the always-on core
// that runs even with zero external models. Run: npx tsx qa/affect.test.ts
import { extractFeatures, dspAffect, toSamples, createAffectEngine } from "../src/affect.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };

const SR = 16000;
function sine(freq: number, ms: number, amp = 0.6, sr = SR): Buffer {
  const n = Math.round((sr * ms) / 1000), b = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / sr) * amp * 32767), i * 2);
  return b;
}
const b64 = (b: Buffer) => b.toString("base64");
const feats = (b: Buffer, sr = SR) => extractFeatures(toSamples(b, "linear16"), sr);

console.log("\n§ DSP — fundamental frequency (F0) recovery");
for (const f0 of [110, 150, 220, 300]) {
  const est = feats(sine(f0, 700)).pitchHz;
  check(`F0 ${f0}Hz`, Math.abs(est - f0) <= Math.max(12, f0 * 0.06), `estimated ${est.toFixed(1)}Hz`);
}

console.log("\n§ DSP — energy → arousal ordering");
{
  const loud = dspAffect(feats(sine(180, 600, 0.9))).arousal;
  const quiet = dspAffect(feats(sine(180, 600, 0.1))).arousal;
  check("louder voice → higher arousal", loud > quiet, `loud ${loud.toFixed(2)} > quiet ${quiet.toFixed(2)}`);
}

console.log("\n§ DSP — speech-rate (voiced ratio)");
{
  const contin = feats(sine(160, 800)).speechRate;                 // continuous tone
  const gappy = Buffer.concat([sine(160, 120), Buffer.alloc(16000), sine(160, 120)]); // tone…silence…tone
  const sparse = feats(gappy).speechRate;
  check("continuous > gappy speech rate", contin > sparse, `${contin.toFixed(2)} > ${sparse.toFixed(2)}`);
}

console.log("\n§ PCM decode");
{
  const b = Buffer.alloc(6); [1234, -20000, 32000].forEach((v, i) => b.writeInt16LE(v, i * 2));
  const s = toSamples(b, "linear16");
  check("linear16 round-trips exactly", s[0] === 1234 && s[1] === -20000 && s[2] === 32000);
  const mu = toSamples(Buffer.from([0xff, 0x7f, 0x00]), "mulaw");   // 0xFF≈0, 0x00 = loudest negative
  check("μ-law decodes (one sample per byte, magnitude ordering)", mu.length === 3 && Math.abs(mu[2]) > Math.abs(mu[0]), `|${mu[2]}| > |${mu[0]}|`);
}

console.log("\n§ Vocal Resonance — prosodic entrainment");
{
  // matched voices → high resonance
  const a = createAffectEngine({ encoding: "linear16", sampleRate: SR });
  a.push("rep", b64(sine(160, 500, 0.6)));
  a.push("prospect", b64(sine(160, 500, 0.6)));
  const matched = (await a.read())?.resonance ?? 0;
  check("matched voices → high resonance", matched > 0.7, `resonance ${matched.toFixed(2)}`);

  // divergent voices (quiet low vs loud high) → low resonance
  const b = createAffectEngine({ encoding: "linear16", sampleRate: SR });
  b.push("rep", b64(sine(110, 500, 0.15)));
  b.push("prospect", b64(sine(260, 500, 0.95)));
  const diverged = (await b.read())?.resonance ?? 1;
  check("divergent voices → low resonance", diverged < matched - 0.15, `resonance ${diverged.toFixed(2)} < ${matched.toFixed(2)}`);
}

console.log("\n§ read() falls back to DSP offline (no model env, no network)");
{
  const e = createAffectEngine({ encoding: "linear16", sampleRate: SR });
  e.push("prospect", b64(sine(200, 500, 0.8)));
  const r = await e.read();
  check("returns a DSP affect with features", !!r && r.model === "dsp" && !!r.features, r ? `model=${r.model}` : "null");
}

console.log(`\n${fail ? "❌" : "✅"} affect DSP: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
