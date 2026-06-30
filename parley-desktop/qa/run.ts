// Parley — QA executable test suite (run: npx tsx qa/run.ts)
// Drives the REAL source: shared/modes.ts and server/copilot.ts (OpenAI is stubbed).
// No test framework — tiny assert harness so it runs with zero install beyond tsx.

import { MODES, getMode, buildObjectionIndex, mergeModes, type ProspectingMode } from "../shared/modes.js";
import { CopilotEngine } from "../server/copilot.js";
import { DEFAULT_SETTINGS, SETTINGS_VERSION, coerceSettings, sanitize } from "../shared/settings.js";
import type { ServerEvent, CopilotCard } from "../shared/types.js";

let pass = 0, fail = 0;
const fails: string[] = [];
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; fails.push(name + (detail ? ` — ${detail}` : "")); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}
function section(s: string) { console.log(`\n── ${s} ──`); }

// Helper: build an engine that records every emitted event.
function makeEngine(modeId: string) {
  const events: ServerEvent[] = [];
  const eng = new CopilotEngine(modeId, undefined, (e) => events.push(e));
  return { eng, events };
}
const cards = (events: ServerEvent[]) => events.filter((e): e is CopilotCard => e.type === "card");
const stages = (events: ServerEvent[]) => events.filter((e) => e.type === "stage") as any[];
const metrics = (events: ServerEvent[]) => events.filter((e) => e.type === "metrics") as any[];

// ============================================================
section("MODES — data integrity (real shared/modes.ts)");
// ============================================================
const VALID_STAGES = ["dialing","intro","discovery","value","objection","close","wrap"];
for (const m of MODES) {
  check(`mode '${m.id}' has name+systemPrompt`, !!m.name && m.systemPrompt.length > 20);
  check(`mode '${m.id}' has >=1 objection`, m.objections.length >= 1, `got ${m.objections.length}`);
  check(`mode '${m.id}' every rebuttal non-empty`, m.objections.every(o => o.rebuttal.trim().length > 0));
  check(`mode '${m.id}' every objection has triggers`, m.objections.every(o => o.triggers.length > 0));
  check(`mode '${m.id}' triggers are lowercase`, m.objections.every(o => o.triggers.every(t => t === t.toLowerCase())));
  check(`mode '${m.id}' scriptSkeleton stages valid`, m.scriptSkeleton.every(s => VALID_STAGES.includes(s.stage)), m.scriptSkeleton.map(s=>s.stage).join(","));
  check(`mode '${m.id}' has summaryTemplate`, m.summaryTemplate.length >= 1);
}
check("getMode('expired') resolves", getMode("expired").id === "expired");
check("getMode(unknown) falls back to MODES[0]", getMode("zzz").id === MODES[0].id);
// DNC must exist in every mode (compliance-critical)
check("every mode can match a DNC/'do not call' phrase",
  MODES.every(m => m.objections.some(o => o.triggers.some(t => "please take me off your list, do not call".includes(t)))));

// Trigger collision audit: a prospect line shouldn't match two different objections ambiguously.
section("MODES — trigger collision audit");
for (const m of MODES) {
  const seen = new Map<string,string>();
  let collision = "";
  for (const o of m.objections) for (const t of o.triggers) {
    if (seen.has(t) && seen.get(t) !== o.label) collision = `'${t}' in both '${seen.get(t)}' & '${o.label}'`;
    seen.set(t, o.label);
  }
  check(`mode '${m.id}' no duplicate trigger across objections`, !collision, collision);
}

// ============================================================
section("ENGINE — opener fires on construct");
// ============================================================
{
  const { events } = makeEngine("expired");
  const c = cards(events);
  check("opener card emitted immediately", c.length === 1 && c[0].kind === "script", JSON.stringify(c.map(x=>x.kind)));
  check("opener stage is intro", c[0]?.stage === "intro");
}

// ============================================================
section("ENGINE — objection detection + rebuttal");
// ============================================================
{
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("prospect", "who is this? how did you even get my number?", true);
  const obj = cards(events).filter(c => c.kind === "objection");
  check("objection card fires on prospect trigger", obj.length === 1, `got ${obj.length}`);
  check("objection rebuttal is non-empty + actionable", (obj[0]?.body?.length ?? 0) > 20);
  check("objection urgency is 'now'", obj[0]?.urgency === "now");
  check("stage switched to 'objection'", stages(events).some(s => s.stage === "objection"));
}
{
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("prospect", "please take me off your list", true);
  const obj = cards(events).filter(c => c.kind === "objection" && c.title.includes("DNC"));
  check("DNC request detected → DNC rebuttal", obj.length === 1);
}
{
  // dedupe: same objection twice should only fire once
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("prospect", "i'm not interested", true);
  eng.onUtterance("prospect", "seriously, not interested", true);
  const obj = cards(events).filter(c => c.title.includes("Not interested"));
  check("objection fires only once per call (dedupe)", obj.length === 1, `got ${obj.length}`);
}
{
  // negative: benign prospect speech should NOT trigger an objection
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("prospect", "yes that sounds reasonable, tell me more", true);
  check("no false-positive objection on benign speech", cards(events).filter(c=>c.kind==="objection").length === 0);
}

// ============================================================
section("ENGINE — stage machine");
// ============================================================
{
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("rep", "what do you think kept it from selling?", true);
  check("rep question in intro advances to discovery", stages(events).some(s => s.stage === "discovery"));
}
{
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("rep", "can we meet tomorrow at 5, does that time work?", true);
  check("appointment language advances to close", stages(events).some(s => s.stage === "close"));
}

