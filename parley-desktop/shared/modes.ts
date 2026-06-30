// Prospecting modes — data-driven, versioned, extensible registry.
// Add a mode = add a data object. Users can also define CUSTOM modes (same shape, builtIn:false)
// which are merged at runtime via mergeModes(). Objection matching is backed by a precompiled
// index (buildObjectionIndex) so large libraries stay fast.

export type ModeCategory = "real-estate" | "sales";

export interface ObjectionRebuttal {
  /** lowercased phrases that trigger this objection (substring/index matched server-side) */
  triggers: string[];
  label: string;
  /** the line the rep should say back */
  rebuttal: string;
  /** drives card urgency + analytics weighting */
  severity?: "low" | "med" | "high";
}

export interface ProspectingMode {
  id: string;
  name: string;
  icon: string;
  category: ModeCategory;
  /** schema version of THIS mode's content, for safe edits/migrations */
  version: number;
  /** false for user-created custom modes */
  builtIn: boolean;
  systemPrompt: string;
  scriptSkeleton: { stage: string; cue: string }[];
  objections: ObjectionRebuttal[];
  summaryTemplate: string[];
}

// ── Shared objection library (applies to nearly every cold call) ──────────────
const COMMON_OBJECTIONS: ObjectionRebuttal[] = [
  { triggers: ["not interested", "no thanks", "we're good", "not right now"], label: "Not interested", severity: "high",
    rebuttal: "Totally fair — most people aren't until they hear the one thing I called about. Can I take 20 seconds and you tell me to buzz off if it's not useful?" },
  { triggers: ["how did you get my number", "who is this", "where'd you get", "how'd you get my"], label: "How'd you get my number", severity: "med",
    rebuttal: "Fair question — your info came up as [source]. I'm not a robocall, it's just me. I'll be quick and respectful of your time." },
  { triggers: ["already have an agent", "working with someone", "have a realtor", "have a guy"], label: "Already have someone", severity: "med",
    rebuttal: "Great — sounds like you're in good hands. I'm not calling to replace anyone, I called because [specific reason]. Worth 30 seconds?" },
  { triggers: ["take me off", "do not call", "stop calling", "remove me", "off your list"], label: "DNC request", severity: "high",
    rebuttal: "Absolutely, I'll remove you right now and you won't hear from me again. Thanks for your time." },
  { triggers: ["call me later", "bad time", "busy right now", "in a meeting", "driving"], label: "Bad time", severity: "low",
    rebuttal: "No problem — I'd rather catch you when it's good. Is later today or tomorrow morning better for a 5-minute call?" },
  { triggers: ["send me an email", "send info", "email me", "send something"], label: "Send me an email", severity: "med",
    rebuttal: "Happy to — and so I don't send a wall of junk, what's the one thing that'd actually be worth reading? I'll send just that." },
];

const builtIn = (m: Omit<ProspectingMode, "builtIn" | "version"> & Partial<Pick<ProspectingMode, "version">>): ProspectingMode =>
  ({ version: 1, builtIn: true, ...m });

