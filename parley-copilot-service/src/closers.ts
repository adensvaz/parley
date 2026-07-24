// The elite-closer playbook — the frameworks of the best closers in the world, distilled into
// structured, retrievable moves the engine can apply live. Culture (culture.ts) chooses WHICH
// framework resonates and re-voices the line; this file is the "what" and "how".
export type FrameworkId = "straight-line" | "hormozi" | "voss" | "nepq" | "cardone";

export interface Closer {
  master: string;
  principle: string;          // the one idea
  moves: string[];            // the mechanics, in order
  line: string;               // a canonical, culture-neutral line to adapt
  fitsPlay: string[];         // which strategy plays this framework serves
}

export const CLOSERS: Record<FrameworkId, Closer> = {
  "straight-line": {
    master: "Jordan Belfort", principle: "Control the tonality and the straight line from open to close; project certainty in the product, in you, and in the company.",
    moves: ["hold an assumptive, certain tone", "keep the conversation on the line — redirect tangents", "loop every objection back to raising certainty", "then re-ask for the close"],
    line: "Here's what I'd do if I were you — let's lock in the next step and I'll take it from there.", fitsPlay: ["close", "advance"],
  },
  hormozi: {
    master: "Alex Hormozi", principle: "Make the value so obvious the price feels small: isolate value vs. cost, stack the return, de-risk with a guarantee.",
    moves: ["separate 'too expensive' from 'not worth it'", "stack concrete value tied to what they said", "de-risk (guarantee / no downside)", "then a soft trial close"],
    line: "If this paid for itself with one result, would the price still be the question — or is it really timing?", fitsPlay: ["trial-close", "advance", "acknowledge"],
  },
  voss: {
    master: "Chris Voss", principle: "Tactical empathy: label the emotion, let them feel understood, then use calibrated questions so they solve it themselves. Make 'no' safe.",
    moves: ["label what they feel ('it sounds like…')", "mirror the last few words", "ask a calibrated 'how/what' question", "let the silence work"],
    line: "It sounds like the timing on this is tough right now. What would have to be true for it to be worth a look?", fitsPlay: ["de-escalate", "acknowledge", "probe"],
  },
  nepq: {
    master: "Jeremy Miner", principle: "Neuro-emotional questions: let the prospect articulate the problem and its cost out loud — they persuade themselves.",
    moves: ["ask a situation question", "then a problem-awareness question", "then a consequence question", "stay curious, never pitch"],
    line: "What made you start looking at this in the first place — and what happens if it stays the way it is?", fitsPlay: ["probe", "acknowledge"],
  },
  cardone: {
    master: "Grant Cardone", principle: "Treat 'no' as 'not yet': assumptive, persistent, follow-up-driven. Massive certainty and control.",
    moves: ["stay assumptive about the next step", "handle the objection, then re-ask", "always set a concrete follow-up", "never take the first no as final"],
    line: "Totally fine — let's pencil something in and if it's not a fit, you tell me. Tuesday 10 or Thursday 2?", fitsPlay: ["close", "advance"],
  },
};

/** Pick the framework from a ranked cultural preference that best fits the current play. */
export function pickFramework(preferred: FrameworkId[], play: string): FrameworkId {
  return preferred.find((f) => CLOSERS[f].fitsPlay.includes(play)) ?? preferred[0] ?? "voss";
}
