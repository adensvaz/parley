// Shared contracts between Electron client, renderer, and cloud gateway.
import type { Affect, HeatTier, VoiceBehaviour } from "@parley/contracts";

export type Speaker = "rep" | "prospect";

/** Stages of a cold call — drives the script guide + coach. */
export type CallStage =
  | "dialing"
  | "intro"           // pattern interrupt / permission to continue
  | "discovery"       // surface motivation & situation
  | "value"           // pitch tailored to what you heard
  | "objection"       // handling resistance
  | "close"           // ask for the appointment / next step
  | "wrap";           // confirm next step, end

/** Audio frame sent client -> gateway (base64 LPCM16, 16kHz mono). */
export interface AudioFrame {
  type: "audio";
  speaker: Speaker;
  pcm16: string;      // base64
}

/** Control messages client -> gateway. */
export type ClientEvent =
  | { type: "start"; modeId: string; lead?: LeadContext }
  | { type: "stop" }
  | { type: "manualAsk"; text: string }
  | AudioFrame;

/** Live transcript token gateway -> client. */
export interface TranscriptEvent {
  type: "transcript";
  speaker: Speaker;
  text: string;
  isFinal: boolean;
  ts: number;
}

/** A piece of real-time guidance rendered as a card. */
export interface CopilotCard {
  type: "card";
  kind: "objection" | "script" | "coach" | "answer" | "signal";
  title: string;
  body: string;          // the line the rep should say, or coaching note
  urgency: "now" | "soon" | "fyi";
  stage?: CallStage;
  id: string;
  /** live bandit posterior for the chosen rebuttal — books% and times played */
  stats?: { books: number; used: number };
}

export interface StageEvent { type: "stage"; stage: CallStage }

export interface MetricsEvent {
  type: "metrics";
  talkRatioRep: number;   // 0..1 fraction of time rep is talking
  wordsPerMin: number;
  sentiment: "positive" | "neutral" | "cooling" | "hostile";
  longestMonologueSec: number;
}

export interface PostCallEvent {
  type: "postcall";
  summary: string;
  disposition: string;          // e.g. "Appointment set", "Callback", "Not interested", "DNC"
  nextStep: string;
  followUpDraft: { channel: "email" | "sms"; body: string };
}

/** Prospect emotion + running lead temperature, emitted as the copilot re-reads the room each turn. */
export interface AffectEvent {
  type: "affect";
  affect: Affect;               // fused acoustic + lexical emotion
  heat: number;                 // 0..100 lead temperature
  tier: HeatTier;               // cold | cool | warm | hot
  trend: "up" | "flat" | "down";
  drivers: string[];            // why it moved
}

/** Voice Behaviour Analysis (premium) — a rolling behavioural read of the call, and the final profile. */
export interface BehaviourEvent {
  type: "behaviour";
  behaviour: VoiceBehaviour;
  final?: boolean;              // true on the call-end profile that lands in the scorecard
}

export type ServerEvent =
  | TranscriptEvent
  | CopilotCard
  | StageEvent
  | MetricsEvent
  | AffectEvent
  | BehaviourEvent
  | PostCallEvent;

/** Lead pulled from CRM and shown in the context panel. */
export interface LeadContext {
  name: string;
  phone: string;
  address?: string;
  leadType?: string;            // "Expired", "FSBO", "Buyer", ...
  notes?: string;
  lastContact?: string;
  // light market context for real estate
  estValue?: number;
  daysOnMarket?: number;
}
