// Proves cultural brain-matching: locale resolution, affect RECALIBRATION to a culture's expressive
// baseline (so we match their vibe), and strategy re-voicing to the right closer per culture.
// Run: npx tsx qa/culture.test.ts
import type { Affect } from "@parley/contracts";
import type { Strategy } from "../src/affect.js";
import { getCulture, calibrateAffect, culturalize } from "../src/culture.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };
const A = (o: Partial<Affect>): Affect => ({ emotion: "neutral", valence: 0, arousal: 0.3, confidence: 0.6, source: "fused", ...o });

console.log("\n§ locale resolution");
{
  check("india → en-IN", getCulture("india").id === "en-IN");
  check("china → zh-CN", getCulture("chinese").id === "zh-CN");
  check("russia → ru-RU", getCulture("ru").id === "ru-RU");
  check("unknown → en-US default", getCulture("xx").id === "en-US" && getCulture(undefined).id === "en-US");
}

console.log("\n§ affect recalibration — match the vibe, not a US default");
{
  // Chinese: reserved/flat tone should NOT read as disengaged.
  const raw = A({ emotion: "hesitant", valence: -0.08, arousal: 0.28 });
  const cn = calibrateAffect(raw, getCulture("zh-CN"));
  check("reserved tone in zh-CN not read as hesitant", cn.emotion !== "hesitant", `emotion=${cn.emotion}, v=${cn.valence.toFixed(2)}`);

  // Russian: bluntness shouldn't be over-read as negative.
  const blunt = A({ emotion: "frustrated", valence: -0.25, arousal: 0.5 });
  const ru = calibrateAffect(blunt, getCulture("ru-RU"));
  check("bluntness in ru-RU softened, not hostile", ru.valence > blunt.valence && ru.emotion !== "angry", `v ${blunt.valence.toFixed(2)}→${ru.valence.toFixed(2)}, emotion=${ru.emotion}`);

  // But a genuinely hot, angry tone is still caught everywhere.
  const angry = A({ emotion: "angry", valence: -0.75, arousal: 0.86 });
  check("real anger preserved after calibration", calibrateAffect(angry, getCulture("ru-RU")).emotion === "angry");
  check("calibration is tagged with the culture", cn.model?.includes("cx:zh-CN") === true, `model=${cn.model}`);
}

console.log("\n§ strategy re-voicing — the right closer per culture");
{
  const base: Strategy = { play: "close", master: "Straight Line", directive: "Go for the ask." };
  const cn = culturalize(base, getCulture("zh-CN"), A({ resonance: 0.3 }));
  check("indirect culture softens hard close → trial-close", cn.play === "trial-close", `play=${cn.play}`);
  check("zh-CN closer is question/empathy-led (Hormozi/Voss/Miner)", ["Alex Hormozi", "Chris Voss", "Jeremy Miner"].includes(cn.master), `master=${cn.master}`);
  check("directive carries the cultural style (face-saving)", /face-saving/i.test(cn.directive));

  const ru = culturalize(base, getCulture("ru-RU"), A({ resonance: 0.4 }));
  check("direct culture keeps the close", ru.play === "close", `play=${ru.play}`);
  check("ru-RU closer is direct/proof-led (Belfort/Cardone)", ["Jordan Belfort", "Grant Cardone"].includes(ru.master), `master=${ru.master}`);
  check("directive carries the cultural style (proof/specifics)", /proof|specifics/i.test(ru.directive));

  const inx = culturalize({ play: "probe", master: "NEPQ", directive: "Ask a question." }, getCulture("en-IN"), A({}));
  check("en-IN is warm/relationship-first in the directive", /warm|respect|relationship/i.test(inx.directive), inx.master);
}

console.log(`\n${fail ? "❌" : "✅"} culture: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
