import { create } from "zustand";

/** The product is a SESSION of calls, not a set of screens.
 *  signin → book → connect → home ⇄ (armed → live → wrap) → home
 *  `floor` is manager-only and only reachable when the org actually has a team. */
export type Screen = "signin" | "book" | "connect" | "home" | "call" | "floor";

/** Where the rail is within one call. Armed = mic open, waiting for the dialer to connect. */
export type CallPhase = "armed" | "live" | "wrap";

export interface Card { id: string; kind: "objection" | "script" | "coach" | "answer" | "signal" | "coach2"; title: string; body: string; urgency: "now" | "soon" | "fyi"; stats?: { books: number; used: number } }
export interface Line { speaker: "rep" | "prospect"; text: string; ts: number }
export interface Lead { id: string; name: string; address: string; detail: string; phone: string; attempt: number }
export type Disposition = "booked" | "callback" | "dnc";

interface State {
  screen: Screen;
  phase: CallPhase;
  modeId: string;
  hasTeam: boolean;              // gates Floor — a solo rep never sees invented teammates
  queue: Lead[];                 // the spine: you always know who's next
  index: number;
  session: { dials: number; booked: number; startedAt: number } | null;
  talkRatio: number;
  cards: Card[];
  transcript: Line[];
  blocked?: string;
  lastDisposition?: Disposition;

  go: (s: Screen) => void;
  setMode: (id: string) => void;
  setHasTeam: (v: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  armCall: () => void;
  goLive: () => void;
  finishCall: (d: Disposition) => void;
  nextLead: () => void;
  pushCard: (c: Card) => void;
  pushLine: (l: Line) => void;
  setTalk: (r: number) => void;
  setBlocked: (b?: string) => void;
}

const QUEUE: Lead[] = [
  { id: "l1", name: "Marcus Reyes", address: "88 Larkin St", detail: "expired 6 days · $890k · agent: none", phone: "+15550001234", attempt: 1 },
  { id: "l2", name: "Dana Whitfield", address: "412 Ash Grove", detail: "expired 19 days · was $615k · 2 price cuts", phone: "+15550001235", attempt: 2 },
  { id: "l3", name: "Priya Raman", address: "9 Cedar Ct", detail: "expired 3 days · $1.2m · relisted twice", phone: "+15550001236", attempt: 1 },
  { id: "l4", name: "Tom Barnett", address: "77 Vine St", detail: "expired 31 days · $445k", phone: "+15550001238", attempt: 1 },
];

export const useStore = create<State>((set, get) => ({
  screen: "signin",
  phase: "armed",
  modeId: "expired",
  hasTeam: false,
  queue: QUEUE,
  index: 0,
  session: null,
  talkRatio: 0,
  cards: [],
  transcript: [],

  go: (screen) => set({ screen }),
  setMode: (modeId) => set({ modeId }),
  setHasTeam: (hasTeam) => set({ hasTeam }),

  startSession: () => set({ session: { dials: 0, booked: 0, startedAt: Date.now() }, index: 0 }),
  endSession: () => set({ session: null, screen: "home", cards: [], transcript: [], phase: "armed" }),

  // A call begins ARMED: mic open, Parley waiting for the dialer to connect.
  armCall: () => set({ screen: "call", phase: "armed", cards: [], transcript: [], talkRatio: 0, blocked: undefined }),
  // First real speech flips it live — an honest trigger, not a button you press.
  goLive: () => { if (get().phase === "armed") set({ phase: "live" }); },

  finishCall: (d) => set((s) => ({
    phase: "wrap",
    lastDisposition: d,
    session: s.session ? { ...s.session, dials: s.session.dials + 1, booked: s.session.booked + (d === "booked" ? 1 : 0) } : s.session,
  })),

  nextLead: () => set((s) => {
    const next = s.index + 1;
    if (next >= s.queue.length) return { screen: "home", phase: "armed", cards: [], transcript: [] };
    return { index: next, phase: "armed", cards: [], transcript: [], talkRatio: 0, blocked: undefined };
  }),

  pushCard: (c) => set((s) => ({ cards: [c, ...s.cards].slice(0, 30) })),
  pushLine: (l) => set((s) => ({ transcript: [...s.transcript, l].slice(-100) })),
  setTalk: (talkRatio) => set({ talkRatio }),
  setBlocked: (blocked) => set({ blocked }),
}));
