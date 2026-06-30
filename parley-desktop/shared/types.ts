// Shared contracts between Electron client, renderer, and cloud gateway.

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

export type ServerEvent =
  | TranscriptEvent
  | CopilotCard
  | StageEvent
  | MetricsEvent
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
