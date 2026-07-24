// Post-call report builder. Pure function: transcript + call outcome in → a rep-facing scorecard out.
// Deterministic heuristics for now (v1); the same shape is what an LLM grader will fill later, so
// callers and the /report view never change when the engine gets smarter.
import type { Scorecard, StageGrade, ReportMoment, CallStage, VoiceBehaviour } from "@parley/contracts";

type Seg = { speaker: string; content: string; ts: string };
export interface ScoreInput {
  callId: string;
  repId: string;
  transcript: Seg[];
  talkRatioRep: number;
  appointmentSet: boolean;
  objectionsHandled: number;
  startedAtMs: number;
  behaviour?: VoiceBehaviour;   // premium — Voice Behaviour Analysis, folded in if the plan includes it
}

// The one-fix library — keyed by the weakest stage, phrased in the master playbook's voice
// (mirrors the copilot brain: Hormozi / Voss / NEPQ). Kept here so the report and the live
// coaching speak the same language.
const FIX: Record<CallStage, { title: string; detail: string; playbook: string }> = {
  opener: { title: "Earn the first 30 seconds", detail: "Lead permission-based and specific — name the interruption, then ask to continue. Don't open with the pitch.", playbook: "permission opener" },
  discovery: { title: "Ask one more real question", detail: "Weak discovery kills more deals than weak closing. Ask a sharp question about the pain and let the silence work.", playbook: "NEPQ" },
  objection: { title: "Reframe price into value", detail: "On “too expensive,” don't defend the price — isolate value vs. cost first, then stack the return until the number feels small.", playbook: "Hormozi value-stack" },
  close: { title: "Go for the specific ask", detail: "Assume the meeting and offer two concrete times. A vague next step is a lost deal — confirm it out loud.", playbook: "assumptive close" },
};

const q = (s: string) => s.includes("?");
const hasAny = (s: string, w: string[]) => w.some((x) => s.toLowerCase().includes(x));

export function buildScorecard(inp: ScoreInput): Scorecard {
  const rep = inp.transcript.filter((s) => s.speaker === "rep");
  const pros = inp.transcript.filter((s) => s.speaker === "prospect");
  const repText = rep.map((s) => s.content).join(" ").toLowerCase();
  const repQuestions = rep.filter((s) => q(s.content)).length;
  const firstRep = rep.slice(0, 2).map((s) => s.content).join(" ").toLowerCase();

  // ── per-stage grades ───────────────────────────────────────────────────────────
  const opener: StageGrade["status"] =
    hasAny(firstRep, ["quick", "reason i", "reason i'm", "interrupt", "worth", "can i", "permission"]) ? "strong"
      : rep.length ? "ok" : "missed";

  const discovery: StageGrade["status"] =
    repQuestions >= 3 ? "strong" : repQuestions >= 1 ? "ok" : "weak";

  const objectionRaised = pros.some((s) => hasAny(s.content, ["expensive", "cost", "price", "think about", "spouse", "wife", "husband", "not interested", "already use"]));
  const objection: StageGrade["status"] =
    !objectionRaised ? "ok" : inp.objectionsHandled > 0 ? "strong" : "weak";

  const close: StageGrade["status"] = inp.appointmentSet ? "strong"
    : hasAny(repText, ["tuesday", "thursday", "book", "calendar", "schedule", "next step"]) ? "ok" : "weak";

  const stages: StageGrade[] = [
    { stage: "opener", status: opener, note: opener === "strong" ? "permission-based open" : opener === "missed" ? "no opener captured" : `${rep.length} rep turns` },
    { stage: "discovery", status: discovery, note: `${repQuestions} question${repQuestions === 1 ? "" : "s"}` },
    { stage: "objection", status: objection, note: !objectionRaised ? "none raised" : inp.objectionsHandled > 0 ? `${inp.objectionsHandled} handled` : "dropped" },
    { stage: "close", status: close, note: inp.appointmentSet ? "booked" : "no next step set" },
  ];

  // ── overall 0–100 (weighted; appointment is king, but a good process still scores) ──
  const w = { strong: 1, ok: 0.6, weak: 0.25, missed: 0 } as const;
  const stageAvg = stages.reduce((a, s) => a + w[s.status], 0) / stages.length; // 0..1
  const talkBonus = inp.talkRatioRep >= 0.4 && inp.talkRatioRep <= 0.6 ? 10 : 0;
  const score = Math.max(0, Math.min(100, Math.round(stageAvg * 75 + (inp.appointmentSet ? 15 : 0) + talkBonus)));

  // ── the ONE fix: the weakest stage, ranked by impact (objection > close > discovery > opener) ──
  const rank: CallStage[] = ["objection", "close", "discovery", "opener"];
  const weakest = rank.find((st) => { const g = stages.find((s) => s.stage === st)!; return g.status === "weak" || g.status === "missed"; })
    ?? rank.find((st) => stages.find((s) => s.stage === st)!.status === "ok")
    ?? "discovery";
  const fix = FIX[weakest];

  // ── transcript-anchored moments (self-coaching: "here's exactly where it happened") ──
  const t0 = inp.startedAtMs;
  const moments: ReportMoment[] = [];
  const firstObjection = pros.find((s) => hasAny(s.content, ["expensive", "cost", "price", "think about", "spouse", "not interested", "already use"]));
  if (firstObjection) moments.push({ atMs: Math.max(0, Date.parse(firstObjection.ts) - t0), speaker: "prospect", quote: firstObjection.content.slice(0, 160), tag: "objection" });
  const closeTurn = [...rep].reverse().find((s) => hasAny(s.content, ["book", "schedule", "tuesday", "thursday", "calendar", "next step"]));
  if (closeTurn) moments.push({ atMs: Math.max(0, Date.parse(closeTurn.ts) - t0), speaker: "rep", quote: closeTurn.content.slice(0, 160), tag: "close" });

  return {
    callId: inp.callId, repId: inp.repId, score, stages, fix, moments,
    talkRatioRep: inp.talkRatioRep, objectionsHandled: inp.objectionsHandled, appointmentSet: inp.appointmentSet,
    ...(inp.behaviour ? { behaviour: inp.behaviour } : {}),
  };
}
