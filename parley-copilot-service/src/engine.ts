// The copilot engine — the brain of Parley.
// Runs three loops off the live transcript:
//   1. Fast deterministic objection match  -> instant rebuttal card (<150ms, no LLM)
//   2. Call-stage tracking                 -> script-guide card per stage
//   3. LLM advisor                          -> tailored answer cards + coach cues
// Plus metrics (talk ratio, pace, sentiment) and a post-call summary.

import OpenAI from "openai";
import type {
  ServerEvent, CallStage, Speaker, LeadContext, CopilotCard,
} from "./types.js";
import { getMode, type ProspectingMode } from "./modes.js";

// Lazy-init: importing this module must NOT require an API key (keeps it testable and
// prevents a missing key from crashing the whole process at load).
let _openai: OpenAI | null = null;
const llm = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
const MODEL = process.env.COPILOT_MODEL ?? "gpt-4o-mini";

let cardSeq = 0;
const card = (c: Omit<CopilotCard, "type" | "id">): CopilotCard =>
  ({ type: "card", id: `c${++cardSeq}`, ...c });

export class CopilotEngine {
  private mode: ProspectingMode;
  private transcript: { speaker: Speaker; text: string }[] = [];
  private stage: CallStage = "intro";
  private repWords = 0;
  private prospectWords = 0;
  private firedObjections = new Set<string>();
  private lastLlmAt = 0;

  constructor(
    modeId: string,
    private lead: LeadContext | undefined,
    private emit: (ev: ServerEvent) => void,
  ) {
    this.mode = getMode(modeId);
    // Kick off with the opener cue for this mode.
    const opener = this.mode.scriptSkeleton[0];
    if (opener) this.emit(card({ kind: "script", title: "Opener", body: opener.cue, urgency: "now", stage: "intro" }));
  }

  onUtterance(speaker: Speaker, text: string, isFinal: boolean) {
    if (!text.trim()) return;

    if (isFinal) {
      // FIX (QA B1): count words ONLY on final results — interim partials repeat the
      // growing text and would otherwise inflate the talk-ratio / coaching metrics.
      if (speaker === "rep") this.repWords += words(text);
      else this.prospectWords += words(text);

      this.transcript.push({ speaker, text });
      // 1. Deterministic objection match on the PROSPECT's final utterances.
      if (speaker === "prospect") this.matchObjection(text);
      // 2. Stage progression heuristic.
      this.advanceStage(text, speaker);
      // 3. Metrics every final utterance.
      this.emitMetrics();
      // 4. LLM advisor, throttled, when the prospect just spoke.
      if (speaker === "prospect") this.maybeAdvise();
    }
  }

  private matchObjection(text: string) {
    const t = text.toLowerCase();
    for (const o of this.mode.objections) {
      if (this.firedObjections.has(o.label)) continue;
      if (o.triggers.some((trig) => t.includes(trig))) {
        this.firedObjections.add(o.label);
        this.emit(card({
          kind: "objection",
          title: `Objection: ${o.label}`,
          body: o.rebuttal,
          urgency: "now",
          stage: "objection",
        }));
        this.setStage("objection");
        return;
      }
    }
  }

  private advanceStage(text: string, speaker: Speaker) {
    const order: CallStage[] = ["intro", "discovery", "value", "objection", "close", "wrap"];
    const t = text.toLowerCase();
    // Light heuristics; the LLM can also nudge stage via maybeAdvise.
    if (speaker === "rep" && /(\?|tell me|what|why|how|when)/.test(t) && this.stage === "intro")
      this.setStage("discovery");
    if (/(price|net|commission|marketing|plan|valuation|because)/.test(t) && order.indexOf(this.stage) < 2)
      this.setStage("value");
    if (/(meet|appointment|tomorrow|stop by|calendar|time work|15 minutes)/.test(t))
      this.setStage("close");
  }

  private setStage(stage: CallStage) {
    if (stage === this.stage) return;
    this.stage = stage;
    this.emit({ type: "stage", stage });
    const cue = this.mode.scriptSkeleton.find((s) => s.stage === stage);
    if (cue) this.emit(card({ kind: "script", title: cap(stage), body: cue.cue, urgency: "soon", stage }));
  }

  private emitMetrics() {
    const total = this.repWords + this.prospectWords || 1;
    const talkRatioRep = this.repWords / total;
    let sentiment: "positive" | "neutral" | "cooling" | "hostile" = "neutral";
    if (talkRatioRep > 0.7) sentiment = "cooling"; // rep monologuing
    this.emit({
      type: "metrics",
      talkRatioRep,
      wordsPerMin: 0, // wired to a rolling window in production
      sentiment,
      longestMonologueSec: 0,
    });
    if (talkRatioRep > 0.7)
      this.emit(card({ kind: "coach", title: "You're talking too much", body: "Ask a question and let them talk.", urgency: "now" }));
  }

  private async maybeAdvise() {
    const now = Date.now();
    if (now - this.lastLlmAt < 4000) return; // throttle
    this.lastLlmAt = now;

    const recent = this.transcript.slice(-8).map((u) => `${u.speaker}: ${u.text}`).join("\n");
    const leadStr = this.lead ? `Lead: ${JSON.stringify(this.lead)}` : "";
    try {
      const stream = await llm().chat.completions.create({
        model: MODEL,
        stream: true,
        max_tokens: 90,
        messages: [
          { role: "system", content: `${this.mode.systemPrompt}\nCurrent stage: ${this.stage}. ${leadStr}\nGive ONE short, natural line the rep should say next. No preamble.` },
          { role: "user", content: recent },
        ],
      });
      let body = "";
      for await (const chunk of stream) body += chunk.choices[0]?.delta?.content ?? "";
      if (body.trim())
        this.emit(card({ kind: "answer", title: "Say this", body: body.trim(), urgency: "soon", stage: this.stage }));
    } catch (e) {
      // fail silent — never block the call on the LLM
    }
  }

  async manualAsk(text: string) {
    const recent = this.transcript.slice(-10).map((u) => `${u.speaker}: ${u.text}`).join("\n");
    const stream = await llm().chat.completions.create({
      model: MODEL,
      stream: true,
      max_tokens: 160,
      messages: [
        { role: "system", content: `${this.mode.systemPrompt}\nThe rep asked you a question mid-call. Answer concisely and actionably.` },
        { role: "user", content: `Call so far:\n${recent}\n\nRep asks: ${text}` },
      ],
    });
    let body = "";
    for await (const chunk of stream) body += chunk.choices[0]?.delta?.content ?? "";
    this.emit(card({ kind: "answer", title: "Answer", body: body.trim(), urgency: "now", stage: this.stage }));
  }

  async finish() {
    const full = this.transcript.map((u) => `${u.speaker}: ${u.text}`).join("\n");
    if (!full) return;
    try {
      const res = await llm().chat.completions.create({
        model: MODEL,
        max_tokens: 320,
        messages: [
          { role: "system", content: `Summarize this cold call for a CRM. Fields: ${this.mode.summaryTemplate.join(", ")}. Then give a disposition, a next step, and a short follow-up ${"SMS"} draft. Return JSON: {summary, disposition, nextStep, followUpDraft:{channel, body}}.` },
          { role: "user", content: full },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
      this.emit({ type: "postcall", ...parsed });
    } catch {
      /* ignore */
    }
  }
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
