// Proves the Play-Caller — the directive layer that TIMES THE ASK. It throws a green light the moment
// the close window opens, a hold when the rep reaches too early, and course-corrects discovery / pain /
// next-step. Run: npx tsx qa/objectives.test.ts
import { nextBestAction, objectives, completion, type CallSignals } from "../src/objectives.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };
const S = (o: Partial<CallSignals>): CallSignals => ({
  elapsedMs: 120000, stage: "discovery", repQuestions: 2, prospectTurns: 4, painSurfaced: true, valueTied: true,
  nextStepAsked: false, heat: 40, buyingSignal: false, resonance: 0.4, repClosingNow: false, ...o,
});

console.log("\n§ the money move — timing the ask");
{
  const green = nextBestAction(S({ heat: 66, repQuestions: 3, nextStepAsked: false }));
  check("warm + discovered + no ask → GREEN LIGHT to close", green?.kind === "close", green?.action);
  const bySig = nextBestAction(S({ heat: 57, buyingSignal: true, repQuestions: 2 }));
  check("a buying signal opens the window a touch earlier", bySig?.kind === "close");
  const byRes = nextBestAction(S({ heat: 57, resonance: 0.7, repQuestions: 2 }));
  check("high vocal resonance also opens it", byRes?.kind === "close");
  const cool = nextBestAction(S({ heat: 45, repQuestions: 3, buyingSignal: false, resonance: 0.4 }));
  check("cool lead → NOT yet (no false green light)", cool?.kind !== "close", cool?.kind ?? "null");
  const asked = nextBestAction(S({ heat: 70, nextStepAsked: true }));
  check("already asked → no repeat close nag", asked?.kind !== "close", asked?.kind ?? "null");
}

console.log("\n§ the hold — don't ask too early");
{
  const hold = nextBestAction(S({ repClosingNow: true, heat: 35, painSurfaced: false, valueTied: false, repQuestions: 1 }));
  check("rep reaching to close cold, no pain → HOLD", hold?.kind === "hold", hold?.action);
  const okClose = nextBestAction(S({ repClosingNow: true, heat: 66, painSurfaced: true, repQuestions: 3 }));
  check("closing when warm + pain is fine (green light, not hold)", okClose?.kind === "close");
}

console.log("\n§ course corrections");
{
  const disc = nextBestAction(S({ repQuestions: 0, prospectTurns: 3, elapsedMs: 60000, painSurfaced: false, valueTied: false, heat: 35 }));
  check("talking, no questions → ask your first question", disc?.kind === "discover", disc?.action);
  const quant = nextBestAction(S({ painSurfaced: true, valueTied: false, repQuestions: 1, heat: 40, prospectTurns: 3 }));
  check("pain named but not sized → quantify it", quant?.kind === "quantify", quant?.action);
  const overdue = nextBestAction(S({ nextStepAsked: false, elapsedMs: 300000, heat: 50, repQuestions: 3, painSurfaced: true, valueTied: true }));
  check("long warm call, no ask → lock the next step", overdue?.kind === "close" || overdue?.kind === "advance", overdue?.kind);
  const onTrack = nextBestAction(S({ repQuestions: 2, painSurfaced: true, valueTied: true, nextStepAsked: true, heat: 50, elapsedMs: 90000 }));
  check("on track, nothing overdue → stay quiet (null)", onTrack === null);
}

console.log("\n§ objective tracking + completion");
{
  const early = S({ stage: "intro", prospectTurns: 1, repQuestions: 0, painSurfaced: false, valueTied: false, nextStepAsked: false });
  check("early call → low completion", completion(early) <= 20, `${completion(early)}%`);
  const won = S({ stage: "close", repQuestions: 3, painSurfaced: true, valueTied: true, nextStepAsked: true });
  check("all objectives hit → 100%", completion(won) === 100);
  check("objectives list is the 5 winnable steps", objectives(early).map((o) => o.id).join(",") === "permission,discovery,pain,value,next-step");
}

console.log(`\n${fail ? "❌" : "✅"} objectives: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
