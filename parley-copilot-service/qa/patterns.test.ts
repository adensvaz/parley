// Proves the "make it memorable" layer: it detects soft stalls, fires wit ONLY when it helps (not on
// anger, not on a hot buyer, once per call), tunes to culture (pizza bit in the US, respectful callback
// in Japan), picks the right technique, and captures the memory-hook + timeframe for the follow-up.
// Run: npx tsx qa/patterns.test.ts
import type { Affect } from "@parley/contracts";
import { getCulture } from "../src/culture.js";
import { detectStall, extractTimeframe, playfulness, shouldInterrupt, pickTechnique, captureHook, TECHNIQUES } from "../src/patterns.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };
const A = (o: Partial<Affect>): Affect => ({ emotion: "neutral", valence: 0, arousal: 0.3, confidence: 0.6, source: "fused", ...o });
const ctx = (o: any) => ({ stall: null, affect: A({}), heat: 30, culture: getCulture("en-US"), used: 0, prospectWords: 8, ...o });

console.log("\n§ stall detection (soft blow-offs, not opt-outs)");
{
  check("‘call me back in 3 weeks’ → callback + timeframe", (() => { const s = detectStall("yeah just call me back in 3 weeks"); return s?.kind === "callback" && s?.timeframe === "3 weeks"; })());
  check("‘just send me an email’ → send-email", detectStall("can you just send me an email")?.kind === "send-email");
  check("‘not interested’ → not-interested", detectStall("honestly not interested")?.kind === "not-interested");
  check("‘just looking’ → just-looking", detectStall("we're just looking for now")?.kind === "just-looking");
  check("DNC is NOT a stall (never clown an opt-out)", detectStall("take me off your list") === null);
  check("timeframe parse: ‘next month’", extractTimeframe("try me next month") === "next month");
}

console.log("\n§ cultural playfulness (pizza lands in Miami, not Tokyo)");
{
  const es = playfulness(getCulture("es-419")), us = playfulness(getCulture("en-US")), jp = playfulness(getCulture("ja-JP"));
  check("LatAm > US > Japan on playfulness", es > us && us > jp, `es=${es.toFixed(2)} us=${us.toFixed(2)} jp=${jp.toFixed(2)}`);
  check("Japan below the memory-hook bar (0.5)", jp < 0.5, `jp=${jp.toFixed(2)}`);
}

console.log("\n§ selectivity — when needed, NOT always");
{
  check("soft stall + calm + cool → fire", shouldInterrupt(ctx({ stall: { kind: "callback" }, heat: 30 })));
  check("angry prospect → NEVER", shouldInterrupt(ctx({ stall: { kind: "callback" }, affect: A({ emotion: "angry", valence: -0.7, arousal: 0.85 }) })) === false);
  check("frustrated (hot+negative) → NEVER", shouldInterrupt(ctx({ stall: { kind: "not-interested" }, affect: A({ valence: -0.4, arousal: 0.7 }) })) === false);
  check("already used this call → NO (budget = 1)", shouldInterrupt(ctx({ stall: { kind: "callback" }, used: 1 })) === false);
  check("hot, ready buyer → NO (wants the close, not a bit)", shouldInterrupt(ctx({ stall: { kind: "callback" }, heat: 78 })) === false);
  check("silent disengagement (short + cooling) → fire even without a keyword", shouldInterrupt(ctx({ stall: null, prospectWords: 2, heat: 30 })));
  check("engaged, no stall → NO", shouldInterrupt(ctx({ stall: null, prospectWords: 16, heat: 45 })) === false);
}

console.log("\n§ technique selection — right move, culturally safe");
{
  const usCall = pickTechnique(ctx({ stall: { kind: "callback", timeframe: "3 weeks" }, culture: getCulture("en-US") }));
  check("US callback → Memory Hook", usCall.id === "memory-hook", usCall.name);
  const jpCall = pickTechnique(ctx({ stall: { kind: "callback", timeframe: "3 weeks" }, culture: getCulture("ja-JP") }));
  check("Japan callback → Named Callback (respectful, not a bit)", jpCall.id === "named-callback", jpCall.name);
  check("US ‘not interested’ → Disarming Candor (calm, not a joke)", pickTechnique(ctx({ stall: { kind: "not-interested" }, culture: getCulture("en-US") })).id === "disarming-candor");
  check("Japan ‘not interested’ → Straight Talk (gentle fallback)", pickTechnique(ctx({ stall: { kind: "not-interested" }, culture: getCulture("ja-JP") })).id === "honest-transparency");
}

console.log("\n§ the memory-hook mechanic");
{
  const t = TECHNIQUES["memory-hook"].build(ctx({ stall: { kind: "callback", timeframe: "3 weeks" } }));
  check("hook line invites a real personal detail (not a gag)", /ask you about|call back|another name in your phone/i.test(t.line) && !/pizza|joke/i.test(t.line));
  check("follow cue anchors the callback to their answer + timeframe", /3 weeks/.test(t.followCue) && /remember/i.test(t.followCue));
  check("capture ‘margarita’ from a short answer", captureHook("margarita") === "margarita");
  check("capture strips filler: ‘uh probably margarita’", captureHook("uh probably margarita")?.includes("margarita") === true);
  check("no false hook on a long unrelated sentence", captureHook("well I mean I already told you three times we are not looking to sell the house right now") === undefined);
}

console.log("\n§ tone guard — elite & human, never comedic/cheesy");
{
  const BANNED = /pizza|haha|lol|buzz off|go back to ignoring|worst \d+ seconds|just kidding|😄|😂|knock knock/i;
  const lines = Object.values(TECHNIQUES).flatMap((tech) => { const b = tech.build(ctx({ stall: { kind: "callback", timeframe: "3 weeks" } })); return [b.line, b.followCue]; });
  check("no technique line reads as a gag/gimmick", lines.every((l) => !BANNED.test(l)), lines.filter((l) => BANNED.test(l)).join(" | ") || "clean");
  check("lines carry composure cues (respect / straight / fair / real)", lines.filter((l) => /respect|straight|fair|real|understood|genuinely|honest/i.test(l)).length >= 4);
}

console.log(`\n${fail ? "❌" : "✅"} patterns: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
