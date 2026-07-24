// Pattern interrupts & memory hooks — the "make it memorable" layer.
//
// A cold call dies in the blow-off: "call me back later," "just send an email," "not interested."
// The reflex is to hang up. The move is a PATTERN INTERRUPT — one unexpected, genuinely human beat
// that snaps the prospect out of the script both people are running, and (the killer version) a MEMORY
// HOOK that ties the follow-up to a personal detail so your rep becomes unforgettable instead of
// "some caller." e.g. "so I actually remember you — go-to pizza?" → "you're going in as 'Margarita,'
// I'll call in 3 weeks."
//
// The whole game is SELECTIVITY. Wit on an angry prospect is a disaster. Wit on a hot, ready buyer
// wastes the close. Wit every call makes you a clown. So this fires only when the moment is right —
// a soft stall or a disengaging prospect, non-hostile affect, not a hot buyer, once per call, and
// tuned to the culture (a playful bit lands in Miami, not in a high-formality Tokyo call).
//
// The technique library below is the SCAFFOLD, not the script — each technique is a *mechanic* with a
// strong fallback line; the LLM riffs on the mechanic to generate a fresh, in-voice line every time,
// so the surface is effectively infinite while the judgment of WHEN stays deterministic and testable.
import type { Affect } from "@parley/contracts";
import type { CultureProfile } from "./culture.js";

export type StallKind = "callback" | "not-interested" | "send-email" | "just-looking" | "think-about-it" | "no-time";

