import { create } from "zustand";

export type Screen = "onboard" | "mode" | "call" | "post";
export interface Card { id: string; kind: "objection" | "script" | "coach" | "answer" | "signal" | "coach2"; title: string; body: string; urgency: "now" | "soon" | "fyi" }
export interface Line { speaker: "rep" | "prospect"; text: string; ts: number }
export interface Lead { name?: string; phone?: string; lead_type?: string; address?: string; status?: string }

interface State {
  screen: Screen;
  onboard: number;
  modeId: string;
  live: boolean;
  stage: string;
  talkRatio: number;      // rep fraction 0..1
  cards: Card[];
  transcript: Line[];
  lead?: Lead;
  blocked?: string;
  go: (s: Screen) => void;
  setOnboard: (n: number) => void;
  setMode: (id: string) => void;
  startLive: () => void;
  endLive: () => void;
  pushCard: (c: Card) => void;
  pushLine: (l: Line) => void;
  setStage: (s: string) => void;
  setTalk: (r: number) => void;
  setLead: (l?: Lead) => void;
  setBlocked: (b?: string) => void;
  reset: () => void;
}

export const useStore = create<State>((set) => ({
  screen: "onboard",
  onboard: 0,
  modeId: "expired",
  live: false,
  stage: "intro",
  talkRatio: 0.3,
  cards: [],
  transcript: [],
  go: (screen) => set({ screen }),
  setOnboard: (onboard) => set({ onboard }),
  setMode: (modeId) => set({ modeId }),
  startLive: () => set({ live: true, cards: [], transcript: [], stage: "intro", lead: undefined, blocked: undefined }),
  endLive: () => set({ live: false }),
  pushCard: (c) => set((s) => ({ cards: [c, ...s.cards].slice(0, 30) })),
  pushLine: (l) => set((s) => ({ transcript: [...s.transcript, l].slice(-100) })),
  setStage: (stage) => set({ stage }),
  setTalk: (talkRatio) => set({ talkRatio }),
  setLead: (lead) => set({ lead }),
  setBlocked: (blocked) => set({ blocked }),
  reset: () => set({ live: false, cards: [], transcript: [], stage: "intro", talkRatio: 0.3, lead: undefined, blocked: undefined }),
}));
