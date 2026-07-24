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
import type { Affect } from "@parley/contracts";
import { getMode, type ProspectingMode, type ObjectionRebuttal } from "./modes.js";
import { RebuttalBandit } from "./leaps/bandit.js";
import { lexicalAffect, fuseAffect, Thermometer, strategyFor, type Strategy } from "./affect.js";
import { getCulture, calibrateAffect, culturalize, culturalStyle, type CultureProfile } from "./culture.js";
import { VoiceBehaviourMeter } from "./behaviour.js";
import { detectStall, shouldInterrupt, pickTechnique, captureHook, interruptPrompt, type Technique } from "./patterns.js";

// A process-wide bandit so learning persists across calls (per-segment posteriors).
const bandit = new RebuttalBandit();

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
  // rebuttals shown this call whose outcome (appointment set?) will train the bandit
  private shown: { ctx: string; arm: string }[] = [];
  // affect + lead temperature: the copilot re-reads the room every prospect turn.
  private thermo = new Thermometer();
  // Voice Behaviour Analysis (premium): aggregates the affect/resonance/heat stream into a behavioural profile.
  private behaviour = new VoiceBehaviourMeter("live");
  private affect: Affect = { emotion: "neutral", valence: 0, arousal: 0.3, confidence: 0.3, source: "lexical" };
  private pendingAcoustic?: Affect;   // acoustic emotion (Hume) buffered from call.affect, fused on next utterance
  private strategy?: Strategy;
  private culture: CultureProfile;
  // Pattern interrupts / memory hooks — used sparingly (budget of 1) to make a dying call memorable.
  private interruptsUsed = 0;
  private awaitingHook = false;                          // set after a memory-hook, to capture their answer
  private callbackAnchor?: { timeframe?: string; hook?: string }; // → post-call CRM follow-up

  constructor(
    modeId: string,
    private lead: LeadContext | undefined,
    private emit: (ev: ServerEvent) => void,
    cultureId?: string,   // prospect's culture (locale) — matches tone & closer style to their vibe
  ) {
    this.mode = getMode(modeId);
    this.culture = getCulture(cultureId);
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
      // 2. Read the room: prospect emotion + lead temperature → strategy for the next line.
      if (speaker === "prospect") this.readRoom(text);
      // 3. Stage progression heuristic.
      this.advanceStage(text, speaker);
      // 4. Metrics every final utterance.
      this.emitMetrics();
      // 5. LLM advisor, throttled, conditioned on the tone we just read.
      if (speaker === "prospect") this.maybeAdvise();
    }
  }

  /** Acoustic emotion from the audio edge (call.affect.v1). Buffered; fused on the next final utterance. */
  ingestAcoustic(a: Affect) { if (a) this.pendingAcoustic = a; }

  /** Understand the prospect's tone BEFORE we curate a response, and update the cold→hot temperature. */
  private readRoom(text: string) {
    const prev = this.affect;
    // words + tone → fused affect, then RECALIBRATE to the prospect's culture (match their vibe, not a US default).
    const fused = calibrateAffect(fuseAffect(lexicalAffect(text), this.pendingAcoustic), this.culture);
    this.pendingAcoustic = undefined;              // consume the acoustic sample
    this.affect = fused;
    // emotional TRAJECTORY — react to the direction, not just the level (escalating vs. settling).
    const da = fused.arousal - prev.arousal, dv = fused.valence - prev.valence;
    const traj = da > 0.1 && dv < 0 ? "escalating" : (da < -0.1 || dv > 0.15) ? "cooling" : "steady";
    const buyingSignal = /how much|what.*price|when could|how does it work|what if|next step|send me|what would that/i.test(text);
    const objectionResolved = this.stage === "objection" && fused.valence > 0.1; // softened after a rebuttal
    const { heat, tier, trend, drivers } = this.thermo.update({ affect: fused, prospectWords: words(text), buyingSignal, objectionResolved });
    // base strategy from emotion/heat/trajectory, then re-voice it to the culture (framework + phrasing).
    this.strategy = culturalize(strategyFor(fused, heat, traj), this.culture, fused);
    this.emit({ type: "affect", affect: fused, heat, tier, trend, drivers });
    // VOICE BEHAVIOUR ANALYSIS — fold this turn into the running behavioural profile, and push a live
    // gauge to the overlay every couple of turns (the premium "how the call is feeling" read).
    this.behaviour.push(fused, heat, { atMs: Date.now(), speaker: "prospect", words: words(text) });
    if (this.behaviour.turns % 2 === 0)
      this.emit({ type: "behaviour", behaviour: this.behaviour.snapshot(this.talkRatio()) });
    // proactive coach the instant the room turns hostile — de-escalate to KEEP THEM ON THE LINE.
    if (fused.emotion === "angry")
      this.emit(card({ kind: "coach", title: "They're heating up — de-escalate", body: this.strategy.directive, urgency: "now" }));

    // MEMORY HOOK: if we just deployed one, this prospect turn holds their answer — capture it.
    if (this.awaitingHook) { const h = captureHook(text); if (h) this.callbackAnchor = { ...this.callbackAnchor, hook: h }; this.awaitingHook = false; }

    // PATTERN INTERRUPT: a soft stall or a disengaging prospect, calm enough, not a hot buyer → make it
    // memorable instead of hanging up. Fires at most once per call, and only when the culture allows it.
    const stall = detectStall(text);
    const ictx = { stall, affect: fused, heat, culture: this.culture, used: this.interruptsUsed, prospectWords: words(text) };
    if (shouldInterrupt(ictx)) {
      const tech = pickTechnique(ictx);
      this.interruptsUsed++;
      if (stall?.timeframe) this.callbackAnchor = { ...this.callbackAnchor, timeframe: stall.timeframe };
      if (tech.id === "memory-hook") this.awaitingHook = true;
      const { line, followCue } = tech.build(ictx);
      this.emit(card({ kind: "coach", title: `Don't hang up — make it memorable · ${tech.name}`, body: `${line}\n▸ ${followCue}`, urgency: "now" }));
      void this.maybePatternInterrupt(tech, ictx);   // LLM riffs a fresh, in-voice version — best-effort
    }
  }

  /** LLM riffs a fresh, in-voice memorable line from the chosen technique. Best-effort; the deterministic
   *  card already fired, so this never blocks or breaks the call. */
  private async maybePatternInterrupt(tech: Technique, ictx: Parameters<typeof interruptPrompt>[1]) {
    try {
      const recent = this.transcript.slice(-6).map((u) => `${u.speaker}: ${u.text}`).join("\n");
      const res = await llm().chat.completions.create({
        model: MODEL, max_tokens: 70,
        messages: [
          { role: "system", content: `${this.mode.systemPrompt}\n${interruptPrompt(tech, ictx)}` },
          { role: "user", content: recent },
        ],
      });
      const body = res.choices[0]?.message?.content?.trim();
      if (body) this.emit(card({ kind: "answer", title: `Or, in your own words · ${tech.name}`, body, urgency: "now", stage: this.stage }));
    } catch { /* fail silent — the deterministic memorable line already landed */ }
  }

  private talkRatio(): number { const t = this.repWords + this.prospectWords || 1; return this.repWords / t; }

  private matchObjection(text: string) {
    const t = text.toLowerCase();
    for (const o of this.mode.objections) {
      if (this.firedObjections.has(o.label)) continue;
      if (o.triggers.some((trig) => t.includes(trig))) {
        this.firedObjections.add(o.label);
        this.emit(card({
          kind: "objection",
          title: `Objection: ${o.label}`,
          body: this.pickRebuttal(o),
          urgency: "now",
          stage: "objection",
        }));
        this.setStage("objection");
        return;
      }
    }
  }

  /** Choose the rebuttal: bandit-optimized if variants exist, else the static line. */
  private pickRebuttal(o: ObjectionRebuttal): string {
    if (!o.variants?.length) return o.rebuttal;
    const ctx = `${o.label}|${this.mode.id}|${this.lead?.leadType ?? ""}`;
    const arm = bandit.select(ctx, o.variants.map((v) => v.id));
    this.shown.push({ ctx, arm });
    return o.variants.find((v) => v.id === arm)?.text ?? o.rebuttal;
  }

  /** Train the bandit on the call outcome (reward = appointment set). Call on call.ended. */
  recordOutcome(appointmentSet: boolean): void {
    const reward: 0 | 1 = appointmentSet ? 1 : 0;
    for (const s of this.shown) bandit.update(s.ctx, s.arm, reward);
    this.shown = [];
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
    // Curate the response for the tone we just read + the lead's temperature + their culture.
    const tone = `Prospect tone: ${this.affect.emotion} (valence ${this.affect.valence.toFixed(1)}, lead heat ${this.thermo.value}/100).`;
    const plan = this.strategy ? `Play it ${this.strategy.play} in the style of ${this.strategy.master}: ${this.strategy.directive}` : "";
    const cx = culturalStyle(this.culture);
    try {
      const stream = await llm().chat.completions.create({
        model: MODEL,
        stream: true,
        max_tokens: 90,
        messages: [
          { role: "system", content:
            `${this.mode.systemPrompt}\nCurrent stage: ${this.stage}. ${leadStr}\n${cx}\n${tone}\n${plan}\n` +
            `OBJECTIVE: keep the prospect on the call and move them from cold toward hot. Never dead-end — ` +
            `end on a question or a hook that earns the next sentence. Match their emotional temperature AND their ` +
            `cultural style (don't pitch an angry prospect; don't hard-close an indirect one; don't stall a hot one). ` +
            `Give ONE short, natural line the rep should say next. No preamble.` },
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
    // Finalize the Voice Behaviour Analysis first — it must land even if the LLM summary fails.
    this.emit({ type: "behaviour", behaviour: this.behaviour.snapshot(this.talkRatio()), final: true });
    // Memory hook → a concrete, memorable follow-up the rep will actually keep (deterministic, LLM-independent).
    const anchor = this.callbackAnchor;
    if (anchor?.timeframe || anchor?.hook)
      this.emit(card({ kind: "coach", title: "Follow-up locked", urgency: "fyi",
        body: `Call back ${anchor.timeframe ?? "as agreed"}${anchor.hook ? ` — open with their “${anchor.hook}.” They'll remember you.` : "."}` }));
    try {
      const res = await llm().chat.completions.create({
        model: MODEL,
        max_tokens: 320,
        messages: [
          { role: "system", content: `Summarize this cold call for a CRM. Fields: ${this.mode.summaryTemplate.join(", ")}. Then give a disposition, a next step, and a short follow-up SMS draft. Return JSON: {summary, disposition, nextStep, followUpDraft:{channel, body}}.` +
            (this.callbackAnchor?.timeframe || this.callbackAnchor?.hook
              ? ` The rep agreed to follow up${this.callbackAnchor.timeframe ? ` in ${this.callbackAnchor.timeframe}` : ""}${this.callbackAnchor.hook ? ` and captured a personal detail to reference: "${this.callbackAnchor.hook}"` : ""}. Make nextStep reflect that callback${this.callbackAnchor.hook ? ", and weave the detail naturally into followUpDraft.body so it feels personal" : "."}` : "") },
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
