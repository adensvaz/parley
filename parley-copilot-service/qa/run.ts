// Engine + modes unit tests for the relocated copilot engine (OpenAI is lazy-init, no key needed).
import { MODES, getMode, buildObjectionIndex, mergeModes, type ProspectingMode } from "../src/modes.js";
import { CopilotEngine } from "../src/engine.js";
import type { ServerEvent, CopilotCard } from "../src/types.js";

let pass = 0, fail = 0; const fails: string[] = [];
const check = (n: string, c: boolean, d = "") => c ? (pass++, console.log(`  ✅ ${n}`)) : (fail++, fails.push(n + (d ? ` — ${d}` : "")), console.log(`  ❌ ${n}${d ? ` — ${d}` : ""}`));
const section = (s: string) => console.log(`\n── ${s} ──`);
const cards = (e: ServerEvent[]) => e.filter((x): x is CopilotCard => x.type === "card");
const stages = (e: ServerEvent[]) => e.filter((x) => x.type === "stage") as any[];
const metrics = (e: ServerEvent[]) => e.filter((x) => x.type === "metrics") as any[];
function engine(modeId: string) { const events: ServerEvent[] = []; const eng = new CopilotEngine(modeId, undefined, (e) => events.push(e)); return { eng, events }; }

section("MODES catalog + registry");
for (const id of ["expired","fsbo","circle","buyer","investor","sphere","sdr","discovery","reactivation"]) check(`includes '${id}'`, MODES.some(m => m.id === id));
check("no duplicate ids", new Set(MODES.map(m=>m.id)).size === MODES.length);
check("every mode versioned + builtIn", MODES.every(m => m.version >= 1 && m.builtIn));
check("every rebuttal non-empty", MODES.every(m => m.objections.every(o => o.rebuttal.trim() && o.triggers.length)));
check("getMode fallback", getMode("zzz").id === MODES[0].id);
check("DNC reachable in every mode", MODES.every(m => m.objections.some(o => o.triggers.some(t => "please take me off your list, do not call".includes(t)))));

section("objection index");
{ const idx = buildObjectionIndex(getMode("expired"));
  check("matches trigger", idx.match("honestly i'm not interested")?.label === "Not interested");
  check("null on benign", idx.match("sounds great tell me more") === null);
  check("most-specific wins", !!idx.match("please do not call me again")); }

section("custom mode merge");
{ const c: ProspectingMode = { ...getMode("sdr"), id: "x", name: "X", builtIn: true };
  const merged = mergeModes([c]);
  check("contains built-ins + custom", merged.has("expired") && merged.has("x"));
  check("forces builtIn:false", merged.get("x")?.builtIn === false);
  check("custom overrides by id", mergeModes([{ ...getMode("expired"), name: "Z" }]).get("expired")?.name === "Z"); }

section("engine behavior");
{ const { events } = engine("expired"); check("opener fires on construct", cards(events).length === 1 && cards(events)[0].kind === "script"); }
{ const { eng, events } = engine("expired"); eng.onUtterance("prospect","who is this? how did you even get my number?",true);
  check("objection card fires", cards(events).some(c=>c.kind==="objection"));
  check("urgency now", cards(events).find(c=>c.kind==="objection")?.urgency==="now");
  check("stage -> objection", stages(events).some(s=>s.stage==="objection")); }
{ const { eng, events } = engine("expired"); eng.onUtterance("prospect","please take me off your list",true);
  check("DNC detected", cards(events).some(c=>c.title.includes("DNC"))); }
{ const { eng, events } = engine("expired"); eng.onUtterance("prospect","i'm not interested",true); eng.onUtterance("prospect","seriously not interested",true);
  check("objection dedupe (once/call)", cards(events).filter(c=>c.title.includes("Not interested")).length === 1); }
{ const { eng, events } = engine("expired"); eng.onUtterance("prospect","yes that sounds reasonable",true);
  check("no false-positive on benign", cards(events).filter(c=>c.kind==="objection").length === 0); }
{ const { eng, events } = engine("expired"); eng.onUtterance("rep","what do you think kept it from selling?",true);
  check("intro->discovery on question", stages(events).some(s=>s.stage==="discovery")); }

section("coaching + B1 (interim must not inflate)");
{ const { eng, events } = engine("expired");
  eng.onUtterance("rep","hi there",true); eng.onUtterance("prospect","i am not interested",false); eng.onUtterance("prospect","i am not interested",true);
  const r = metrics(events).at(-1)?.talkRatioRep ?? -1;
  check("B1: interim ignored (talkRatio≈0.333)", Math.abs(r - 2/6) < 0.02, `got ${r.toFixed(3)}`); }

console.log(`\n══ RESULT: ${pass} passed, ${fail} failed ══`);
if (fails.length) fails.forEach(f => console.log("  • " + f));
process.exit(fail ? 1 : 0);