// ============================================================
section("ENGINE — coaching (talk ratio)");
// ============================================================
{
  const { eng, events } = makeEngine("expired");
  // rep dominates heavily
  eng.onUtterance("rep", "so let me tell you all about my marketing plan and pricing strategy and the photos and the staging and everything we do differently here", true);
  eng.onUtterance("prospect", "ok", true);
  const coach = cards(events).filter(c => c.kind === "coach");
  check("coach warns when rep monologues (>70% talk)", coach.length >= 1);
  check("a metrics event was emitted", metrics(events).length >= 1);
}

// ============================================================
section("BUG PROBES — should expose known defects");
// ============================================================
{
  // BUG B1: word counting happens on interim results too (before isFinal check) → double counts.
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("rep", "hi there", true);                       // rep: 2 words
  eng.onUtterance("prospect", "i am not interested", false);      // INTERIM — should NOT count
  eng.onUtterance("prospect", "i am not interested", true);       // FINAL  — counts (4)
  const m = metrics(events).at(-1);
  const correct = 2 / (2 + 4);   // 0.333 if interim ignored
  const buggy = 2 / (2 + 8);     // 0.20 if interim double-counted
  const r = m?.talkRatioRep ?? -1;
  check("B1: interim transcripts must NOT inflate word count", Math.abs(r - correct) < 0.02,
    `talkRatioRep=${r.toFixed(3)} (correct≈${correct.toFixed(3)}, buggy≈${buggy.toFixed(3)})`);
}
{
  // BUG B2: triggers are rigid substrings; natural paraphrase misses.
  const { eng, events } = makeEngine("expired");
  eng.onUtterance("prospect", "every agent says the exact same thing", true); // paraphrase of "all agents say the same"
  check("B2: paraphrased 'all agents same' objection is detected", cards(events).some(c=>c.kind==="objection"),
    "rigid substring triggers miss natural paraphrases");
}

// ============================================================
section("MODES v2 — expanded catalog + registry");
// ============================================================
{
  const ids = MODES.map(m => m.id);
  for (const id of ["expired","fsbo","circle","buyer","investor","sphere","sdr","discovery","reactivation"])
    check(`catalog includes '${id}'`, ids.includes(id));
  check("every mode has category real-estate|sales", MODES.every(m => ["real-estate","sales"].includes(m.category)));
  check("every mode marked builtIn + versioned", MODES.every(m => m.builtIn === true && m.version >= 1));
  check("no duplicate mode ids", new Set(ids).size === ids.length);
}

// ============================================================
section("MODES v2 — precompiled objection index");
// ============================================================
{
  const idx = buildObjectionIndex(getMode("expired"));
  check("index matches a known trigger", idx.match("honestly i'm not interested")?.label === "Not interested");
  check("index returns null on benign text", idx.match("sounds great, tell me more") === null);
  // longest-trigger-first: 'do not call' (DNC) should win over shorter overlaps
  check("index prefers most-specific (longest) trigger", !!idx.match("please do not call me again"));
}

// ============================================================
section("MODES v2 — custom mode merge");
// ============================================================
{
  const custom: ProspectingMode = { ...getMode("sdr"), id: "my-custom", name: "My Mode", builtIn: true /* should be forced false */ };
  const merged = mergeModes([custom]);
  check("merged registry contains built-ins + custom", merged.has("expired") && merged.has("my-custom"));
  check("merge forces builtIn:false on custom modes", merged.get("my-custom")?.builtIn === false);
  const override: ProspectingMode = { ...getMode("expired"), name: "Overridden" };
  check("custom can override a built-in by id", mergeModes([override]).get("expired")?.name === "Overridden");
}

// ============================================================
section("SETTINGS — coerce / migrate / sanitize");
// ============================================================
{
  const fresh = coerceSettings(null);
  check("coerce(null) returns full defaults", fresh.version === SETTINGS_VERSION && fresh.copilot.activeModeId === "expired");
  // partial/old file should self-heal missing keys from defaults
  const partial = coerceSettings({ version: 0, general: { theme: "light" } });
  check("partial file keeps provided value", partial.general.theme === "light");
  check("partial file backfills missing keys", partial.audio.captureSystemAudio === DEFAULT_SETTINGS.audio.captureSystemAudio);
  check("migrate stamps current version", partial.version === SETTINGS_VERSION);
  // tampered out-of-range values get clamped
  const tampered = sanitize(coerceSettings({ general: { overlayOpacity: 9 }, copilot: { talkRatioWarnAt: 5, suggestionThrottleMs: 999999 } }));
  check("sanitize clamps overlayOpacity to <=1", tampered.general.overlayOpacity === 1);
  check("sanitize clamps talkRatioWarnAt to <=0.95", tampered.copilot.talkRatioWarnAt === 0.95);
  check("sanitize clamps throttle to <=30000", tampered.copilot.suggestionThrottleMs === 30000);
  check("compliance defaults are conservative (DNC scrub on)", fresh.compliance.enforceDncScrub === true);
}

// ============================================================
console.log(`\n══════════════════════════════════════`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fails.length) { console.log(`\nFailures:`); fails.forEach(f => console.log(`  • ${f}`)); }
console.log(`══════════════════════════════════════`);
process.exit(fail > 0 ? 1 : 0);
