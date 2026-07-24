// Proves the copilot affect brain: lexical read, tone-over-words fusion, the lead thermometer
// (incl. Vocal Resonance), and emotion→strategy. Run: npx tsx qa/affect.test.ts
import type { Affect } from "@parley/contracts";
import { lexicalAffect, fuseAffect, Thermometer, strategyFor } from "../src/affect.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };
const A = (o: Partial<Affect>): Affect => ({ emotion: "neutral", valence: 0, arousal: 0.3, confidence: 0.6, source: "fused", ...o });

console.log("\n§ lexical read");
{
  const neg = lexicalAffect("it's way too expensive and honestly I'm not interested");
  check("negative words → negative valence", neg.valence < 0, `v=${neg.valence.toFixed(2)}`);
  const buy = lexicalAffect("interesting — how much does it cost and when could you start?");
  check("buying words → curious/warming", buy.emotion === "curious" || buy.emotion === "warming", `emotion=${buy.emotion}`);
}

console.log("\n§ fusion — TONE overrides neutral words (hidden anger)");
{
  const fused = fuseAffect(lexicalAffect("fine."), A({ emotion: "angry", valence: -0.7, arousal: 0.85, confidence: 0.8, source: "acoustic", model: "dsp" }));
  check("neutral words + angry tone → angry", fused.emotion === "angry", `emotion=${fused.emotion}`);
  const withRes = fuseAffect(lexicalAffect("okay"), A({ source: "acoustic", resonance: 0.82, model: "dsp" }));
  check("fusion carries resonance through", withRes.resonance === 0.82, `resonance=${withRes.resonance}`);
}

console.log("\n§ thermometer");
{
  const up = new Thermometer().update({ affect: A({ emotion: "warming", valence: 0.5, confidence: 0.8 }), prospectWords: 16, buyingSignal: true });
  check("warming + engaged + buying → heats up", up.heat > 22 && up.trend === "up", `heat=${up.heat} trend=${up.trend}`);
  const down = new Thermometer().update({ affect: A({ emotion: "angry", valence: -0.7, arousal: 0.85, confidence: 0.8 }), prospectWords: 3, buyingSignal: false });
  check("angry + short answers → cools down", down.heat < 22 && down.trend === "down", `heat=${down.heat} trend=${down.trend}`);

  const t = new Thermometer();
  t.update({ affect: A({ resonance: 0.4 }), prospectWords: 8, buyingSignal: false });
  const res = t.update({ affect: A({ resonance: 0.72 }), prospectWords: 8, buyingSignal: false });
  check("rising Vocal Resonance registers as warming", res.drivers.some((d) => d.includes("rapport")), `drivers=[${res.drivers.join(", ")}]`);
}

console.log("\n§ strategy — reads emotion, heat AND trajectory");
{
  check("angry + steady → de-escalate (Voss)", strategyFor(A({ emotion: "angry", valence: -0.6, arousal: 0.8 }), 20, "steady").play === "de-escalate");
  check("angry + cooling → acknowledge (don't re-trigger)", strategyFor(A({ emotion: "angry", valence: -0.4, arousal: 0.6 }), 20, "cooling").play === "acknowledge");
  check("hot → close (Straight Line)", strategyFor(A({ emotion: "positive", valence: 0.6 }), 80).play === "close");
  check("warm → trial-close (Hormozi)", strategyFor(A({ emotion: "warming", valence: 0.4 }), 55).play === "trial-close");
  check("cold neutral → probe (NEPQ)", strategyFor(A({ emotion: "neutral" }), 30).play === "probe");
  check("warm + high resonance → close early", strategyFor(A({ emotion: "warming", valence: 0.4, resonance: 0.7 }), 63).play === "close");
}

console.log(`\n${fail ? "❌" : "✅"} copilot affect: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
