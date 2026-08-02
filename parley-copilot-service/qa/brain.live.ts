// Live quality check on the closer brain: same words, different VOICE — does the advice change?
// Requires OPENAI_API_KEY. Prints the actual lines so quality is judged by reading them.
import OpenAI from "openai";
import { closerSystemPrompt, CLOSER_SHOTS, CLOSER_MODEL } from "../src/brain.js";
import type { Affect } from "@parley/contracts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch: globalThis.fetch });
const MODE = "You are a cold-call copilot for a real estate rep calling an EXPIRED LISTING. The homeowner tried to sell and failed.";

async function line(affect: Affect, heat: number, stage: string, transcript: string) {
  const r = await openai.chat.completions.create({
    model: CLOSER_MODEL, max_tokens: 90, temperature: 0.7, presence_penalty: 0.4,
    messages: [
      { role: "system", content: closerSystemPrompt({ modePrompt: MODE, stage, affect, heat }) },
      ...CLOSER_SHOTS,
      { role: "user", content: transcript },
    ],
  });
  return r.choices[0].message.content?.trim() ?? "";
}

const A = (emotion: string, valence: number, arousal: number): Affect =>
  ({ emotion: emotion as any, valence, arousal, confidence: 0.8, source: "fused" });

const SAME_WORDS = "prospect: I'm not interested.";
console.log("\nSAME WORDS — “I'm not interested.” — different VOICE:\n");
for (const [label, a, heat] of [
  ["ANGRY (shouted)",       A("angry", -0.8, 0.9), 10],
  ["FLAT (bored, monotone)", A("hesitant", -0.1, 0.15), 25],
  ["HESITANT (unsure)",      A("hesitant", -0.2, 0.4), 35],
] as [string, Affect, number][]) {
  console.log(`  ${label}\n    → ${await line(a, heat, "objection", SAME_WORDS)}\n`);
}

console.log("HOT prospect, close window:");
console.log(`    → ${await line(A("positive", 0.7, 0.6), 82, "close", "prospect: Okay, that actually makes sense. What would the next step look like?")}\n`);

console.log("REP TALKING TOO MUCH (should be short + hand back the floor):");
const r = await openai.chat.completions.create({
  model: CLOSER_MODEL, max_tokens: 90, temperature: 0.7,
  messages: [
    { role: "system", content: closerSystemPrompt({ modePrompt: MODE, stage: "value", affect: A("neutral", 0, 0.3), heat: 45, talkRatioRep: 0.78 }) },
    ...CLOSER_SHOTS,
    { role: "user", content: "rep: ...and we do professional photography, staging consults, targeted ads, open houses...\nprospect: mm-hm." },
  ],
});
console.log(`    → ${r.choices[0].message.content?.trim()}\n`);
