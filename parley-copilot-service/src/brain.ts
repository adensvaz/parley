// The closer brain — how Parley decides what a top 1% closer would actually say next.
//
// Two things make a line land on a real call, and both are encoded here:
//   1. WHAT THEY SAID  — the objection, the stage, the lead's history.
//   2. HOW THEY SOUND  — the acoustic read (pitch, energy, pace) fused with the words.
//      A flat "I'm not interested" and a hostile one are the same words and need
//      opposite responses. Most tools only see the transcript; we see the voice.
//
// The craft rules below are the difference between a script and a closer. They're
// deliberately phrased as constraints, because LLMs pitch when left unconstrained —
// and pitching into resistance is exactly what loses the call.

import type { Affect } from "@parley/contracts";

/** The non-negotiables of spoken sales craft. */
const CRAFT = `
YOU ARE THE EARPIECE OF A TOP 1% CLOSER. Output ONE line the rep says out loud. Nothing else.

Craft rules — these are how closers actually talk:
• ACKNOWLEDGE BEFORE ANYTHING. Never argue, never "but". Take their side first, genuinely.
• LABEL THE EMOTION when it's strong ("sounds like you've been burned before") — naming it
  defuses it. Never label a calm prospect; it sounds like therapy.
• ASK, DON'T TELL. A question keeps them talking and keeps you in control. Statements end turns.
• EARN THE NEXT SENTENCE. Never dead-end. The line must make it natural for them to reply.
• BE SPOKEN, NOT WRITTEN. Contractions. Under 30 words. No jargon, no "reach out", no
  "circle back", no "value proposition". If a human wouldn't say it on the phone, don't write it.
• NEVER PITCH INTO RESISTANCE. If they're cold or hostile, the goal is one more sentence of
  conversation — not the appointment.
• ONE IDEA. Two questions in a line is a wasted turn.
• NO FILLER OPENERS. Don't start with "Absolutely", "Great question", "I hear you", "I understand".
• DON'T INVENT FACTS. No prices, no names, no claims you weren't given.
`.trim();

/** Emotion → the move a closer actually makes. This is the acoustic read paying off. */
const PLAYBOOK: Record<string, string> = {
  angry:      "They're hot. Do NOT pitch, do NOT defend. Take the hit, give them control, lower your energy below theirs. Goal: stay on the line 10 more seconds.",
  frustrated: "Something already failed them. Name that frustration and separate yourself from whoever caused it. Ask what went wrong — let them vent, it's the fastest route to trust.",
  skeptical:  "They think you're another caller. Earn credibility with candor, not enthusiasm — admit the awkwardness of the call. A little self-deprecation outperforms polish here.",
  hesitant:   "They're half-out. Reduce the ask to something almost free. Make saying yes cheaper than saying no.",
  neutral:    "No signal yet. Ask one sharp, specific question that's hard to answer with 'no'.",
  curious:    "They leaned in. Don't oversell — feed the curiosity with one concrete detail, then ask again.",
  warming:    "Trust is building. Deepen it before you close: one more question about their situation, then the ask.",
  positive:   "They're with you. Move to the specific next step now — offer two concrete times, don't ask an open question.",
  excited:    "Highest risk of over-talking. Confirm and close immediately. Shut up after the ask.",
  // local prosody vocabulary (voice.ts) maps in too
  flat:       "Monotone — they're disengaged, not hostile. Pattern-interrupt with something unexpected and human.",
  tense:      "Strain in the voice. Slow down, soften, give them an easy exit — paradoxically that keeps them on.",
  animated:   "High energy. Match it, then channel it into a concrete next step before it fades.",
  quiet:      "Barely engaging. Short, direct, low-pressure. One question, then silence.",
};

export interface BrainContext {
  modePrompt: string;         // the playbook persona
  stage: string;              // intro | discovery | value | objection | close | wrap
  affect: Affect;             // fused words+voice read
  heat: number;               // 0..100 lead temperature
  trajectory?: string;        // escalating | cooling | steady
  strategy?: string;          // play + directive from the strategy layer
  culture?: string;           // cultural phrasing guidance
  lead?: unknown;
  talkRatioRep?: number;
}

/** Build the system prompt for the live advisor. */
export function closerSystemPrompt(c: BrainContext): string {
  const e = c.affect.emotion;
  const move = PLAYBOOK[e] ?? PLAYBOOK.neutral;
  const acoustic = c.affect.source === "acoustic" || c.affect.source === "fused";

  const voice = acoustic
    ? `VOICE READ (how they SOUND, not just what they said): ${e}, arousal ${c.affect.arousal.toFixed(2)}, valence ${c.affect.valence.toFixed(2)}.`
    : `TEXT READ (no clean audio): ${e}.`;

  const temp = c.heat >= 70 ? "HOT — they are close. Ask for the next step."
    : c.heat >= 40 ? "WARM — keep building, one more question before the ask."
    : "COLD — do not ask for anything yet. Buy one more sentence.";

  const talky = (c.talkRatioRep ?? 0) > 0.55
    ? "The rep is talking too much. Make the line SHORT and hand the floor back."
    : "";

  return [
    c.modePrompt,
    CRAFT,
    `STAGE: ${c.stage}.`,
    voice,
    `LEAD TEMPERATURE: ${c.heat}/100 — ${temp}`,
    c.trajectory ? `TRAJECTORY: ${c.trajectory} (react to the direction, not just the level).` : "",
    `THE MOVE: ${move}`,
    c.strategy ? `STRATEGY: ${c.strategy}` : "",
    c.culture ?? "",
    talky,
    c.lead ? `LEAD: ${JSON.stringify(c.lead)}` : "",
    `Return ONLY the spoken line. No quotes, no label, no explanation.`,
  ].filter(Boolean).join("\n");
}

/** A couple of gold examples materially lift line quality — show, don't just tell. */
export const CLOSER_SHOTS: { role: "user" | "assistant"; content: string }[] = [
  { role: "user", content: "prospect: I'm really not interested, we've had a dozen agents call." },
  { role: "assistant", content: "Sounds like you've been buried in these calls. What did the last one get wrong?" },
  { role: "user", content: "prospect: What's this going to cost me?" },
  { role: "assistant", content: "Fair to ask — depends what we'd actually be doing. What would make it worth paying for?" },
];

export const CLOSER_MODEL = process.env.COPILOT_MODEL ?? "gpt-4o";
