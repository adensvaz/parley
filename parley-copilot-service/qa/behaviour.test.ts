// Proves Voice Behaviour Analysis: the affect/resonance/heat stream aggregates into a behavioural
// profile that reads HOW a call felt — warming vs. cooling, engaged vs. flat, calm vs. strained,
// balanced vs. monologue. Run: npx tsx qa/behaviour.test.ts
import type { BehaviourSample, Emotion } from "@parley/contracts";
import { analyzeBehaviour, VoiceBehaviourMeter } from "../src/behaviour.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };

// sample builder — one prospect turn
const S = (o: Partial<BehaviourSample>): BehaviourSample => ({
  atMs: 0, heat: 30, valence: 0, arousal: 0.3, resonance: 0.3, emotion: "neutral", speaker: "prospect", words: 10, ...o,
});

console.log("\n§ a warming call — cold → hot, voices syncing");
{
  const s: BehaviourSample[] = [
    S({ atMs: 0, heat: 22, valence: -0.1, resonance: 0.3, emotion: "skeptical", words: 5 }),
    S({ atMs: 5e3, heat: 34, valence: 0.05, resonance: 0.4, emotion: "curious", words: 12 }),
    S({ atMs: 12e3, heat: 52, valence: 0.25, resonance: 0.6, emotion: "warming", words: 18 }),
    S({ atMs: 20e3, heat: 68, valence: 0.4, resonance: 0.72, emotion: "warming", words: 22 }),
    S({ atMs: 27e3, heat: 79, valence: 0.5, resonance: 0.8, emotion: "positive", words: 20 }),
  ];
  const b = analyzeBehaviour("c1", s, 0.5);
  check("momentum is strongly positive", b.momentum >= 25, `momentum=${b.momentum}`);
  check("rapport is high (voice entrainment)", b.rapport >= 60, `rapport=${b.rapport}`);
  check("peak heat captured", b.peakHeat >= 75, `peak=${b.peakHeat}`);
  check("flags include heating up", b.flags.some((f) => /heating up/i.test(f)), b.flags.join(", "));
  check("read tells the closer to advance", /ask|advance|hot|pulling/i.test(b.read), b.read);
}

console.log("\n§ a cooling / hostile call — heat falling, voice diverging");
{
  const s: BehaviourSample[] = [
    S({ atMs: 0, heat: 40, valence: 0.1, arousal: 0.4, resonance: 0.45, emotion: "neutral", words: 14 }),
    S({ atMs: 6e3, heat: 33, valence: -0.2, arousal: 0.55, resonance: 0.3, emotion: "skeptical", words: 8 }),
    S({ atMs: 12e3, heat: 24, valence: -0.5, arousal: 0.7, resonance: 0.2, emotion: "frustrated", words: 6 }),
    S({ atMs: 18e3, heat: 15, valence: -0.75, arousal: 0.85, resonance: 0.12, emotion: "angry", words: 4 }),
  ];
  const b = analyzeBehaviour("c2", s, 0.5);
  check("momentum is negative", b.momentum <= -20, `momentum=${b.momentum}`);
  check("stress is elevated", b.stress >= 45, `stress=${b.stress}`);
  check("flags include cooling", b.flags.some((f) => /cooling/i.test(f)), b.flags.join(", "));
  check("read says stop pitching / re-open", /stop pitching|re-open|question|de-escalate/i.test(b.read), b.read);
}

console.log("\n§ engagement — long turns read high, one-word answers read low");
{
  const talky = analyzeBehaviour("c3", [S({ words: 22 }), S({ words: 26 }), S({ words: 19 })], 0.4);
  const flat = analyzeBehaviour("c4", [S({ words: 2 }), S({ words: 3 }), S({ words: 2 })], 0.75);
  check("talkative prospect → high engagement", talky.engagement >= 60, `engagement=${talky.engagement}`);
  check("monosyllabic prospect → low engagement", flat.engagement <= 35, `engagement=${flat.engagement}`);
  check("low-presence read fires", /low presence|carrying the call|one word/i.test(flat.read), flat.read);
}

console.log("\n§ balance — talk share health");
{
  const even = analyzeBehaviour("c5", [S({}), S({})], 0.5);
  const mono = analyzeBehaviour("c6", [S({}), S({})], 0.85);
  check("50/50 talk → balance 100", even.balance === 100, `balance=${even.balance}`);
  check("rep monologue → low balance + flag", mono.balance < 45 && mono.flags.some((f) => /monologue/i.test(f)), `balance=${mono.balance}, flags=${mono.flags.join(", ")}`);
}

console.log("\n§ volatility — a steady call vs. a rollercoaster");
{
  const steady = analyzeBehaviour("c7", [S({ valence: 0.2 }), S({ valence: 0.25 }), S({ valence: 0.2 })], 0.5);
  const swingy = analyzeBehaviour("c8", [S({ valence: 0.6 }), S({ valence: -0.6 }), S({ valence: 0.5 }), S({ valence: -0.7 })], 0.5);
  check("steady valence → low volatility", steady.volatility <= 30, `volatility=${steady.volatility}`);
  check("swinging valence → high volatility", swingy.volatility >= 60, `volatility=${swingy.volatility}`);
}

console.log("\n§ safety — empty stream doesn't throw");
{
  const b = analyzeBehaviour("c9", [], 0.5);
  check("empty → safe defaults", b.engagement === 0 && b.timeline.length === 0 && typeof b.read === "string");
}

console.log("\n§ live meter — accumulates and snapshots");
{
  const m = new VoiceBehaviourMeter("live");
  const A = (o: Partial<BehaviourSample>) => ({ emotion: "warming" as Emotion, valence: 0.3, arousal: 0.4, resonance: 0.6, confidence: 0.6, source: "fused" as const, ...o });
  m.push(A({}) as any, 40, { atMs: 0, speaker: "prospect", words: 12 });
  m.push(A({}) as any, 55, { atMs: 5e3, speaker: "prospect", words: 16 });
  const snap = m.snapshot(0.5);
  check("meter tracks prospect turns", m.turns === 2, `turns=${m.turns}`);
  check("snapshot returns a live read", snap.rapport > 0 && typeof snap.read === "string", `rapport=${snap.rapport}`);
}

console.log(`\n${fail ? "❌" : "✅"} behaviour: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