// ── Built-in catalog ──────────────────────────────────────────────────────────
export const MODES: ProspectingMode[] = [
  builtIn({
    id: "expired", name: "Expired Listings", icon: "home", category: "real-estate",
    systemPrompt:
      "You are a top-producing real estate cold-call copilot helping the rep convert an EXPIRED LISTING. " +
      "The homeowner tried to sell and failed — they are frustrated and skeptical of agents. Coach empathy first, " +
      "diagnose why it didn't sell, then position a fresh strategy and the appointment. Lines must be short, natural, spoken.",
    scriptSkeleton: [
      { stage: "intro", cue: "Empathy + 'I saw your home came off the market — are you still hoping to get it sold?'" },
      { stage: "discovery", cue: "Diagnose: 'What do you think kept it from selling?' Let them talk." },
      { stage: "value", cue: "Position a DIFFERENT plan (pricing, marketing, photos) — not 'same thing again'." },
      { stage: "close", cue: "Ask for a 15-min in-person to show the plan. Offer two slots." },
    ],
    objections: [
      { triggers: ["going to relist myself", "sell it myself", "fsbo it"], label: "Will sell it myself", severity: "high",
        rebuttal: "I respect that. Quick thought — the reason it didn't sell probably wasn't effort, it was strategy. Let me show you the 3 things I'd change. DIY after if you still want, no hard feelings." },
      { triggers: ["all agents say the same", "heard it before", "you're all the same", "every agent"], label: "All agents are the same", severity: "high",
        rebuttal: "You're right to be skeptical — you just lived it. That's exactly why I won't pitch you on the phone. Let me earn 15 minutes and show you specifically what went wrong." },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Why it didn't sell", "Timeline/motivation", "Objections raised", "Appointment set?", "Next step"],
  }),
  builtIn({
    id: "fsbo", name: "FSBO", icon: "tag", category: "real-estate",
    systemPrompt:
      "Copilot for a rep calling a FOR-SALE-BY-OWNER. They want to avoid commission. Do NOT attack their choice. " +
      "Respect the effort, uncover pain (showings, lowballers, paperwork), sell NET proceeds + risk transfer, not price.",
    scriptSkeleton: [
      { stage: "intro", cue: "Compliment listing + ask permission. 'Saw your place — looks sharp. How's the sale going?'" },
      { stage: "discovery", cue: "Surface pain: showings, tire-kickers, lowball offers, financing fall-through." },
      { stage: "value", cue: "Frame NET proceeds and risk transfer, not gross commission." },
      { stage: "close", cue: "Offer a no-obligation buyer-traffic walkthrough / CMA." },
    ],
    objections: [
      { triggers: ["don't want to pay commission", "save the commission", "why pay 6", "keep the commission"], label: "Won't pay commission", severity: "high",
        rebuttal: "Makes total sense — that's the whole point of FSBO. Only thing I'd check: would you take more money in your pocket even after my fee? That's usually how it works out. Worth a 10-minute look?" },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Asking price", "Motivation/timeline", "Pain points", "Open to representation?", "Next step"],
  }),
  builtIn({
    id: "circle", name: "Circle Prospecting", icon: "map-pin", category: "real-estate",
    systemPrompt:
      "Copilot for 'just listed / just sold' neighborhood circle-prospecting. Goal: find the next seller/buyer nearby, " +
      "offer a free home valuation, stay light and neighborly.",
    scriptSkeleton: [
      { stage: "intro", cue: "'I just sold the home on [street] — calling a few neighbors.'" },
      { stage: "discovery", cue: "'Any thoughts of selling in the next year?' / 'Know anyone who is?'" },
      { stage: "value", cue: "Offer free valuation off the recent comp." },
      { stage: "close", cue: "Permission to send the valuation / set a quick chat." },
    ],
    objections: COMMON_OBJECTIONS,
    summaryTemplate: ["Interest level", "Timeline", "Referral given?", "Valuation requested?", "Next step"],
  }),
  builtIn({
    id: "buyer", name: "Buyer Lead Follow-up", icon: "user", category: "real-estate",
    systemPrompt:
      "Copilot for following up an internet BUYER lead. Speed-to-lead matters. Qualify (timeline, financing, area) " +
      "and book a buyer consult or showing. Warm, fast, low-pressure.",
    scriptSkeleton: [
      { stage: "intro", cue: "Reference the property/site they came in on." },
      { stage: "discovery", cue: "Qualify: timeline, pre-approval, must-haves, area." },
      { stage: "value", cue: "Offer to set up a search / send matching homes." },
      { stage: "close", cue: "Book the consult or first showing." },
    ],
    objections: [
      { triggers: ["just looking", "early", "not ready", "just browsing"], label: "Just looking", severity: "med",
        rebuttal: "Perfect — that's the best time to talk so you're ready when the right one hits. Want me to set up alerts so you see new listings before they blow up on Zillow?" },
      { triggers: ["not pre-approved", "haven't talked to a lender", "no financing", "not pre approved"], label: "Not pre-approved", severity: "med",
        rebuttal: "No worries — that's step one and it's free. I can connect you with a lender who'll get you a number in 10 minutes, no commitment. Want the intro?" },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Timeline", "Pre-approved?", "Area/budget", "Consult booked?", "Next step"],
  }),
  builtIn({
    id: "investor", name: "Investor / Wholesaler", icon: "trending-up", category: "real-estate",
    systemPrompt:
      "Copilot for calling a potential seller for an INVESTOR/wholesale deal. Goal: gauge motivation, condition, and a " +
      "realistic number; sell speed + certainty + as-is. Be direct and numbers-driven, never pushy.",
    scriptSkeleton: [
      { stage: "intro", cue: "'I buy homes in [area] — are you open to an offer if the number's right?'" },
      { stage: "discovery", cue: "Motivation, timeline, condition, liens, occupancy." },
      { stage: "value", cue: "Sell as-is, cash, close on their date, no fees/showings." },
      { stage: "close", cue: "Set a walkthrough or lock a verbal range." },
    ],
    objections: [
      { triggers: ["lowball", "too low", "insult", "that's nothing"], label: "Your offer is too low", severity: "high",
        rebuttal: "I hear you — my number reflects as-is, cash, and you pick the date with zero fees or repairs. If retail and the wait works better for you, that's totally valid. Want me to walk you through how I got there?" },
      { triggers: ["not selling", "just curious", "what's it worth"], label: "Not really selling", severity: "med",
        rebuttal: "No pressure at all — a lot of folks just want to know their options. Want a quick as-is number so you have it in your back pocket?" },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Motivation", "Condition", "Asking vs offer range", "Timeline", "Next step"],
  }),
  builtIn({
    id: "sphere", name: "Sphere / Past Clients", icon: "users", category: "real-estate",
    systemPrompt:
      "Copilot for reconnecting with PAST CLIENTS / sphere of influence. Goal: genuine reconnect, add value, and ask for " +
      "referrals naturally. Warm, personal, zero pressure.",
    scriptSkeleton: [
      { stage: "intro", cue: "Personal reconnect — reference their home/family/last deal." },
      { stage: "discovery", cue: "How's the house? Any life changes (space, move, family)?" },
      { stage: "value", cue: "Offer a free equity update / market check." },
      { stage: "close", cue: "Soft referral ask: 'Who's the next person you know thinking of a move?'" },
    ],
    objections: COMMON_OBJECTIONS,
    summaryTemplate: ["Life update", "Equity interest?", "Referral captured?", "Next touch date", "Next step"],
  }),
  builtIn({
    id: "sdr", name: "B2B SDR Cold Call", icon: "phone", category: "sales",
    systemPrompt:
      "Copilot for a B2B SDR cold call. Pattern-interrupt opener, earn 30 seconds, light discovery, tie one relevant pain " +
      "to the product, book a meeting — not a pitch. Conversational lines only.",
    scriptSkeleton: [
      { stage: "intro", cue: "Permission opener: 'I know I caught you off guard — can I have 27 seconds?'" },
      { stage: "discovery", cue: "One sharp problem question tied to their role." },
      { stage: "value", cue: "One-sentence relevant outcome, not a feature dump." },
      { stage: "close", cue: "Ask for 15 min next week. Offer two slots." },
    ],
    objections: [
      { triggers: ["no budget", "can't afford", "too expensive", "budget is frozen"], label: "No budget", severity: "high",
        rebuttal: "Totally get it — I'm not asking you to buy anything. If it doesn't pay for itself we shouldn't talk. Worth 15 minutes to see if the math works?" },
      { triggers: ["happy with", "already use", "we use", "have a solution"], label: "Happy with current", severity: "med",
        rebuttal: "Love that — most of our best customers said the same before they saw the one gap. If there isn't one, you've lost 15 minutes. Fair trade?" },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Pain identified", "Decision maker?", "Objections", "Meeting booked?", "Next step"],
  }),
  builtIn({
    id: "discovery", name: "Discovery Call", icon: "search", category: "sales",
    systemPrompt:
      "Copilot for a B2B DISCOVERY call (prospect already agreed to talk). Goal: diagnose pain, quantify impact, find the " +
      "champion + decision process, and earn the next step. Ask > tell. Coach the rep to shut up and listen.",
    scriptSkeleton: [
      { stage: "intro", cue: "Set agenda + get permission. Confirm time available." },
      { stage: "discovery", cue: "Current state → problem → impact ($/time) → why now." },
      { stage: "value", cue: "Tie ONE capability to their stated pain. Don't demo everything." },
      { stage: "close", cue: "Define next step + who else needs to be in the room." },
    ],
    objections: [
      { triggers: ["not the decision maker", "have to ask", "talk to my boss", "not up to me"], label: "Not the decision maker", severity: "med",
        rebuttal: "Makes sense — who else would weigh in? Let's get them in the next conversation so you're not stuck relaying it secondhand." },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Pain + impact", "Why now", "Decision process", "Champion", "Next step"],
  }),
  builtIn({
    id: "reactivation", name: "No-show / Reactivation", icon: "rotate-ccw", category: "sales",
    systemPrompt:
      "Copilot for reactivating a NO-SHOW or cold/ghosted lead. Goal: low-friction re-engage without guilt-tripping, " +
      "re-establish the value, and re-book. Light, human, assume good intent.",
    scriptSkeleton: [
      { stage: "intro", cue: "No guilt: 'Life happens — figured I'd catch you live instead of another email.'" },
      { stage: "discovery", cue: "Re-confirm the original pain is still real / still a priority." },
      { stage: "value", cue: "Remind them of the specific outcome they were after." },
      { stage: "close", cue: "Re-book with a concrete two-slot offer." },
    ],
    objections: [
      { triggers: ["forgot", "got busy", "slipped", "meant to"], label: "Forgot / got busy", severity: "low",
        rebuttal: "Totally understandable, no worries at all. Let's just grab 15 minutes when it's calmer — does tomorrow or Thursday work better?" },
      ...COMMON_OBJECTIONS,
    ],
    summaryTemplate: ["Still a priority?", "Original pain", "Re-booked?", "Best channel/time", "Next step"],
  }),
];

// ── Registry helpers (built-in + custom merge, fast resolution) ─────────────────
const byId = new Map(MODES.map((m) => [m.id, m]));

export const getMode = (id: string): ProspectingMode => byId.get(id) ?? MODES[0];

/** Merge user-created custom modes over built-ins (custom can override by id). */
export function mergeModes(custom: ProspectingMode[] = []): Map<string, ProspectingMode> {
  const map = new Map(byId);
  for (const m of custom) map.set(m.id, { ...m, builtIn: false });
  return map;
}

/** Precompiled trigger index: O(tokens) matching regardless of library size. */
export function buildObjectionIndex(mode: ProspectingMode) {
  const index: { trigger: string; obj: ObjectionRebuttal }[] = [];
  for (const obj of mode.objections) for (const t of obj.triggers) index.push({ trigger: t, obj });
  // longest triggers first so the most specific phrase wins
  index.sort((a, b) => b.trigger.length - a.trigger.length);
  return {
    match(text: string): ObjectionRebuttal | null {
      const t = text.toLowerCase();
      for (const e of index) if (t.includes(e.trigger)) return e.obj;
      return null;
    },
  };
}