const STALL_PATTERNS: { kind: StallKind; re: RegExp }[] = [
  { kind: "callback", re: /\b(call (me )?(back )?(later|next week|next month|in (a|\d))|reach out (later|in)|try (me )?(again|back|later|in)|circle back|another time|catch me later)\b/ },
  { kind: "send-email", re: /\b(send (me )?(an? )?(email|info|something|details)|email me|shoot me an email|put it in (an )?email)\b/ },
  { kind: "not-interested", re: /\b(not interested|no thanks|we'?re good|not right now|all set|we'?re fine)\b/ },
  { kind: "just-looking", re: /\b(just looking|just browsing|early stages?|not ready|kicking tires)\b/ },
  { kind: "think-about-it", re: /\b(think about it|need to think|let me think|get back to you|sleep on it|run it by)\b/ },
  { kind: "no-time", re: /\b(bad time|busy right now|in a meeting|i'?m driving|no time|slammed|swamped)\b/ },
];

const TIMEFRAME_RE = /\b(?:in\s+)?(a few weeks|a couple (?:of )?weeks|next week|next month|(?:\d{1,2})\s*(?:days?|weeks?|months?)|(?:the\s+)?(?:spring|summer|fall|autumn|winter|new year|holidays|q[1-4]))\b/;
export function extractTimeframe(text: string): string | undefined {
  const m = text.toLowerCase().match(TIMEFRAME_RE);
  return m ? m[0].replace(/^in\s+/, "").trim() : undefined;
}

/** A soft blow-off / stall the rep can turn memorable — NOT a DNC or a hard no (those we respect). */
export function detectStall(text: string): { kind: StallKind; timeframe?: string } | null {
  const t = text.toLowerCase();
  if (/\b(take me off|do not call|stop calling|remove me|off your list|never call)\b/.test(t)) return null; // opt-out: never clown it
  for (const p of STALL_PATTERNS) if (p.re.test(t)) return { kind: p.kind, timeframe: extractTimeframe(t) };
  return null;
}

/** How well playfulness lands in this culture (0..1). High formality/hierarchy suppress it; warmth and
 *  expressiveness raise it. Keeps a pizza bit out of a formal Japanese call, green-lights it in LatAm. */
export function playfulness(c: CultureProfile): number {
  return Math.max(0, Math.min(1, c.expressiveness * 0.5 + (1 - c.formality) * 0.3 + c.warmth * 0.2 - c.hierarchy * 0.15));
}

const isHostile = (a: Affect) => a.emotion === "angry" || a.emotion === "frustrated" || (a.arousal > 0.6 && a.valence < -0.2);

export interface InterruptCtx {
  stall: { kind: StallKind; timeframe?: string } | null;
  affect: Affect;
  heat: number;
  culture: CultureProfile;
  used: number;          // pattern interrupts already spent this call (budget = 1)
  prospectWords: number; // to catch silent disengagement even without a keyword stall
}

/** The gate. Fire ONLY when a memorable beat helps: a soft stall or a disengaging prospect, calm-enough
 *  affect, not a hot buyer, and we haven't already used our one shot. "When needed, not always." */
export function shouldInterrupt(ctx: InterruptCtx): boolean {
  if (ctx.used >= 1) return false;                 // one memorable moment per call — overuse kills it
  if (isHostile(ctx.affect)) return false;         // never joke with an angry prospect
  if (ctx.heat >= 70) return false;                // a hot, ready buyer wants the close, not a bit
  const disengaged = ctx.prospectWords <= 3 && ctx.heat < 45; // short, cooling answers = losing them
  return !!ctx.stall || disengaged;
}

// ── The technique library — mechanics, not scripts ───────────────────────────────
export interface Technique {
  id: string;
  name: string;
  minPlayfulness: number; // culture bar; below it, we pick a gentler technique
  mechanic: string;       // the move, handed to the LLM to riff on
  build(ctx: InterruptCtx): { line: string; followCue: string };
}

export const TECHNIQUES: Record<string, Technique> = {
  "memory-hook": {
    id: "memory-hook", name: "The Memory Hook", minPlayfulness: 0.5,
    mechanic: "With genuine interest, invite one real personal detail, then anchor the callback to it so the rep is remembered — not a cold call again. Warm and sincere, never a gag.",
    build: (c) => ({
      line: `Fair enough — before I let you go, so I'm not just another name in your phone ${c.stall?.timeframe || "next time"}: what's the one thing I should ask you about when I call back?`,
      followCue: `Note whatever they say and open the next call with it, by name — "How did the kitchen reno turn out?" Anchored to something real, you're the rep who remembered, not another cold call ${c.stall?.timeframe || "later"}.`,
    }),
  },
  "disarming-candor": {
    id: "disarming-candor", name: "Disarming Candor", minPlayfulness: 0.4,
    mechanic: "Meet the brush-off with calm, confident honesty instead of a pitch — acknowledge it's a fair reaction, then ask for one straight minute. Composure, not comedy.",
    build: () => ({
      line: "That's a fair reaction, and I won't pretend this is for everyone. Give me one straight minute — if it's not worth it, I'll be the one to end the call.",
      followCue: "Match their guard with quiet confidence, not enthusiasm. Earn the minute, then make it land — no pitch.",
    }),
  },
  "left-field-question": {
    id: "left-field-question", name: "The Genuine Question", minPlayfulness: 0.3,
    mechanic: "Ask one real, thoughtful question that resets the conversation off autopilot. Sincere curiosity, not a clever line.",
    build: () => ({
      line: "Understood. One honest question, then I'll leave it to you — if you did make a move in the next year, what would have to be true for it to be worth it?",
      followCue: "The answer is the whole call. Listen, then build from their words — don't steer back to the pitch.",
    }),
  },
  "curiosity-gap": {
    id: "curiosity-gap", name: "The Held-Back Insight", minPlayfulness: 0.25,
    mechanic: "Signal there's one specific, relevant thing worth knowing that doesn't fit in an email, so the conversation itself carries the value.",
    build: () => ({
      line: "I can send it over — but the one thing that actually matters here doesn't fit in an email. Ninety seconds on the phone and it'll make sense. Worth it?",
      followCue: "Name that a specific insight exists; don't spill it. The value lives in the conversation, and they can feel that.",
    }),
  },
  "self-deprecating": {
    id: "self-deprecating", name: "Time, Respected", minPlayfulness: 0.4,
    mechanic: "Acknowledge you interrupted them, with composure and zero groveling, then make a clear, small ask. Respect signals status.",
    build: () => ({
      line: "You're busy and I called you out of the blue — I get it. Fifteen seconds to earn a real conversation later, or tell me to go and I will.",
      followCue: "Respect plus confidence, no apologizing. If they give the fifteen seconds, ask one sharp question — don't pitch.",
    }),
  },
  "honest-transparency": {
    id: "honest-transparency", name: "Straight Talk", minPlayfulness: 0,
    mechanic: "Name the cold-call reality plainly and with composure — the pattern-break that works in any culture, including formal ones.",
    build: () => ({
      line: "Let me be straight with you — you didn't ask for this call, and I respect that. Twenty seconds to make it worth your while, and if it isn't, we're done.",
      followCue: "Honesty delivered with composure cuts through the script you're both running. Then get to the one relevant thing, fast.",
    }),
  },
  "named-callback": {
    id: "named-callback", name: "The Named Callback", minPlayfulness: 0,
    mechanic: "Turn a vague 'later' into a specific, agreed slot so the next call isn't cold — respectful, works in formal cultures.",
    build: (c) => ({
      line: `Understood — let's make it real so it doesn't slip through the cracks. I'll call ${c.stall?.timeframe || "then"}; what day that week actually works, morning or afternoon?`,
      followCue: "A specific, agreed slot beats a vague 'later' — you're already half-booked for the next conversation.",
    }),
  },
};

const BY_KIND: Record<StallKind | "disengaged", string[]> = {
  "callback": ["memory-hook", "named-callback"],
  "not-interested": ["disarming-candor", "honest-transparency"],
  "send-email": ["curiosity-gap", "honest-transparency"],
  "just-looking": ["left-field-question", "curiosity-gap"],
  "think-about-it": ["curiosity-gap", "honest-transparency"],
  "no-time": ["self-deprecating", "honest-transparency"],
  "disengaged": ["left-field-question", "honest-transparency"],
};

/** Pick the best technique for the moment, honoring the culture's playfulness bar (falls back to a
 *  gentle, culture-universal technique when a playful one would misfire). */
export function pickTechnique(ctx: InterruptCtx): Technique {
  const key: StallKind | "disengaged" = ctx.stall?.kind ?? "disengaged";
  const p = playfulness(ctx.culture);
  for (const id of BY_KIND[key]) {
    const tech = TECHNIQUES[id];
    if (p >= tech.minPlayfulness) return tech;
  }
  return TECHNIQUES["honest-transparency"];
}

/** After a memory-hook, capture the prospect's answer (their "hook") for the callback + CRM note. */
export function captureHook(text: string): string | undefined {
  const t = text.trim().replace(/[.!?,]+$/, "");
  if (!t) return undefined;
  const words = t.split(/\s+/);
  if (words.length <= 4) return t.replace(/^(uh+|um+|it'?s|i (like|love|guess)|probably|maybe)\s+/i, "").trim() || t;
  const m = t.match(/\b(?:like|love|it'?s|prefer|go(?:-| )?to is)\s+([a-z][a-z' ]{2,20})/i);
  return m ? m[1].trim() : undefined;
}

/** LLM instruction to generate a FRESH, in-voice line from the chosen mechanic (infinite surface,
 *  same judgment). Keeps it human and short; never cheesy, never canned. */
export function interruptPrompt(tech: Technique, ctx: InterruptCtx): string {
  const p = playfulness(ctx.culture);
  const tone = p >= 0.55 ? "warm, confident, and genuinely human" : p >= 0.35 ? "composed, sincere, and grounded" : "understated, respectful, and sincere";
  return [
    `The prospect is stalling (${ctx.stall?.kind ?? "disengaged"}). Instead of hanging up, use ONE pattern interrupt to keep them on the line and make the rep memorable.`,
    `Technique: ${tech.name}. Mechanic: ${tech.mechanic}`,
    ctx.stall?.timeframe ? `They mentioned a timeframe: "${ctx.stall.timeframe}" — anchor any callback to it.` : "",
    `Culture: ${ctx.culture.name}. Keep it ${tone}. One or two sentences, spoken, in the rep's own natural voice.`,
    `CRITICAL TONE: it must sound like an elite, likeable professional being genuinely real — quiet confidence, not enthusiasm. NEVER comedic, NEVER a joke or a gimmick, NEVER cheesy, corny, or salesy. No forced wit. If it's a memory hook, ask for one real personal detail with sincere interest and show how to open the next call with it by name.`,
    `Give ONLY the line the rep should say next.`,
  ].filter(Boolean).join("\n");
}
