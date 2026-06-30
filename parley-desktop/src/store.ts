import { create } from "zustand";
import type { CopilotCard, CallStage, LeadContext, PostCallEvent } from "../shared/types";

interface TranscriptLine { speaker: "rep" | "prospect"; text: string; ts: number }

interface ParleyState {
  live: boolean;
  modeId: string;
  stage: CallStage;
  discreet: boolean;
  talkRatioRep: number;
  sentiment: string;
  cards: CopilotCard[];
  transcript: TranscriptLine[];
  lead?: LeadContext;
  postcall?: PostCallEvent;
  setMode: (id: string) => void;
  start: () => void;
  stop: () => void;
  pushCard: (c: CopilotCard) => void;
  pushLine: (l: TranscriptLine) => void;
  setStage: (s: CallStage) => void;
  setMetrics: (talkRatioRep: number, sentiment: string) => void;
  setPostcall: (p: PostCallEvent) => void;
  setDiscreet: (on: boolean) => void;
}

export const useStore = create<ParleyState>((set) => ({
  live: false,
  modeId: "expired",
  stage: "intro",
  discreet: true,
  talkRatioRep: 0,
  sentiment: "neutral",
  cards: [],
  transcript: [],
  setMode: (id) => set({ modeId: id }),
  start: () => set({ live: true, cards: [], transcript: [], postcall: undefined, stage: "intro" }),
  stop: () => set({ live: false }),
  // newest card first, keep the latest "now"-urgency objection pinned at top
  pushCard: (c) => set((s) => ({ cards: [c, ...s.cards].slice(0, 30) })),
  pushLine: (l) => set((s) => ({ transcript: [...s.transcript, l].slice(-200) })),
  setStage: (stage) => set({ stage }),
  setMetrics: (talkRatioRep, sentiment) => set({ talkRatioRep, sentiment }),
  setPostcall: (postcall) => set({ postcall, live: false }),
  setDiscreet: (discreet) => set({ discreet }),
}));
